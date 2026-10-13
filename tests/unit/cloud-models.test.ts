import { describe, expect, it } from "vitest";
import {
  autoscalingModel,
  baseLoad,
  DEFAULT_AUTOSCALING_CONFIG,
  MAX_INSTANCES,
  MIN_INSTANCES,
  type AutoscalingConfig,
} from "@/lib/simulation/models/autoscaling";
import {
  ALARM_THRESHOLD,
  BUGGY_ERROR,
  DEPLOY_AT,
  deploymentModel,
  FLEET,
  type DeployConfig,
} from "@/lib/simulation/models/deployments";
import {
  FAILOVER_STEPS,
  plannedInstances,
  REPLACE_STEPS,
  REQUIRED,
  zonesModel,
  type ZonesAction,
  type ZonesConfig,
} from "@/lib/simulation/models/zones";
import { runSimulation } from "@/lib/simulation/run";
import type { ScheduledAction } from "@/lib/simulation/types";

/**
 * The cloud lessons describe what these models do ("losing a zone costs a third of capacity for
 * five minutes", "canary analysis rolls back within two minutes"…). These tests pin the models to
 * those claims.
 */

const percent = (n: number) => Math.round(n * 100);

function zoneRun(config: ZonesConfig, actions: ScheduledAction<ZonesAction>[], ticks = 30) {
  return runSimulation(zonesModel, { params: config, seed: 1, ticks, actions });
}
const zoneErrors = (frames: ReturnType<typeof zoneRun>) =>
  frames.slice(1).map((f) => percent(f.state.metrics!.errorRate));

describe("regions and availability zones", () => {
  const failZone = (zone: string): ScheduledAction<ZonesAction> => ({
    tick: 10,
    action: { type: "fail-zone", zone },
  });

  it("sizes each layout as described", () => {
    expect(REQUIRED).toBe(6);
    expect(plannedInstances({ layout: "multi-zone", headroom: "lean", autoRecover: true })).toEqual(
      [6],
    );
    expect(
      plannedInstances({ layout: "multi-zone", headroom: "survive-failure", autoRecover: true }),
    ).toEqual([9]);
    expect(
      plannedInstances({ layout: "multi-region", headroom: "lean", autoRecover: true }),
    ).toEqual([3, 3]);
    expect(
      plannedInstances({ layout: "multi-region", headroom: "survive-failure", autoRecover: true }),
    ).toEqual([6, 6]);
  });

  it("a single zone's failure takes the whole application down, headroom or not", () => {
    for (const headroom of ["lean", "survive-failure"] as const) {
      const errors = zoneErrors(
        zoneRun({ layout: "single-zone", headroom, autoRecover: true }, [failZone("a1")]),
      );
      expect(
        errors.slice(10).every((e) => e === 100),
        headroom,
      ).toBe(true);
    }
  });

  it("three lean zones lose a third of capacity until replacements are ready", () => {
    const errors = zoneErrors(
      zoneRun({ layout: "multi-zone", headroom: "lean", autoRecover: true }, [failZone("a2")]),
    );
    expect(errors.slice(0, 9).every((e) => e === 0)).toBe(true);
    expect(errors.slice(9, 9 + REPLACE_STEPS)).toEqual(Array(REPLACE_STEPS).fill(33));
    expect(errors.slice(9 + REPLACE_STEPS).every((e) => e === 0)).toBe(true);
  });

  it("static stability: 50% headroom across three zones survives a zone with no errors", () => {
    const frames = zoneRun(
      { layout: "multi-zone", headroom: "survive-failure", autoRecover: false },
      [failZone("a2")],
    );
    expect(zoneErrors(frames).every((e) => e === 0)).toBe(true);
  });

  it("without the control plane, lean capacity can't be replaced", () => {
    const errors = zoneErrors(
      zoneRun({ layout: "multi-zone", headroom: "lean", autoRecover: true }, [
        { tick: 9, action: { type: "impair-control-plane" } },
        failZone("a2"),
      ]),
    );
    expect(errors.slice(9).every((e) => e === 33)).toBe(true);
  });

  it("a region failure costs its users until DNS moves them, longer without headroom", () => {
    const failRegion: ScheduledAction<ZonesAction> = {
      tick: 10,
      action: { type: "fail-region", region: "A" },
    };
    const stable = zoneErrors(
      zoneRun({ layout: "multi-region", headroom: "survive-failure", autoRecover: true }, [
        failRegion,
      ]),
    );
    expect(stable.slice(9, 9 + FAILOVER_STEPS)).toEqual(Array(FAILOVER_STEPS).fill(50));
    expect(stable.slice(9 + FAILOVER_STEPS).every((e) => e === 0)).toBe(true);

    const lean = zoneErrors(
      zoneRun({ layout: "multi-region", headroom: "lean", autoRecover: true }, [failRegion]),
    );
    const failing = lean.filter((e) => e > 0).length;
    expect(failing).toBe(FAILOVER_STEPS + REPLACE_STEPS);
  });

  it("scales replacement capacity back in once the zone recovers", () => {
    const frames = zoneRun({ layout: "multi-zone", headroom: "lean", autoRecover: true }, [
      failZone("a2"),
      { tick: 20, action: { type: "restore-zone", zone: "a2" } },
    ]);
    expect(frames.at(-1)!.state.metrics!.inService).toBe(REQUIRED);
  });
});

function deployRun(config: DeployConfig, ticks = 40) {
  const frames = runSimulation(deploymentModel, { params: config, seed: 1, ticks, actions: [] });
  return { frames, final: frames.at(-1)!.state };
}

describe("deployment strategies", () => {
  it("a good release completes with every strategy, and only all-at-once has downtime", () => {
    for (const strategy of ["all-at-once", "rolling", "blue-green", "canary"] as const) {
      const { frames, final } = deployRun({ strategy, buggy: false, autoRollback: true });
      expect(final.phase, strategy).toBe("complete");
      expect(final.v2Share, strategy).toBe(1);
      const downtime = frames.some((f) => f.state.metrics?.downtime);
      expect(downtime, strategy).toBe(strategy === "all-at-once");
    }
  });

  it("blue-green briefly runs two full fleets", () => {
    const { frames } = deployRun({ strategy: "blue-green", buggy: false, autoRollback: true });
    const peak = Math.max(...frames.map((f) => f.state.instances.v1 + f.state.instances.v2));
    expect(peak).toBe(FLEET * 2);
  });

  it("canary analysis catches a bug the aggregate alarm can't see at 5%", () => {
    // 5% of traffic failing 15% adds only ~0.75 points to the overall error rate: under the alarm.
    const overallAtFivePercent = 0.95 * 0.002 + 0.05 * BUGGY_ERROR;
    expect(overallAtFivePercent).toBeLessThan(ALARM_THRESHOLD);

    const { final } = deployRun({ strategy: "canary", buggy: true, autoRollback: true });
    expect(final.phase).toBe("rolled-back");
    expect(final.finishedAt).toBe(DEPLOY_AT + 1);
    expect(final.totals.peakErrorRate).toBeLessThan(0.01);
  });

  it("canary exposes the fewest users to the bug; automation beats manual detection", () => {
    const failed = (strategy: DeployConfig["strategy"], autoRollback: boolean) =>
      deployRun({ strategy, buggy: true, autoRollback }).final.totals.failed;
    const canary = failed("canary", true);
    for (const other of ["all-at-once", "rolling", "blue-green"] as const) {
      expect(canary, other).toBeLessThan(failed(other, true));
    }
    for (const strategy of ["all-at-once", "rolling", "blue-green", "canary"] as const) {
      expect(failed(strategy, true), strategy).toBeLessThan(failed(strategy, false));
    }
  });

  it("blue-green and canary roll back instantly; rolling rolls back batch by batch", () => {
    const rollbackSteps = (strategy: DeployConfig["strategy"]) => {
      const { frames } = deployRun({ strategy, buggy: true, autoRollback: true });
      const start = frames.find((f) =>
        f.events.some((e) => e.message.includes("rolling back")),
      )!.index;
      return frames.find((f) => f.state.phase === "rolled-back")!.index - start;
    };
    expect(rollbackSteps("blue-green")).toBe(0);
    expect(rollbackSteps("canary")).toBe(0);
    expect(rollbackSteps("rolling")).toBeGreaterThan(0);
  });
});

function scaleRun(config: Partial<AutoscalingConfig>, ticks = 120) {
  const frames = runSimulation(autoscalingModel, {
    params: { ...DEFAULT_AUTOSCALING_CONFIG, ...config },
    seed: 3,
    ticks,
    actions: [],
  });
  const t = frames.at(-1)!.state.totals;
  return { frames, errorRate: t.failed / t.requests, cost: t.instanceMinutes };
}

describe("autoscaling", () => {
  it("follows the ramp up and back down within its limits", () => {
    const { frames } = scaleRun({});
    const instances = frames.map((f) => f.state.inService);
    expect(Math.max(...instances)).toBeGreaterThan(20);
    expect(Math.max(...instances)).toBeLessThanOrEqual(MAX_INSTANCES);
    expect(Math.min(...instances)).toBeGreaterThanOrEqual(MIN_INSTANCES);
    expect(instances.at(-1)).toBeLessThan(10);
  });

  it("a higher target is cheaper but leaves less headroom for the climb", () => {
    const relaxed = scaleRun({ target: 0.6 });
    const tight = scaleRun({ target: 0.9 });
    expect(tight.cost).toBeLessThan(relaxed.cost);
    expect(tight.errorRate).toBeGreaterThan(relaxed.errorRate);
  });

  it("slower start-up means more requests fail while capacity catches up", () => {
    expect(scaleRun({ startup: 6 }).errorRate).toBeGreaterThan(scaleRun({ startup: 1 }).errorRate);
  });

  it("without a scale-in window, bursty traffic makes capacity chase its own tail", () => {
    const flapping = scaleRun({ pattern: "bursty", scaleInWindow: 0 }, 60);
    const stable = scaleRun({ pattern: "bursty", scaleInWindow: 5 }, 60);
    expect(flapping.errorRate).toBeGreaterThan(stable.errorRate * 3);
    const actions = (r: typeof flapping) => r.frames.at(-1)!.state.totals.scalingActions;
    expect(actions(flapping)).toBeGreaterThan(actions(stable) * 3);
  });

  it("is deterministic and shapes each pattern as documented", () => {
    expect(scaleRun({}).frames).toEqual(scaleRun({}).frames);
    expect(baseLoad("ramp", 0)).toBe(300);
    expect(baseLoad("ramp", 50)).toBe(1500);
    expect(baseLoad("spike", 25)).toBe(1800);
    expect(baseLoad("bursty", 10)).toBe(1200);
    expect(baseLoad("bursty", 13)).toBe(500);
  });

  it("a surge action adds load for a few minutes", () => {
    const frames = runSimulation(autoscalingModel, {
      params: DEFAULT_AUTOSCALING_CONFIG,
      seed: 3,
      ticks: 20,
      actions: [{ tick: 5, action: { type: "surge" } }],
    });
    expect(frames[5]!.state.metrics!.load).toBeGreaterThan(frames[4]!.state.metrics!.load + 600);
    // The surge has ended by minute 15: load is back to the ramp itself (±3% noise).
    expect(frames[15]!.state.metrics!.load).toBeLessThan(baseLoad("ramp", 15) * 1.05);
  });
});

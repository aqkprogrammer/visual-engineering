import { describe, expect, it } from "vitest";
import {
  DEFAULT_LB_PARAMS,
  loadBalancerModel,
  outstanding,
  p95,
  recentErrors,
  type LbAction,
  type LbParams,
  type LbState,
} from "@/lib/simulation/models/load-balancer";
import { runSimulation } from "@/lib/simulation/run";
import type { ScheduledAction } from "@/lib/simulation/types";

const run = (
  params: Partial<LbParams> = {},
  actions: ScheduledAction<LbAction>[] = [],
  ticks = 400,
  seed = 7,
) =>
  runSimulation(loadBalancerModel, {
    params: { ...DEFAULT_LB_PARAMS, ...params },
    seed,
    ticks,
    actions,
  });

const last = (frames: { state: LbState }[]) => frames.at(-1)!.state;
const messages = (frames: { events: { message: string }[] }[]) =>
  frames.flatMap((f) => f.events.map((e) => e.message));

describe("load balancer model", () => {
  it("is deterministic", () => {
    expect(run()).toEqual(run());
  });

  it("round robin spreads requests evenly across healthy servers", () => {
    const routed = last(run({ heavyShare: 0 })).totals.routed;
    const counts = Object.values(routed);
    expect(counts).toHaveLength(3);
    expect(Math.max(...counts) - Math.min(...counts)).toBeLessThanOrEqual(1);
  });

  it("never exceeds a server's worker count and never routes to a server out of rotation", () => {
    const frames = run({ traffic: "overload" }, [
      { tick: 50, action: { type: "crash", server: "app-2" } },
    ]);
    for (const { state } of frames) {
      for (const server of state.servers) {
        expect(server.processing.length).toBeLessThanOrEqual(state.params.workersPerServer);
      }
    }
    // After removal, no request is routed to app-2 any more.
    const removedAt = frames.findIndex((f) =>
      f.events.some((e) => e.message.includes("app-2 failed 2 health checks")),
    );
    expect(removedAt).toBeGreaterThan(50);
    const routedAtRemoval = frames[removedAt]!.state.totals.routed["app-2"];
    expect(last(frames).totals.routed["app-2"]).toBe(routedAtRemoval);
  });

  it("removes a crashed server only after the configured number of failed checks", () => {
    const frames = run({}, [{ tick: 31, action: { type: "crash", server: "app-1" } }]);
    // Checks run every 6 ticks: 36 (1st failure) and 42 (2nd → removed).
    expect(frames[41]!.state.servers.find((s) => s.id === "app-1")!.inRotation).toBe(true);
    expect(frames[42]!.state.servers.find((s) => s.id === "app-1")!.inRotation).toBe(false);
    // Requests routed to it in the meantime fail.
    expect(frames.slice(31, 43).some((f) => (f.state.failedNow["app-1"] ?? 0) > 0)).toBe(true);
  });

  it("counts requests lost in a crash in the error metrics", () => {
    const frames = run({ traffic: "high" }, [
      { tick: 100, action: { type: "crash", server: "app-1" } },
    ]);
    const lost = frames[100]!.events.find((e) => e.message.startsWith("app-1 crashed"))!.message;
    const count = Number(lost.match(/(\d+) in-flight/)![1]);
    expect(count).toBeGreaterThan(0);
    expect(recentErrors(frames[100]!.state)).toBeGreaterThanOrEqual(count);
    expect(frames[100]!.state.failedNow["app-1"]).toBeGreaterThanOrEqual(count);
  });

  it("without health checks a crashed server keeps receiving traffic and errors never stop", () => {
    const frames = run({ healthChecks: false }, [
      { tick: 20, action: { type: "crash", server: "app-1" } },
    ]);
    const server = last(frames).servers.find((s) => s.id === "app-1")!;
    expect(server.inRotation).toBe(true);
    expect(frames.slice(-40).some((f) => (f.state.failedNow["app-1"] ?? 0) > 0)).toBe(true);
  });

  it("a restarted server rejoins after passing the healthy threshold", () => {
    const frames = run({}, [
      { tick: 20, action: { type: "crash", server: "app-3" } },
      { tick: 80, action: { type: "restart", server: "app-3" } },
    ]);
    const log = messages(frames);
    expect(log).toContain("app-3 restarted — waiting to pass health checks");
    expect(log).toContain("app-3 passed 2 health checks — back in rotation");
    expect(last(frames).servers.find((s) => s.id === "app-3")!.inRotation).toBe(true);
  });

  it("answers 503 when no server is in rotation", () => {
    const actions = ["app-1", "app-2", "app-3"].map((server) => ({
      tick: 10,
      action: { type: "crash", server } as const,
    }));
    const frames = run({}, actions);
    expect(messages(frames).some((m) => m.includes("503"))).toBe(true);
  });

  it("drains a removed server before dropping it", () => {
    const frames = run({ traffic: "high" }, [{ tick: 60, action: { type: "remove-server" } }]);
    const draining = frames[60]!.state.servers.find((s) => s.id === "app-3")!;
    expect(draining.draining).toBe(true);
    expect(outstanding(frames[60]!.state, draining)).toBeGreaterThan(0);
    expect(last(frames).servers.map((s) => s.id)).toEqual(["app-1", "app-2"]);
    expect(messages(frames)).toContain("app-3 finished draining and was removed");
    expect(last(frames).totals.failed).toBe(0);
  });

  it("adds servers that join rotation after a health check", () => {
    const frames = run({}, [{ tick: 10, action: { type: "add-server" } }]);
    const added = (i: number) => frames[i]!.state.servers.find((s) => s.id === "app-4");
    expect(added(10)!.inRotation).toBe(false);
    expect(last(frames).servers.find((s) => s.id === "app-4")!.inRotation).toBe(true);
  });

  it("least connections beats round robin on tail latency when request costs vary", () => {
    // Same traffic and seed; compare p95 averaged over the run.
    const avgP95 = (algorithm: LbParams["algorithm"]) => {
      const values = run({ algorithm, traffic: "high", heavyShare: 0.2 }, [], 600)
        .slice(100)
        .map((f) => p95(f.state) ?? 0);
      return values.reduce((a, b) => a + b, 0) / values.length;
    };
    expect(avgP95("least-connections")).toBeLessThan(avgP95("round-robin"));
  });

  it("records config changes as events", () => {
    const frames = run({}, [
      { tick: 5, action: { type: "configure", config: { algorithm: "least-connections" } } },
      { tick: 6, action: { type: "configure", config: { healthChecks: false } } },
    ]);
    expect(frames[5]!.state.config.algorithm).toBe("least-connections");
    expect(messages(frames)).toEqual(
      expect.arrayContaining(["Algorithm switched to least-connections", "Health checks disabled"]),
    );
  });

  it("describes each frame in plain language", () => {
    expect(run({}, [], 5)[0]!.caption).toBe(
      "0.00 s · 3 of 3 servers in rotation · no completed requests yet · no errors in the last second",
    );
  });
});

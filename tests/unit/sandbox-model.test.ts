import { describe, expect, it } from "vitest";
import {
  CHALLENGES,
  FREE_PLAY_ID,
  evaluate,
  getChallenge,
  type Challenge,
} from "@/lib/sandbox/challenges";
import {
  DEFAULT_ARCHITECTURE,
  HIT_RATIOS,
  MAX_QUEUEING_FACTOR,
  WARMUP_TICKS,
  computeStep,
  costUnits,
  queueingFactor,
  sandboxModel,
  type Architecture,
  type SandboxState,
  type TrafficProfile,
} from "@/lib/simulation/models/sandbox";
import { createRng } from "@/lib/simulation/rng";
import { runSimulation } from "@/lib/simulation/run";

const traffic = (base: number, readShare = 0.9): TrafficProfile => ({
  base,
  readShare,
  spikes: [],
});

function stateFor(architecture: Partial<Architecture>, t: TrafficProfile): SandboxState {
  return sandboxModel.init(
    { architecture: { ...DEFAULT_ARCHITECTURE, ...architecture }, traffic: t },
    createRng(1),
  );
}

const step = (architecture: Partial<Architecture>, t: TrafficProfile, at = 1) =>
  computeStep(stateFor(architecture, t), at).metrics;

describe("sandbox building blocks", () => {
  it("slows components sharply as they fill up", () => {
    expect(queueingFactor(0)).toBe(1);
    expect(queueingFactor(0.5)).toBe(2);
    expect(queueingFactor(0.8)).toBeCloseTo(5);
    expect(queueingFactor(1)).toBe(MAX_QUEUEING_FACTOR);
    expect(queueingFactor(Infinity)).toBe(MAX_QUEUEING_FACTOR);
  });

  it("prices designs in illustrative units", () => {
    expect(costUnits(DEFAULT_ARCHITECTURE)).toBe(3);
    expect(
      costUnits({
        appServers: 5,
        cache: true,
        cacheHitRatio: 0.8,
        readReplicas: 1,
        asyncWrites: true,
        workers: 4,
      }),
    ).toBe(10.5);
  });
});

describe("request flow", () => {
  it("rejects traffic beyond app server capacity", () => {
    const m = step({ appServers: 2 }, traffic(1500));
    expect(m.appCapacity).toBe(1000);
    expect(m.appRejected).toBe(500);
    expect(m.utilisation.app).toBe(1.5);
    expect(m.errorRate).toBeCloseTo(1 / 3);
  });

  it("sends reads to replicas when there are any, and writes to the primary", () => {
    const m = step({ appServers: 4, readReplicas: 2 }, traffic(1000));
    expect(m.replicaLoad).toBe(900);
    expect(m.replicaCapacity).toBe(2000);
    expect(m.primaryLoad).toBe(100);
  });

  it("splits a primary overload between reads and writes in proportion", () => {
    const m = step({ appServers: 4 }, traffic(1500, 0.6));
    // 900 reads + 600 writes against 1,000: 500 fail, 3:2.
    expect(m.readsFailed).toBeCloseTo(300);
    expect(m.writesFailed).toBeCloseTo(200);
  });

  it("removes cache hits from the database load", () => {
    const m = step({ appServers: 4, cache: true, cacheHitRatio: 0.8 }, traffic(1000));
    expect(m.cacheHits).toBeCloseTo(720);
    expect(m.primaryLoad).toBeCloseTo(180 + 100);
  });

  it("queues writes and drains them no faster than the workers and the primary allow", () => {
    const s = stateFor(
      { appServers: 4, readReplicas: 1, asyncWrites: true, workers: 2 },
      traffic(1000, 0.4),
    );
    const first = computeStep(s, 1);
    expect(first.metrics.enqueued).toBe(600);
    expect(first.metrics.drained).toBe(400);
    expect(first.backlog).toBe(200);
    expect(first.metrics.backlogSeconds).toBeCloseTo(0.5);
    expect(first.metrics.writesFailed).toBe(0);
  });

  it("warms a flushed cache back up over the warm-up period", () => {
    const s = {
      ...stateFor({ appServers: 4, cache: true, cacheHitRatio: 0.8 }, traffic(1000)),
      cacheFlushedAt: 10,
    };
    expect(computeStep(s, 10).metrics.hitRatio).toBe(0);
    expect(computeStep(s, 10 + WARMUP_TICKS / 2).metrics.hitRatio).toBeCloseTo(0.4);
    expect(computeStep(s, 10 + WARMUP_TICKS).metrics.hitRatio).toBeCloseTo(0.8);
  });

  it("halves database capacity when it is degraded", () => {
    const s = { ...stateFor({ appServers: 4 }, traffic(1000)), databaseDegraded: true };
    expect(computeStep(s, 1).metrics.primaryCapacity).toBe(500);
  });

  it("names the busiest component as the bottleneck, upstream first on a tie", () => {
    expect(step({ appServers: 2 }, traffic(1000)).bottleneck).toBe("app");
    expect(step({ appServers: 4 }, traffic(1200, 0.5)).bottleneck).toBe("primary");
    expect(
      step({ appServers: 10, cache: true, cacheHitRatio: 0.95 }, traffic(1000)).bottleneck,
    ).toBe(null);
  });

  it("is deterministic and reports a bottleneck once, not every second", () => {
    const run = () =>
      runSimulation(sandboxModel, {
        params: { architecture: DEFAULT_ARCHITECTURE, traffic: traffic(1500) },
        seed: 1,
        ticks: 20,
        actions: [],
      });
    expect(run()).toEqual(run());
    const messages = run().flatMap((f) => f.events.map((e) => e.message));
    expect(messages.filter((m) => m.startsWith("App servers are the bottleneck"))).toHaveLength(1);
  });

  it("applies failure actions", () => {
    const frames = runSimulation(sandboxModel, {
      params: { architecture: { ...DEFAULT_ARCHITECTURE, appServers: 3 }, traffic: traffic(500) },
      seed: 1,
      ticks: 6,
      actions: [
        { tick: 2, action: { type: "fail-server" } },
        { tick: 4, action: { type: "restore-servers" } },
      ],
    });
    expect(frames[3]?.state.metrics?.appCapacity).toBe(1000);
    expect(frames[5]?.state.metrics?.appCapacity).toBe(1500);
  });
});

/** Every design the controls allow. */
function allDesigns(): Architecture[] {
  const designs: Architecture[] = [];
  for (let appServers = 1; appServers <= 10; appServers++)
    for (const hit of [null, ...HIT_RATIOS])
      for (let readReplicas = 0; readReplicas <= 3; readReplicas++)
        for (const workers of [0, 1, 2, 3, 4, 5, 6])
          designs.push({
            appServers,
            cache: hit !== null,
            cacheHitRatio: hit ?? 0.8,
            readReplicas,
            asyncWrites: workers > 0,
            workers: workers || 2,
          });
  return designs;
}

const passes = (c: Challenge, a: Architecture) =>
  evaluate(
    runSimulation(sandboxModel, {
      params: { architecture: a, traffic: c.traffic },
      seed: 1,
      ticks: c.ticks,
      actions: c.script,
    }),
    a,
    c.goals!,
  ).every((r) => r.passed);

/** A known answer per challenge, documented here so a model change that breaks it is caught. */
const SOLUTIONS: Record<string, Partial<Architecture>> = {
  "launch-day": { appServers: 7, cache: true, cacheHitRatio: 0.95 },
  "read-heavy-catalogue": { appServers: 10, cache: true, cacheHitRatio: 0.95 },
  "checkout-surge": { appServers: 5, readReplicas: 1, asyncWrites: true, workers: 5 },
  "cold-cache": { appServers: 6, cache: true, cacheHitRatio: 0.95, readReplicas: 2 },
};

// Brute-force searches over every design run ~1,000 simulations; allow for slow CI machines.
describe("challenges", { timeout: 60_000 }, () => {
  const designs = allDesigns();
  const graded = CHALLENGES.filter((c) => c.goals);

  it("has free play plus four graded challenges with unique ids", () => {
    expect(getChallenge(FREE_PLAY_ID).goals).toBeNull();
    expect(graded).toHaveLength(4);
    expect(new Set(CHALLENGES.map((c) => c.id)).size).toBe(CHALLENGES.length);
    expect(getChallenge("nonsense").id).toBe(FREE_PLAY_ID);
  });

  it.each(graded.map((c) => [c.id, c] as const))("%s: the starting design fails", (_, c) => {
    expect(passes(c, c.start)).toBe(false);
  });

  it.each(graded.map((c) => [c.id, c] as const))("%s: the documented solution passes", (_, c) => {
    expect(passes(c, { ...DEFAULT_ARCHITECTURE, ...SOLUTIONS[c.id] })).toBe(true);
  });

  it("checkout surge can only be met with a write queue, as its hint says", () => {
    const c = getChallenge("checkout-surge");
    const passing = designs.filter((a) => passes(c, a));
    expect(passing.length).toBeGreaterThan(0);
    expect(passing.every((a) => a.asyncWrites)).toBe(true);
  });

  it("read-heavy catalogue can't be met with read replicas alone", () => {
    const c = getChallenge("read-heavy-catalogue");
    expect(designs.filter((a) => !a.cache && passes(c, a))).toEqual([]);
  });

  it("reports goals in words, with the worst second", () => {
    const c = getChallenge("launch-day");
    const frames = runSimulation(sandboxModel, {
      params: { architecture: c.start, traffic: c.traffic },
      seed: 1,
      ticks: c.ticks,
      actions: [],
    });
    const results = evaluate(frames, c.start, c.goals!);
    expect(results.map((r) => r.label)).toEqual([
      "Error rate at most 1.0% every second",
      "Latency at most 150 ms every second",
      "Cost at most 10 units",
    ]);
    expect(results[0]?.detail).toMatch(/^Worst: \d+% at \d+ s$/);
    expect(results[2]).toEqual({
      label: "Cost at most 10 units",
      passed: true,
      detail: "This design: 3 units",
    });
  });
});

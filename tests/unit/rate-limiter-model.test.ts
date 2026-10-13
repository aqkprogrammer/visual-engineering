import { describe, expect, it } from "vitest";
import {
  DEFAULT_LIMITER_CONFIG,
  rateLimiterModel,
  type Algorithm,
  type LimiterConfig,
} from "@/lib/simulation/models/rate-limiter";
import { runSimulation } from "@/lib/simulation/run";

const run = (config: Partial<LimiterConfig>, ticks = 200) =>
  runSimulation(rateLimiterModel, {
    params: { ...DEFAULT_LIMITER_CONFIG, ...config },
    seed: 3,
    ticks,
  });
const end = (config: Partial<LimiterConfig>) => run(config).at(-1)!.state;
const ALL: Algorithm[] = ["token-bucket", "fixed-window", "sliding-log", "sliding-counter"];

describe("rate limiter model", () => {
  it("is deterministic", () => {
    expect(run({ pattern: "steady-over" })).toEqual(run({ pattern: "steady-over" }));
  });

  it("rejects nothing when traffic stays under the limit", () => {
    for (const algorithm of ALL)
      expect(end({ algorithm, pattern: "under-limit" }).totals.rejected, algorithm).toBe(0);
  });

  it("holds the long-run rate near the limit when traffic is steadily over it", () => {
    for (const algorithm of ALL) {
      const state = end({ algorithm, pattern: "steady-over" });
      const perSecond = state.totals.accepted / (state.tick / 10);
      expect(perSecond, algorithm).toBeLessThanOrEqual(10.6);
      expect(perSecond, algorithm).toBeGreaterThan(8.5);
    }
  });

  it("a fixed window lets twice the limit through across a window boundary", () => {
    expect(end({ algorithm: "fixed-window", pattern: "boundary" }).peakPerSecond).toBe(20);
  });

  it("a sliding window log never accepts more than the limit in any second", () => {
    for (const pattern of ["boundary", "bursty", "steady-over"] as const) {
      expect(end({ algorithm: "sliding-log", pattern }).peakPerSecond, pattern).toBeLessThanOrEqual(
        10,
      );
    }
  });

  it("the sliding window counter stays far closer to the limit than a fixed window at boundaries", () => {
    expect(end({ algorithm: "sliding-counter", pattern: "boundary" }).peakPerSecond).toBeLessThan(
      15,
    );
  });

  it("a token bucket absorbs a burst up to its capacity, then rate-limits", () => {
    const frames = run({ algorithm: "token-bucket", pattern: "bursty" }, 6);
    // First burst at tick 4: 10 arrive with a full bucket of 10.
    expect(frames[4]!.state.timeline.at(-1)).toMatchObject({ accepted: 10, rejected: 0 });
    // The second burst tick finds the bucket nearly empty.
    expect(frames[5]!.state.timeline.at(-1)!.rejected).toBeGreaterThan(0);
  });

  it("switching algorithm starts it from a clean state", () => {
    const frames = runSimulation(rateLimiterModel, {
      params: { ...DEFAULT_LIMITER_CONFIG, algorithm: "fixed-window" },
      seed: 1,
      ticks: 30,
      actions: [{ tick: 15, action: { type: "configure", config: { algorithm: "sliding-log" } } }],
    });
    expect(frames[15]!.events.map((e) => e.message)).toContain("Algorithm: sliding window log");
    expect(frames[15]!.state.timeline).toHaveLength(1);
    expect(frames[15]!.state.peakPerSecond).toBeLessThanOrEqual(10);
  });
});

import { describe, expect, it } from "vitest";
import {
  ARRIVALS_PER_STEP,
  CAPACITY_PER_STEP,
  DEFAULT_RETRIES_CONFIG,
  retriesModel,
  type RetriesConfig,
} from "@/lib/simulation/models/retries";
import { runSimulation } from "@/lib/simulation/run";

const SLOW_AT = 50;
const RECOVERED_AT = 101; // capacity is back from here

const run = (config: Partial<RetriesConfig> = {}, slow = true) =>
  runSimulation(retriesModel, {
    params: { ...DEFAULT_RETRIES_CONFIG, ...config },
    seed: 1,
    ticks: 300,
    actions: slow ? [{ tick: SLOW_AT, action: { type: "slow-dependency" } }] : [],
  });
type Frames = ReturnType<typeof run>;
const successRate = (frames: Frames, from: number, to: number) => {
  let ok = 0;
  let bad = 0;
  for (const f of frames.slice(from, to)) {
    ok += f.state.metrics?.succeeded ?? 0;
    bad += f.state.metrics?.failed ?? 0;
  }
  return ok / (ok + bad);
};
const sentPerSecond = (frames: Frames, at: number) => frames[at]!.state.metrics!.sent * 10;
/** First step after the slowdown from which nothing fails and nothing is queued. */
const recoveredBy = (frames: Frames) =>
  frames.findIndex(
    (f, i) => i > RECOVERED_AT && f.state.metrics!.failed < 0.01 && f.state.metrics!.queue < 1,
  );

describe("retries model", () => {
  it("serves everything when nothing goes wrong", () => {
    const frames = run({}, false);
    expect(successRate(frames, 1, 300)).toBe(1);
    expect(sentPerSecond(frames, 200)).toBe(ARRIVALS_PER_STEP * 10);
    expect(frames.at(-1)!.state.totals.wasted).toBe(0);
  });

  // The demo's "things to try", in order.
  it("immediate retries: load reaches 400/s and never comes back down", () => {
    const frames = run();
    expect(sentPerSecond(frames, 200)).toBeCloseTo(400, 0);
    expect(sentPerSecond(frames, 200)).toBeGreaterThan(CAPACITY_PER_STEP * 10);
    expect(successRate(frames, 150, 300)).toBe(0);
    expect(recoveredBy(frames)).toBe(-1);
  });

  it("no retries: errors stop within seconds of the dependency recovering", () => {
    const at = recoveredBy(run({ retries: "none" }));
    expect(at).toBeGreaterThan(RECOVERED_AT);
    expect(at - RECOVERED_AT).toBeLessThan(60);
  });

  it("backoff with jitter: still never recovers", () => {
    const frames = run({ retries: "backoff" });
    expect(recoveredBy(frames)).toBe(-1);
    expect(successRate(frames, 200, 300)).toBe(0);
  });

  it("a retry budget or a circuit breaker lets the dependency recover", () => {
    for (const config of [{ retries: "budget" as const }, { breaker: true }]) {
      const frames = run(config);
      expect(recoveredBy(frames)).toBeGreaterThan(0);
      expect(successRate(frames, 250, 300)).toBe(1);
    }
  });

  it("a 3 s timeout: nothing fails, but answers take up to about 2.6 s", () => {
    for (const retries of ["none", "immediate", "backoff", "budget"] as const) {
      const frames = run({ retries, timeout: "long" });
      expect(successRate(frames, 1, 300)).toBe(1);
      const worst = Math.max(...frames.map((f) => f.state.metrics?.latencyMs ?? 0));
      expect(worst).toBeGreaterThan(2400);
      expect(worst).toBeLessThan(2800);
    }
  });

  it("the circuit breaker opens, half-opens and closes again", () => {
    const messages = run({ breaker: true }).flatMap((f) => f.events.map((e) => e.message));
    const open = messages.findIndex((m) => m.startsWith("Circuit breaker opened"));
    const half = messages.findIndex((m) => m.startsWith("Circuit breaker half-open"));
    const closed = messages.findIndex((m) => m.startsWith("Trial calls succeeded"));
    expect(open).toBeGreaterThan(-1);
    expect(half).toBeGreaterThan(open);
    expect(closed).toBeGreaterThan(half);
  });

  it("never sends more than four attempts per request", () => {
    for (const retries of ["immediate", "backoff", "budget"] as const) {
      const t = run({ retries }).at(-1)!.state.totals;
      expect(t.sent).toBeLessThanOrEqual(t.requests * 4 + 1e-6);
    }
  });
});

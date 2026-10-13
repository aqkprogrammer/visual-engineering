/**
 * Teaching model of a single client's requests passing through a rate limiter.
 *
 * Simplifications (shown to learners):
 * - One tick is 100 ms; the limit is expressed per second (10 ticks).
 * - One client and one limiter instance — no distributed counters, clock skew or network delay.
 * - Rejected requests are dropped (HTTP 429); the client never retries.
 * - Token bucket: capacity equals the per-second limit, refilled continuously.
 * - Sliding window counter: Cloudflare's approximation, which assumes the previous window's
 *   requests were spread evenly.
 */
import type { Rng } from "../rng";
import type { SimEvent, SimulationModel, StepResult } from "../types";

export const TICK_MS = 100;
export const WINDOW_TICKS = 10; // one second
export const TIMELINE_TICKS = 60;

export type Algorithm = "token-bucket" | "fixed-window" | "sliding-log" | "sliding-counter";
export type Pattern = "under-limit" | "steady-over" | "bursty" | "boundary";

export type LimiterConfig = { algorithm: Algorithm; pattern: Pattern; limit: number };
export const DEFAULT_LIMITER_CONFIG: LimiterConfig = {
  algorithm: "token-bucket",
  pattern: "bursty",
  limit: 10,
};

export type LimiterState = {
  tick: number;
  config: LimiterConfig;
  /** Token bucket. */
  tokens: number;
  /** Fixed window and sliding window counter. */
  windowCount: number;
  previousWindowCount: number;
  /** Sliding log: ticks of accepted requests in the last second. */
  log: number[];
  /** Per-tick results for the visible timeline. */
  timeline: { at: number; accepted: number; rejected: number }[];
  totals: { accepted: number; rejected: number };
  /** Most requests accepted in any rolling one-second span so far. */
  peakPerSecond: number;
  warnedAt: number | null;
};

export type LimiterAction = { type: "configure"; config: Partial<LimiterConfig> };

const clone = <T>(value: T): T => structuredClone(value);

function arrivals(s: LimiterState, rng: Rng): number {
  const fractional = (rate: number) =>
    Math.floor(rate) + (rng.chance(rate - Math.floor(rate)) ? 1 : 0);
  const phase = s.tick % 20;
  switch (s.config.pattern) {
    case "under-limit":
      return fractional((s.config.limit * 0.6) / WINDOW_TICKS);
    case "steady-over":
      return fractional((s.config.limit * 1.5) / WINDOW_TICKS);
    case "bursty":
      // Mostly quiet, then a burst of about twice the limit in 200 ms.
      return phase === 4 || phase === 5 ? s.config.limit : fractional(0.3);
    case "boundary":
      // Two limit-sized bursts straddling a window boundary (ticks 8–11 of every 20).
      return phase >= 8 && phase <= 11 ? Math.ceil(s.config.limit / 2) : 0;
  }
}

/** Requests accepted in the last second (rolling), including this tick. */
export function acceptedLastSecond(state: LimiterState): number {
  return state.timeline
    .filter((t) => t.at > state.tick - WINDOW_TICKS)
    .reduce((n, t) => n + t.accepted, 0);
}

/** Sliding window counter estimate, as Cloudflare describes it. */
export function slidingEstimate(state: LimiterState): number {
  const position = (state.tick % WINDOW_TICKS) / WINDOW_TICKS;
  return state.previousWindowCount * (1 - position) + state.windowCount;
}

function allow(s: LimiterState): boolean {
  const { limit, algorithm } = s.config;
  switch (algorithm) {
    case "token-bucket":
      if (s.tokens < 1) return false;
      s.tokens -= 1;
      return true;
    case "fixed-window":
      if (s.windowCount >= limit) return false;
      s.windowCount += 1;
      return true;
    case "sliding-log":
      if (s.log.length >= limit) return false;
      s.log.push(s.tick);
      return true;
    case "sliding-counter":
      if (slidingEstimate(s) + 1 > limit) return false;
      s.windowCount += 1;
      return true;
  }
}

function tick(state: LimiterState, rng: Rng): StepResult<LimiterState> {
  const s = clone(state);
  const events: SimEvent[] = [];
  s.tick += 1;
  const { limit } = s.config;

  // Housekeeping before deciding on this tick's requests.
  s.tokens = Math.min(limit, s.tokens + limit / WINDOW_TICKS);
  if (s.tick % WINDOW_TICKS === 0) {
    s.previousWindowCount = s.windowCount;
    s.windowCount = 0;
  }
  s.log = s.log.filter((t) => t > s.tick - WINDOW_TICKS);

  const incoming = arrivals(s, rng);
  let accepted = 0;
  for (let i = 0; i < incoming; i++) if (allow(s)) accepted += 1;
  const rejected = incoming - accepted;

  s.timeline.push({ at: s.tick, accepted, rejected });
  if (s.timeline.length > TIMELINE_TICKS) s.timeline = s.timeline.slice(-TIMELINE_TICKS);
  s.totals.accepted += accepted;
  s.totals.rejected += rejected;

  const lastSecond = acceptedLastSecond(s);
  s.peakPerSecond = Math.max(s.peakPerSecond, lastSecond);
  if (rejected > 0) {
    events.push({
      at: s.tick,
      tone: "warning",
      message: `${rejected} of ${incoming} requests rejected with 429 Too Many Requests`,
    });
  }
  if (lastSecond > limit && (s.warnedAt === null || s.tick - s.warnedAt >= WINDOW_TICKS)) {
    s.warnedAt = s.tick;
    events.push({
      at: s.tick,
      tone: "warning",
      message: `${lastSecond} requests accepted within one second — above the per-second limit of ${limit}`,
    });
  }
  return { state: s, events };
}

function apply(state: LimiterState, action: LimiterAction): StepResult<LimiterState> {
  const s = clone(state);
  const events: SimEvent[] = [];
  const at = s.tick + 1;
  const before = s.config;
  s.config = { ...s.config, ...action.config };
  if (before.algorithm !== s.config.algorithm) {
    // Each algorithm starts from a clean state so the comparison is fair.
    s.tokens = s.config.limit;
    s.windowCount = 0;
    s.previousWindowCount = 0;
    s.log = [];
    s.timeline = [];
    s.peakPerSecond = 0;
    s.warnedAt = null;
    events.push({ at, tone: "info", message: `Algorithm: ${LABELS[s.config.algorithm]}` });
  }
  if (before.pattern !== s.config.pattern)
    events.push({ at, tone: "info", message: `Traffic: ${s.config.pattern}` });
  if (before.limit !== s.config.limit) {
    s.tokens = Math.min(s.tokens, s.config.limit);
    events.push({ at, tone: "info", message: `Limit: ${s.config.limit} requests per second` });
  }
  return { state: s, events };
}

export const LABELS: Record<Algorithm, string> = {
  "token-bucket": "token bucket",
  "fixed-window": "fixed window",
  "sliding-log": "sliding window log",
  "sliding-counter": "sliding window counter",
};

export const rateLimiterModel: SimulationModel<LimiterState, LimiterConfig, LimiterAction> = {
  id: "rate-limiter",
  init(config) {
    return {
      tick: 0,
      config,
      tokens: config.limit,
      windowCount: 0,
      previousWindowCount: 0,
      log: [],
      timeline: [],
      totals: { accepted: 0, rejected: 0 },
      peakPerSecond: 0,
      warnedAt: null,
    };
  },
  tick,
  apply,
  describe(state) {
    const last = state.timeline.at(-1);
    const now = last
      ? `${last.accepted + last.rejected} arrived, ${last.accepted} accepted, ${last.rejected} rejected`
      : "no requests yet";
    return [
      `${((state.tick * TICK_MS) / 1000).toFixed(1)} s`,
      LABELS[state.config.algorithm],
      now,
      `${acceptedLastSecond(state)} accepted in the last second (limit ${state.config.limit})`,
    ].join(" · ");
  },
};

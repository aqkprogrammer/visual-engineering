/**
 * Monolith versus microservices: what happens to one user request as its work is split across
 * services that call each other over the network. Each one-second step sends a batch of requests
 * and records how many succeeded, how many were degraded, and how long they took.
 *
 * The rule the model makes visible: every remote call is an independent chance to fail or be slow,
 * so those chances compound with the number of calls. Modules in a monolith run in one process and
 * share its fate instead — including when one of them brings the whole process down.
 *
 * Illustrative numbers: 10 ms of work per component, 2 ms per network hop, a 1% chance of a slow
 * (400 ms) response and a 0.1% chance of failure per remote call, 100 ms timeouts.
 */
import type { Rng } from "../rng";
import type { SimEvent, SimulationModel, StepResult } from "../types";

export const REQUESTS_PER_STEP = 200;
export const WORK_MS = 10;
export const HOP_MS = 2;
export const SLOW_MS = 400;
export const SLOW_CHANCE = 0.01;
export const FAIL_CHANCE = 0.001;
export const DEGRADED_SLOW_CHANCE = 0.3;
export const TIMEOUT_MS = 100;
export const SLOW_THRESHOLD_MS = 300;
export const HISTORY_STEPS = 60;
/** Upper bounds (ms) of the latency histogram's buckets; the last one is open-ended. */
export const BUCKETS = [25, 50, 100, 200, 300, 500, Infinity] as const;

export type Architecture = "monolith" | "microservices";
export type Topology = "chain" | "fan-out";

export type ServiceCallsConfig = {
  architecture: Architecture;
  /** Components a request needs: modules in the monolith, services otherwise. */
  services: number;
  topology: Topology;
  /** A timeout on every remote call, and one retry after a failure or timeout. */
  timeouts: boolean;
  /** The last service (recommendations) is optional: if it fails, answer without it. */
  fallback: boolean;
};

export const DEFAULT_SERVICE_CALLS_CONFIG: ServiceCallsConfig = {
  architecture: "microservices",
  services: 5,
  topology: "chain",
  timeouts: false,
  fallback: false,
};

export type ServiceHealth = "healthy" | "slow" | "down";

export type ServiceCallsState = {
  tick: number;
  config: ServiceCallsConfig;
  /** Health of each component; the last one is the optional "recommendations" component. */
  health: ServiceHealth[];
  metrics: {
    succeeded: number;
    degraded: number;
    failed: number;
    p50: number;
    p99: number;
    slowShare: number;
    /** Remote calls made, including retries. */
    calls: number;
    /** Successful requests per latency bucket (see BUCKETS). */
    buckets: number[];
  } | null;
  history: { at: number; p99: number; successRate: number }[];
  totals: { requests: number; succeeded: number; degraded: number; failed: number; slow: number };
};

export type ServiceCallsAction =
  | { type: "slow-service"; index: number }
  | { type: "fail-service"; index: number }
  | { type: "restore-service"; index: number };

export const serviceName = (index: number, count: number, architecture: Architecture) => {
  const kind = architecture === "monolith" ? "module" : "service";
  return index === count - 1 ? `recommendations ${kind}` : `${kind} ${index + 1}`;
};

/** Probability a request avoids every independent per-call failure: 0.999 to the power of calls. */
export function expectedSuccess(config: ServiceCallsConfig): number {
  return config.architecture === "monolith"
    ? 1 - FAIL_CHANCE
    : (1 - FAIL_CHANCE) ** config.services;
}

type CallResult = { ms: number; ok: boolean };

/** One remote call to a service, including the timeout and retry if enabled. */
function remoteCall(
  health: ServiceHealth,
  timeouts: boolean,
  rng: Rng,
  counter: { calls: number },
): CallResult {
  const attempt = (): CallResult => {
    counter.calls += 1;
    if (health === "down") return { ms: HOP_MS, ok: false };
    const slowChance = health === "slow" ? DEGRADED_SLOW_CHANCE : SLOW_CHANCE;
    const ms = HOP_MS + (rng.chance(slowChance) ? SLOW_MS : WORK_MS);
    if (rng.chance(FAIL_CHANCE)) return { ms, ok: false };
    if (timeouts && ms > TIMEOUT_MS) return { ms: TIMEOUT_MS, ok: false };
    return { ms, ok: true };
  };
  const first = attempt();
  if (first.ok || !timeouts) return first;
  const second = attempt();
  return { ms: first.ms + second.ms, ok: second.ok };
}

type RequestResult = { ms: number; outcome: "ok" | "degraded" | "failed" };

function monolithRequest(state: ServiceCallsState, rng: Rng): RequestResult {
  const { health, config } = state;
  // Modules share one process: one module crashing takes the process down, and a slow module
  // or a pause (garbage collection, contention) slows the whole request.
  if (health.some((h) => h === "down")) return { ms: 0, outcome: "failed" };
  const slowModules = health.filter((h) => h === "slow").length;
  const work = config.topology === "chain" ? config.services * WORK_MS : 2 * WORK_MS;
  const slow = rng.chance(SLOW_CHANCE) || (slowModules > 0 && rng.chance(DEGRADED_SLOW_CHANCE));
  const ms = work + (slow ? SLOW_MS : 0);
  if (rng.chance(FAIL_CHANCE)) return { ms, outcome: "failed" };
  return { ms, outcome: "ok" };
}

function microservicesRequest(
  state: ServiceCallsState,
  rng: Rng,
  counter: { calls: number },
): RequestResult {
  const { health, config } = state;
  const optional = config.services - 1;
  const results = health.map((h) => remoteCall(h, config.timeouts, rng, counter));
  // Front-end work plus the calls: one after another, or all at once.
  const callMs =
    config.topology === "chain"
      ? results.reduce((sum, r) => sum + r.ms, 0)
      : Math.max(...results.map((r) => r.ms));
  const ms = WORK_MS + callMs;
  const required = results.filter((_, i) => i !== optional || !config.fallback);
  if (required.some((r) => !r.ok)) return { ms, outcome: "failed" };
  if (config.fallback && results[optional] && !results[optional].ok)
    return { ms, outcome: "degraded" };
  return { ms, outcome: "ok" };
}

const percentile = (sorted: number[], p: number) =>
  sorted.length === 0 ? 0 : sorted[Math.min(sorted.length - 1, Math.floor(p * sorted.length))]!;

function tick(state: ServiceCallsState, rng: Rng): StepResult<ServiceCallsState> {
  const at = state.tick + 1;
  const counter = { calls: 0 };
  const latencies: number[] = [];
  let succeeded = 0;
  let degraded = 0;
  let failed = 0;
  for (let i = 0; i < REQUESTS_PER_STEP; i++) {
    const r =
      state.config.architecture === "monolith"
        ? monolithRequest(state, rng)
        : microservicesRequest(state, rng, counter);
    if (r.outcome === "ok") succeeded++;
    else if (r.outcome === "degraded") degraded++;
    else failed++;
    if (r.outcome !== "failed") latencies.push(r.ms);
  }
  latencies.sort((a, b) => a - b);
  const slow = latencies.filter((ms) => ms > SLOW_THRESHOLD_MS).length;
  const metrics = {
    succeeded,
    degraded,
    failed,
    p50: percentile(latencies, 0.5),
    p99: percentile(latencies, 0.99),
    slowShare: REQUESTS_PER_STEP > 0 ? slow / REQUESTS_PER_STEP : 0,
    calls: counter.calls,
    buckets: BUCKETS.map(
      (upper, i) => latencies.filter((ms) => ms <= upper && ms > (BUCKETS[i - 1] ?? -1)).length,
    ),
  };
  const events: SimEvent[] = [];
  const successRate = (succeeded + degraded) / REQUESTS_PER_STEP;
  const before = state.metrics
    ? (state.metrics.succeeded + state.metrics.degraded) / REQUESTS_PER_STEP
    : 1;
  if (successRate < 0.9 && before >= 0.9) {
    events.push({
      at,
      tone: "error",
      message: `Only ${Math.round(successRate * 100)}% of requests succeeding`,
    });
  } else if (successRate >= 0.9 && before < 0.9) {
    events.push({ at, tone: "success", message: "Requests succeeding again" });
  }
  return {
    state: {
      ...state,
      tick: at,
      metrics,
      history: [...state.history, { at, p99: metrics.p99, successRate }].slice(-HISTORY_STEPS),
      totals: {
        requests: state.totals.requests + REQUESTS_PER_STEP,
        succeeded: state.totals.succeeded + succeeded,
        degraded: state.totals.degraded + degraded,
        failed: state.totals.failed + failed,
        slow: state.totals.slow + slow,
      },
    },
    events,
  };
}

function apply(
  state: ServiceCallsState,
  action: ServiceCallsAction,
): StepResult<ServiceCallsState> {
  const at = state.tick + 1;
  const name = serviceName(action.index, state.health.length, state.config.architecture);
  const health = [...state.health];
  if (action.index < 0 || action.index >= health.length) return { state, events: [] };
  const next: ServiceHealth =
    action.type === "slow-service" ? "slow" : action.type === "fail-service" ? "down" : "healthy";
  health[action.index] = next;
  const message = {
    slow: `${name} slowed down: ${Math.round(DEGRADED_SLOW_CHANCE * 100)}% of its responses now take ${SLOW_MS} ms`,
    down:
      state.config.architecture === "monolith"
        ? `${name} crashed — and took the whole process down with it`
        : `${name} is down: every call to it fails`,
    healthy: `${name} recovered`,
  }[next];
  return {
    state: { ...state, health },
    events: [{ at, tone: next === "healthy" ? "success" : "error", message }],
  };
}

function describe(state: ServiceCallsState): string {
  const m = state.metrics;
  if (!m) return "Ready. Press Play to send requests through the system.";
  const ok = Math.round(((m.succeeded + m.degraded) / REQUESTS_PER_STEP) * 1000) / 10;
  const degraded = m.degraded ? `, ${m.degraded} without recommendations` : "";
  return `${ok}% of requests succeeded${degraded}. Median ${m.p50} ms, slowest 1% ${m.p99} ms.`;
}

export const serviceCallsModel: SimulationModel<
  ServiceCallsState,
  ServiceCallsConfig,
  ServiceCallsAction
> = {
  id: "service-calls",
  init(config) {
    return {
      tick: 0,
      config,
      health: Array.from({ length: config.services }, () => "healthy" as const),
      metrics: null,
      history: [],
      totals: { requests: 0, succeeded: 0, degraded: 0, failed: 0, slow: 0 },
    };
  },
  tick,
  apply,
  describe,
};

/**
 * Teaching model of a layer 7 load balancer in front of a pool of application servers.
 *
 * Simplifications (shown to learners as the model's assumptions):
 * - Time is discrete: one tick represents 25 ms of simulated time.
 * - Every hop between the load balancer and a server takes a fixed 2 ticks; there is no packet loss.
 * - Each server runs a fixed number of workers; extra requests wait in a FIFO queue on the server.
 * - Request cost is either light (3–5 ticks) or heavy (18–26 ticks); nothing else varies.
 * - Health checks are active probes: a down server always fails, a running server always passes.
 * - With no server in rotation the load balancer answers 503 immediately (some real balancers
 *   "fail open" instead and keep routing to unhealthy targets).
 */
import type { Rng } from "../rng";
import type { SimEvent, SimulationModel, StepResult } from "../types";

export const TICK_MS = 25;
export const TRANSIT_TICKS = 2;
const LIGHT_COST: [number, number] = [3, 5];
const HEAVY_COST: [number, number] = [18, 26];
/** Ticks of history used for rolling latency and error metrics (1 s of simulated time). */
export const METRICS_WINDOW = 40;
export const MAX_SERVERS = 6;
export const MIN_SERVERS = 1;

export type Algorithm = "round-robin" | "least-connections";

export const TRAFFIC_LEVELS = {
  low: 0.6,
  medium: 1.0,
  high: 1.5,
  overload: 2.2,
} as const;
export type TrafficLevel = keyof typeof TRAFFIC_LEVELS;

export type LbConfig = {
  algorithm: Algorithm;
  traffic: TrafficLevel;
  /** Probability that a request is expensive. */
  heavyShare: number;
  healthChecks: boolean;
};

export type LbParams = LbConfig & {
  servers: number;
  workersPerServer: number;
  /** Ticks between active health checks of each server. */
  checkInterval: number;
  /** Consecutive failed checks before a server is taken out of rotation. */
  unhealthyThreshold: number;
  /** Consecutive passed checks before a server is put back into rotation. */
  healthyThreshold: number;
};

export const DEFAULT_LB_PARAMS: LbParams = {
  servers: 3,
  algorithm: "round-robin",
  traffic: "medium",
  heavyShare: 0.2,
  healthChecks: true,
  workersPerServer: 4,
  checkInterval: 6,
  unhealthyThreshold: 2,
  healthyThreshold: 2,
};

export type Request = {
  id: number;
  server: string;
  createdAt: number;
  cost: number;
  remaining: number;
  /** "incoming": client → load balancer; "transit": load balancer → server. */
  stage: "incoming" | "transit" | "queued" | "processing";
  /** Ticks left in the current network hop. */
  hopLeft: number;
};

export type Server = {
  id: string;
  /** Whether the process is actually running. */
  up: boolean;
  /** Whether the load balancer currently sends it new requests. */
  inRotation: boolean;
  /** Being removed from the pool: no new requests, finishing in-flight work. */
  draining: boolean;
  failedChecks: number;
  passedChecks: number;
  queue: Request[];
  processing: Request[];
  served: number;
  failed: number;
};

export type LbState = {
  tick: number;
  params: LbParams;
  config: LbConfig;
  servers: Server[];
  /** Requests travelling between client, load balancer and servers. */
  network: Request[];
  nextRequestId: number;
  nextServerNumber: number;
  rrCursor: number;
  /** Rolling windows for metrics. */
  latencies: { at: number; ms: number }[];
  errors: { at: number; count: number }[];
  /** Requests that failed in this tick, by server id ("lb" for 503s from the balancer). */
  failedNow: Record<string, number>;
  /** Failures caused by a user action (e.g. a crash), counted in the following tick. */
  failedByAction: Record<string, number>;
  totals: { completed: number; failed: number; routed: Record<string, number> };
};

export type LbAction =
  | { type: "crash"; server: string }
  | { type: "restart"; server: string }
  | { type: "add-server" }
  | { type: "remove-server" }
  | { type: "configure"; config: Partial<LbConfig> };

const clone = <T>(value: T): T => structuredClone(value);

function newServer(id: string, inRotation: boolean): Server {
  return {
    id,
    up: true,
    inRotation,
    draining: false,
    failedChecks: 0,
    passedChecks: 0,
    queue: [],
    processing: [],
    served: 0,
    failed: 0,
  };
}

/** Requests a server is responsible for right now, including those still on the way to it. */
export function outstanding(state: LbState, server: Server): number {
  const enRoute = state.network.filter((r) => r.stage === "transit" && r.server === server.id);
  return server.queue.length + server.processing.length + enRoute.length;
}

function recordFailure(
  s: LbState,
  where: string,
  count = 1,
  bucket: "failedNow" | "failedByAction" = "failedNow",
) {
  s[bucket][where] = (s[bucket][where] ?? 0) + count;
  s.totals.failed += count;
  const server = s.servers.find((x) => x.id === where);
  if (server) server.failed += count;
}

function chooseServer(s: LbState): Server | undefined {
  const pool = s.servers.filter((x) => x.inRotation && !x.draining);
  if (pool.length === 0) return undefined;
  if (s.config.algorithm === "round-robin") {
    const server = pool[s.rrCursor % pool.length]!;
    s.rrCursor += 1;
    return server;
  }
  // Least connections, scanning from a rotating start so ties are spread evenly.
  const start = s.rrCursor % pool.length;
  s.rrCursor += 1;
  let best: Server | undefined;
  for (let i = 0; i < pool.length; i++) {
    const candidate = pool[(start + i) % pool.length]!;
    if (!best || outstanding(s, candidate) < outstanding(s, best)) best = candidate;
  }
  return best;
}

function runHealthChecks(s: LbState, events: SimEvent[]) {
  const { unhealthyThreshold, healthyThreshold } = s.params;
  for (const server of s.servers) {
    if (server.draining) continue;
    if (server.up) {
      server.failedChecks = 0;
      if (!server.inRotation) {
        server.passedChecks += 1;
        if (server.passedChecks >= healthyThreshold) {
          server.inRotation = true;
          server.passedChecks = 0;
          events.push({
            at: s.tick,
            tone: "success",
            message: `${server.id} passed ${healthyThreshold} health checks — back in rotation`,
          });
        }
      }
    } else {
      server.passedChecks = 0;
      if (server.inRotation) {
        server.failedChecks += 1;
        if (server.failedChecks >= unhealthyThreshold) {
          server.inRotation = false;
          events.push({
            at: s.tick,
            tone: "warning",
            message: `${server.id} failed ${unhealthyThreshold} health checks in a row — removed from rotation`,
          });
        } else {
          events.push({
            at: s.tick,
            tone: "warning",
            message: `Health check failed for ${server.id} (${server.failedChecks} of ${unhealthyThreshold})`,
          });
        }
      }
    }
  }
}

function tick(state: LbState, rng: Rng): StepResult<LbState> {
  const s = clone(state);
  const events: SimEvent[] = [];
  s.tick += 1;
  s.failedNow = { ...s.failedByAction };
  s.failedByAction = {};

  if (s.config.healthChecks && s.tick % s.params.checkInterval === 0) runHealthChecks(s, events);

  // Network: requests reaching the load balancer are routed; requests reaching a server join it.
  const stillTravelling: Request[] = [];
  for (const request of s.network) {
    request.hopLeft -= 1;
    if (request.hopLeft > 0) {
      stillTravelling.push(request);
      continue;
    }
    if (request.stage === "incoming") {
      const target = chooseServer(s);
      if (!target) {
        recordFailure(s, "lb");
        continue;
      }
      request.server = target.id;
      request.stage = "transit";
      request.hopLeft = TRANSIT_TICKS;
      s.totals.routed[target.id] = (s.totals.routed[target.id] ?? 0) + 1;
      stillTravelling.push(request);
      continue;
    }
    const server = s.servers.find((x) => x.id === request.server);
    if (!server || !server.up) {
      recordFailure(s, request.server);
      continue;
    }
    request.stage = "queued";
    server.queue.push(request);
  }
  s.network = stillTravelling;

  // Servers: start queued work on free workers, then advance everything in progress.
  for (const server of s.servers) {
    if (!server.up) continue;
    while (server.processing.length < s.params.workersPerServer && server.queue.length > 0) {
      const next = server.queue.shift()!;
      next.stage = "processing";
      server.processing.push(next);
    }
    const unfinished: Request[] = [];
    for (const request of server.processing) {
      request.remaining -= 1;
      if (request.remaining > 0) {
        unfinished.push(request);
        continue;
      }
      server.served += 1;
      s.totals.completed += 1;
      // Response travels back through the balancer: one more hop each way is counted as latency.
      s.latencies.push({ at: s.tick, ms: (s.tick - request.createdAt + TRANSIT_TICKS) * TICK_MS });
    }
    server.processing = unfinished;
  }

  // Finish draining servers once their in-flight work is done.
  const drained = s.servers.filter((x) => x.draining && outstanding(s, x) === 0);
  for (const server of drained) {
    events.push({
      at: s.tick,
      tone: "info",
      message: `${server.id} finished draining and was removed`,
    });
  }
  s.servers = s.servers.filter((x) => !drained.includes(x));

  // New client requests arrive at the load balancer.
  const rate = TRAFFIC_LEVELS[s.config.traffic];
  const arrivals = Math.floor(rate) + (rng.chance(rate - Math.floor(rate)) ? 1 : 0);
  for (let i = 0; i < arrivals; i++) {
    const [min, max] = rng.chance(s.config.heavyShare) ? HEAVY_COST : LIGHT_COST;
    const cost = rng.int(min, max);
    s.network.push({
      id: s.nextRequestId++,
      server: "",
      createdAt: s.tick,
      cost,
      remaining: cost,
      stage: "incoming",
      hopLeft: 1,
    });
  }

  const failedTotal = Object.values(s.failedNow).reduce((a, b) => a + b, 0);
  if (failedTotal > 0) {
    s.errors.push({ at: s.tick, count: failedTotal });
  }
  const failedInTick = Object.entries(s.failedNow)
    .map(([where, n]) => [where, n - (state.failedByAction[where] ?? 0)] as const)
    .filter(([, n]) => n > 0);
  if (failedInTick.length > 0) {
    const parts = failedInTick.map(([where, n]) =>
      where === "lb" ? `${n} × 503 (no server in rotation)` : `${n} × ${where} unreachable`,
    );
    events.push({ at: s.tick, tone: "error", message: `Requests failed: ${parts.join(", ")}` });
  }

  const horizon = s.tick - METRICS_WINDOW;
  s.latencies = s.latencies.filter((x) => x.at > horizon);
  s.errors = s.errors.filter((x) => x.at > horizon);
  return { state: s, events };
}

function apply(state: LbState, action: LbAction): StepResult<LbState> {
  const s = clone(state);
  const events: SimEvent[] = [];
  const at = s.tick + 1;
  switch (action.type) {
    case "crash": {
      const server = s.servers.find((x) => x.id === action.server);
      if (!server || !server.up) break;
      const lost = server.queue.length + server.processing.length;
      server.up = false;
      server.queue = [];
      server.processing = [];
      if (lost > 0) recordFailure(s, server.id, lost, "failedByAction");
      events.push({
        at,
        tone: "error",
        message: `${server.id} crashed${lost > 0 ? ` — ${lost} in-flight request${lost === 1 ? "" : "s"} lost` : ""}`,
      });
      break;
    }
    case "restart": {
      const server = s.servers.find((x) => x.id === action.server);
      if (!server || server.up) break;
      server.up = true;
      server.failedChecks = 0;
      server.passedChecks = 0;
      events.push({
        at,
        tone: "info",
        message: server.inRotation
          ? `${server.id} restarted (it never left rotation)`
          : `${server.id} restarted — waiting to pass health checks`,
      });
      break;
    }
    case "add-server": {
      if (s.servers.filter((x) => !x.draining).length >= MAX_SERVERS) break;
      const id = `app-${s.nextServerNumber++}`;
      // With health checks on, a new server must pass a check before it receives traffic.
      s.servers.push(newServer(id, !s.config.healthChecks));
      events.push({
        at,
        tone: "info",
        message: s.config.healthChecks
          ? `${id} registered — joins rotation after passing health checks`
          : `${id} registered and added to rotation`,
      });
      break;
    }
    case "remove-server": {
      const active = s.servers.filter((x) => !x.draining);
      if (active.length <= MIN_SERVERS) break;
      const server = active.at(-1)!;
      server.draining = true;
      server.inRotation = false;
      events.push({
        at,
        tone: "info",
        message: `${server.id} deregistered — draining: no new requests, in-flight work finishes`,
      });
      break;
    }
    case "configure": {
      const before = s.config;
      s.config = { ...s.config, ...action.config };
      if (before.algorithm !== s.config.algorithm) {
        events.push({ at, tone: "info", message: `Algorithm switched to ${s.config.algorithm}` });
      }
      if (before.traffic !== s.config.traffic) {
        events.push({ at, tone: "info", message: `Traffic set to ${s.config.traffic}` });
      }
      if (before.heavyShare !== s.config.heavyShare) {
        events.push({
          at,
          tone: "info",
          message: `${Math.round(s.config.heavyShare * 100)}% of requests are now heavy`,
        });
      }
      if (before.healthChecks !== s.config.healthChecks) {
        // Without health information the balancer treats every registered server as eligible.
        if (!s.config.healthChecks) {
          for (const server of s.servers) if (!server.draining) server.inRotation = true;
        }
        events.push({
          at,
          tone: s.config.healthChecks ? "info" : "warning",
          message: s.config.healthChecks ? "Health checks enabled" : "Health checks disabled",
        });
      }
      break;
    }
  }
  return { state: s, events };
}

/** 95th percentile of the latencies in the rolling window, or undefined if there are none. */
export function p95(state: LbState): number | undefined {
  if (state.latencies.length === 0) return undefined;
  const sorted = state.latencies.map((x) => x.ms).sort((a, b) => a - b);
  return sorted[Math.min(sorted.length - 1, Math.ceil(sorted.length * 0.95) - 1)];
}

export function recentErrors(state: LbState): number {
  return state.errors.reduce((sum, e) => sum + e.count, 0);
}

export const loadBalancerModel: SimulationModel<LbState, LbParams, LbAction> = {
  id: "load-balancer",
  init(params) {
    const servers = Array.from({ length: params.servers }, (_, i) =>
      newServer(`app-${i + 1}`, true),
    );
    return {
      tick: 0,
      params,
      config: {
        algorithm: params.algorithm,
        traffic: params.traffic,
        heavyShare: params.heavyShare,
        healthChecks: params.healthChecks,
      },
      servers,
      network: [],
      nextRequestId: 1,
      nextServerNumber: params.servers + 1,
      rrCursor: 0,
      latencies: [],
      errors: [],
      failedNow: {},
      failedByAction: {},
      totals: { completed: 0, failed: 0, routed: {} },
    };
  },
  tick,
  apply,
  describe(state) {
    const inRotation = state.servers.filter((x) => x.inRotation && !x.draining).length;
    const total = state.servers.filter((x) => !x.draining).length;
    const latency = p95(state);
    const errors = recentErrors(state);
    return [
      `${((state.tick * TICK_MS) / 1000).toFixed(2)} s`,
      `${inRotation} of ${total} servers in rotation`,
      latency === undefined ? "no completed requests yet" : `p95 latency ${latency} ms`,
      errors === 0 ? "no errors in the last second" : `${errors} errors in the last second`,
    ].join(" · ");
  },
};

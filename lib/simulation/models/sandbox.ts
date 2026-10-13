/**
 * System design sandbox: a request-flow model of a typical web backend. Each one-second step
 * pushes the offered traffic through app servers, an optional cache, the database (a primary plus
 * optional read replicas) and an optional write queue, and records what each component handled,
 * what overflowed, and the resulting error rate and latency.
 *
 * Capacities and latencies are illustrative round numbers, not benchmarks. Latency uses a simple
 * queueing approximation — service time × 1 / (1 − utilisation) — which captures the important
 * shape: components get slow well before they are 100% busy.
 */
import type { SimEvent, SimulationModel, StepResult } from "../types";

/** Requests or operations per second each component can handle (illustrative). */
export const CAPACITY = {
  appServer: 500,
  replica: 1000,
  primary: 1000,
  worker: 200,
} as const;

/** Service time of each component when idle, in milliseconds (illustrative). */
export const SERVICE_MS = { balancer: 1, app: 20, cache: 1, database: 8, enqueue: 2 } as const;

/** Steps for a flushed cache to warm back up to its normal hit ratio. */
export const WARMUP_TICKS = 15;
export const HISTORY_TICKS = 60;
/** Latency multiplier once a component is at or over capacity. */
export const MAX_QUEUEING_FACTOR = 20;
export const BOTTLENECK_THRESHOLD = 0.8;

export const LIMITS = { appServers: [1, 10], readReplicas: [0, 3], workers: [1, 6] } as const;
export const HIT_RATIOS = [0.5, 0.8, 0.95] as const;

export type Architecture = {
  appServers: number;
  cache: boolean;
  cacheHitRatio: number;
  readReplicas: number;
  asyncWrites: boolean;
  workers: number;
};

export const DEFAULT_ARCHITECTURE: Architecture = {
  appServers: 2,
  cache: false,
  cacheHitRatio: 0.8,
  readReplicas: 0,
  asyncWrites: false,
  workers: 2,
};

export type TrafficProfile = {
  /** Requests per second outside spikes. */
  base: number;
  /** Share of requests that only read data (0–1). */
  readShare: number;
  spikes: { from: number; to: number; multiplier: number }[];
};

export type SandboxParams = { architecture: Architecture; traffic: TrafficProfile };

export type Tier = "app" | "cache" | "replicas" | "primary" | "workers";

export type Metrics = {
  offered: number;
  appCapacity: number;
  appServed: number;
  appRejected: number;
  reads: number;
  writes: number;
  hitRatio: number;
  cacheHits: number;
  replicaLoad: number;
  replicaCapacity: number;
  primaryLoad: number;
  primaryCapacity: number;
  readsFailed: number;
  writesFailed: number;
  enqueued: number;
  drained: number;
  backlog: number;
  /** How long a write joining the queue now would wait, at the current drain rate. */
  backlogSeconds: number;
  failed: number;
  errorRate: number;
  latencyMs: number;
  utilisation: Partial<Record<Tier, number>>;
  bottleneck: Tier | null;
};

export type SandboxState = {
  tick: number;
  architecture: Architecture;
  traffic: TrafficProfile;
  failedServers: number;
  cacheFlushedAt: number | null;
  databaseDegraded: boolean;
  backlog: number;
  metrics: Metrics | null;
  history: { at: number; errorRate: number; latencyMs: number; offered: number }[];
  totals: { offered: number; failed: number };
};

export type SandboxAction =
  | { type: "fail-server" }
  | { type: "restore-servers" }
  | { type: "flush-cache" }
  | { type: "degrade-database" }
  | { type: "restore-database" };

export const TIER_LABEL: Record<Tier, string> = {
  app: "App servers",
  cache: "Cache",
  replicas: "Read replicas",
  primary: "Database primary",
  workers: "Write workers",
};

/** Illustrative running cost in units, so challenges can reward a lean design. */
export function costUnits(a: Architecture): number {
  return (
    a.appServers +
    1 + // the database primary
    (a.cache ? 1 : 0) +
    a.readReplicas +
    (a.asyncWrites ? 0.5 + a.workers * 0.5 : 0)
  );
}

/** Service-time multiplier from a simple M/M/1-style approximation. */
export function queueingFactor(utilisation: number): number {
  if (!Number.isFinite(utilisation) || utilisation >= 1) return MAX_QUEUEING_FACTOR;
  return Math.min(MAX_QUEUEING_FACTOR, 1 / (1 - Math.max(0, utilisation)));
}

export function offeredAt(traffic: TrafficProfile, tick: number): number {
  const spike = traffic.spikes.find((s) => tick >= s.from && tick < s.to);
  return Math.round(traffic.base * (spike?.multiplier ?? 1));
}

const ratio = (load: number, capacity: number) =>
  capacity > 0 ? load / capacity : load > 0 ? Infinity : 0;

/** Pure flow computation for one step. Exported for tests. */
export function computeStep(
  state: SandboxState,
  tick: number,
): { metrics: Metrics; backlog: number } {
  const a = state.architecture;
  const t = state.traffic;
  const dbFactor = state.databaseDegraded ? 0.5 : 1;

  const offered = offeredAt(t, tick);
  const alive = Math.max(0, a.appServers - state.failedServers);
  const appCapacity = alive * CAPACITY.appServer;
  const appServed = Math.min(offered, appCapacity);
  const appRejected = offered - appServed;

  const reads = appServed * t.readShare;
  const writes = appServed - reads;

  const warm =
    state.cacheFlushedAt === null ? 1 : Math.min(1, (tick - state.cacheFlushedAt) / WARMUP_TICKS);
  const hitRatio = a.cache ? a.cacheHitRatio * warm : 0;
  const cacheHits = reads * hitRatio;
  const misses = reads - cacheHits;

  // Reads go to the replicas when there are any; otherwise the primary serves them too.
  const replicaCapacity = a.readReplicas * CAPACITY.replica * dbFactor;
  const primaryCapacity = CAPACITY.primary * dbFactor;
  const replicaLoad = a.readReplicas > 0 ? misses : 0;
  const primaryReads = a.readReplicas > 0 ? 0 : misses;

  let readsFailed = Math.max(0, replicaLoad - replicaCapacity);
  let writesFailed = 0;
  let enqueued = 0;
  let drained = 0;
  let backlog = state.backlog;
  let primaryLoad: number;

  if (a.asyncWrites) {
    enqueued = writes;
    backlog += writes;
    const spare = Math.max(0, primaryCapacity - primaryReads);
    drained = Math.min(backlog, a.workers * CAPACITY.worker, spare);
    backlog -= drained;
    primaryLoad = primaryReads + Math.min(state.backlog + writes, a.workers * CAPACITY.worker);
    readsFailed += Math.max(0, primaryReads - primaryCapacity);
  } else {
    primaryLoad = primaryReads + writes;
    const overflow = Math.max(0, primaryLoad - primaryCapacity);
    // Overload hits reads and writes on the primary in proportion to their share of its load.
    if (overflow > 0) {
      readsFailed += overflow * (primaryReads / primaryLoad);
      writesFailed = overflow * (writes / primaryLoad);
    }
  }

  const drainRate = Math.min(
    a.workers * CAPACITY.worker,
    Math.max(0, primaryCapacity - primaryReads),
  );
  const backlogSeconds = backlog <= 0.5 ? 0 : drainRate > 0 ? backlog / drainRate : Infinity;

  const failed = appRejected + readsFailed + writesFailed;
  const errorRate = offered > 0 ? failed / offered : 0;

  const utilisation: Partial<Record<Tier, number>> = { app: ratio(offered, appCapacity) };
  if (a.readReplicas > 0) utilisation.replicas = ratio(replicaLoad, replicaCapacity);
  if (a.asyncWrites) {
    utilisation.workers = ratio(state.backlog + writes, a.workers * CAPACITY.worker);
  }
  utilisation.primary = ratio(primaryLoad, primaryCapacity);

  const readNode = a.readReplicas > 0 ? (utilisation.replicas ?? 0) : (utilisation.primary ?? 0);
  const readMs =
    hitRatio * SERVICE_MS.cache + (1 - hitRatio) * SERVICE_MS.database * queueingFactor(readNode);
  const writeMs = a.asyncWrites
    ? SERVICE_MS.enqueue
    : SERVICE_MS.database * queueingFactor(utilisation.primary ?? 0);
  const latencyMs =
    SERVICE_MS.balancer +
    SERVICE_MS.app * queueingFactor(utilisation.app ?? 0) +
    t.readShare * readMs +
    (1 - t.readShare) * writeMs;

  // The busiest component at or above the threshold. On a tie the upstream one wins: requests
  // reach it first. (Insertion order of `utilisation` is upstream to downstream.)
  let bottleneck: Tier | null = null;
  let worst = -Infinity;
  for (const [tier, u] of Object.entries(utilisation) as [Tier, number][]) {
    if (u >= BOTTLENECK_THRESHOLD && u > worst) {
      worst = u;
      bottleneck = tier;
    }
  }

  return {
    backlog,
    metrics: {
      offered,
      appCapacity,
      appServed,
      appRejected,
      reads,
      writes,
      hitRatio,
      cacheHits,
      replicaLoad,
      replicaCapacity,
      primaryLoad,
      primaryCapacity,
      readsFailed,
      writesFailed,
      enqueued,
      drained,
      backlog,
      backlogSeconds,
      failed,
      errorRate,
      latencyMs,
      utilisation,
      bottleneck,
    },
  };
}

const pct = (n: number) => `${Math.round(n * 100)}%`;
const per = (n: number) => `${Math.round(n).toLocaleString("en-US")}/s`;

function bottleneckMessage(m: Metrics, tier: Tier): string {
  switch (tier) {
    case "app":
      return `App servers are the bottleneck: ${per(m.offered)} offered against ${per(m.appCapacity)} of capacity`;
    case "replicas":
      return `Read replicas are the bottleneck: ${per(m.replicaLoad)} reads against ${per(m.replicaCapacity)}`;
    case "primary":
      return `The database primary is the bottleneck: ${per(m.primaryLoad)} operations against ${per(m.primaryCapacity)}`;
    case "workers":
      return `Write workers are the bottleneck: the write queue is growing (${Math.round(m.backlog)} waiting)`;
    case "cache":
      return "The cache is the bottleneck";
  }
}

function tick(state: SandboxState): StepResult<SandboxState> {
  const at = state.tick + 1;
  const { metrics, backlog } = computeStep(state, at);
  const events: SimEvent[] = [];
  const previous = state.metrics;

  if (metrics.bottleneck && metrics.bottleneck !== previous?.bottleneck) {
    const overloaded = (metrics.utilisation[metrics.bottleneck] ?? 0) >= 1;
    events.push({
      at,
      tone: overloaded ? "error" : "warning",
      message: bottleneckMessage(metrics, metrics.bottleneck),
    });
  } else if (!metrics.bottleneck && previous?.bottleneck) {
    events.push({ at, tone: "success", message: "No component is above 80% utilisation" });
  }
  const wasFailing = (previous?.errorRate ?? 0) > 0.01;
  if (metrics.errorRate > 0.01 && !wasFailing) {
    events.push({ at, tone: "error", message: `Error rate rose to ${pct(metrics.errorRate)}` });
  } else if (metrics.errorRate <= 0.01 && wasFailing) {
    events.push({ at, tone: "success", message: "Error rate back under 1%" });
  }

  return {
    state: {
      ...state,
      tick: at,
      backlog,
      metrics,
      history: [
        ...state.history,
        {
          at,
          errorRate: metrics.errorRate,
          latencyMs: metrics.latencyMs,
          offered: metrics.offered,
        },
      ].slice(-HISTORY_TICKS),
      totals: {
        offered: state.totals.offered + metrics.offered,
        failed: state.totals.failed + metrics.failed,
      },
    },
    events,
  };
}

function apply(state: SandboxState, action: SandboxAction): StepResult<SandboxState> {
  const at = state.tick + 1;
  const a = state.architecture;
  switch (action.type) {
    case "fail-server": {
      if (state.failedServers >= a.appServers) return { state, events: [] };
      const failedServers = state.failedServers + 1;
      return {
        state: { ...state, failedServers },
        events: [
          {
            at,
            tone: "error",
            message: `An app server failed — ${a.appServers - failedServers} of ${a.appServers} left`,
          },
        ],
      };
    }
    case "restore-servers":
      return {
        state: { ...state, failedServers: 0 },
        events: [{ at, tone: "success", message: "Failed app servers replaced" }],
      };
    case "flush-cache":
      if (!a.cache) return { state, events: [] };
      return {
        state: { ...state, cacheFlushedAt: at },
        events: [
          {
            at,
            tone: "warning",
            message: `Cache flushed — every read misses until it warms up over about ${WARMUP_TICKS} s`,
          },
        ],
      };
    case "degrade-database":
      return {
        state: { ...state, databaseDegraded: true },
        events: [{ at, tone: "error", message: "Database slowed down — capacity halved" }],
      };
    case "restore-database":
      return {
        state: { ...state, databaseDegraded: false },
        events: [{ at, tone: "success", message: "Database back to full capacity" }],
      };
  }
}

function describe(state: SandboxState): string {
  const m = state.metrics;
  if (!m) return "Ready. Press Play to send traffic through this architecture.";
  const parts = [
    `${per(m.offered)} offered`,
    `${pct(m.errorRate)} failing`,
    `about ${Math.round(m.latencyMs)} ms per request`,
  ];
  const bottleneck = m.bottleneck
    ? `${TIER_LABEL[m.bottleneck]} at ${pct(m.utilisation[m.bottleneck] ?? 0)} is the bottleneck.`
    : "No component is above 80% utilisation.";
  return `${parts.join(", ")}. ${bottleneck}`;
}

export const sandboxModel: SimulationModel<SandboxState, SandboxParams, SandboxAction> = {
  id: "system-design-sandbox",
  init({ architecture, traffic }) {
    return {
      tick: 0,
      architecture,
      traffic,
      failedServers: 0,
      cacheFlushedAt: null,
      databaseDegraded: false,
      backlog: 0,
      metrics: null,
      history: [],
      totals: { offered: 0, failed: 0 },
    };
  },
  tick,
  apply,
  describe,
};

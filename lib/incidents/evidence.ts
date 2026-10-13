/**
 * Evidence for the incident lab, produced by running the same deterministic simulation models the
 * lessons use. Nothing here is hand-drawn: every chart and log line comes from a model run, and
 * `tests/unit/incident-evidence.test.ts` checks that the evidence shows what each story claims.
 */
import {
  DEFAULT_CACHE_CONFIG,
  averageLatency,
  cacheModel,
  hitRatio,
  type CacheState,
} from "@/lib/simulation/models/cache";
import {
  DEFAULT_KUBE_PARAMS,
  endpoints,
  kubernetesModel,
} from "@/lib/simulation/models/kubernetes";
import {
  DEFAULT_LB_PARAMS,
  TICK_MS as LB_TICK_MS,
  loadBalancerModel,
  type LbState,
} from "@/lib/simulation/models/load-balancer";
import {
  DEFAULT_QUEUE_CONFIG,
  TICK_MS as QUEUE_TICK_MS,
  oldestAgeTicks,
  queueModel,
  throughput,
} from "@/lib/simulation/models/queue";
import { runSimulation } from "@/lib/simulation/run";
import type { Frame } from "@/lib/simulation/types";

export type ChartSeries = { label: string; values: number[] };

export type IncidentChart = {
  /** Unit of the vertical axis, e.g. "messages" or "%". */
  unit: string;
  /** Label of one step on the horizontal axis, e.g. "s" for seconds. */
  xUnit: string;
  /** Horizontal distance between consecutive values, in `xUnit`. */
  xStep: number;
  /** Horizontal position of the first value, in `xUnit` (default 0). */
  xStart?: number;
  series: ChartSeries[];
  /** Neutral, observable events — never the answer. */
  markers: { at: number; label: string }[];
  /** Fixed vertical range, when the natural range would mislead (e.g. percentages). */
  yMax?: number;
};

export type IncidentEvidence = {
  charts: Record<string, IncidentChart>;
  logs: Record<string, string[]>;
};

/** Every `every`-th frame, starting from the first. */
function sample<T>(frames: Frame<T>[], every: number): Frame<T>[] {
  return frames.filter((_, i) => i % every === 0);
}

const round = (value: number, digits = 1) => Number(value.toFixed(digits));

// --- Message queue: a slow downstream dependency ------------------------------------------

export const QUEUE_SLOWDOWN_TICK = 150;
const QUEUE_TICKS = 600;

function queueEvidence(): IncidentEvidence {
  const frames = runSimulation(queueModel, {
    params: DEFAULT_QUEUE_CONFIG,
    seed: 7,
    ticks: QUEUE_TICKS,
    actions: [
      {
        tick: QUEUE_SLOWDOWN_TICK,
        action: { type: "configure", config: { slowDownstream: true } },
      },
    ],
  });
  const perSecond = 1000 / QUEUE_TICK_MS;
  const seconds = sample(frames, perSecond);
  // Rates need a full second of history, so they start at second 1.
  const arrived = seconds
    .slice(1)
    .map((f, i) => f.state.totals.produced - (seconds[i]?.state.totals.produced ?? 0));
  const processed = seconds.slice(1).map((f) => throughput(f.state));

  return {
    charts: {
      "queue-rates": {
        unit: "messages / s",
        xUnit: "s",
        xStep: 1,
        xStart: 1,
        series: [
          { label: "Arriving", values: arrived },
          { label: "Processed", values: processed },
        ],
        markers: [],
      },
      "queue-depth": {
        unit: "messages",
        xUnit: "s",
        xStep: 1,
        series: [
          { label: "Waiting in the queue", values: seconds.map((f) => f.state.queue.length) },
        ],
        markers: [],
      },
      "queue-age": {
        unit: "s",
        xUnit: "s",
        xStep: 1,
        series: [
          {
            label: "Age of the oldest message",
            values: seconds.map((f) => round((oldestAgeTicks(f.state) * QUEUE_TICK_MS) / 1000)),
          },
        ],
        markers: [],
      },
      "queue-busy": {
        unit: "%",
        xUnit: "s",
        xStep: 1,
        yMax: 100,
        series: [
          {
            label: "Consumers busy",
            values: seconds.map((f) =>
              Math.round(
                (f.state.consumers.filter((c) => c.message).length / f.state.consumers.length) *
                  100,
              ),
            ),
          },
        ],
        markers: [],
      },
    },
    logs: {
      "queue-dlq": [
        `dead-letter queue depth: ${frames.at(-1)?.state.dlq.length ?? 0}`,
        `messages retried: ${frames.at(-1)?.state.totals.retried ?? 0}`,
        `consumers running: ${frames.at(-1)?.state.consumers.length ?? 0} of ${DEFAULT_QUEUE_CONFIG.consumers}`,
      ],
    },
  };
}

// --- Load balancer: the health-check detection window ----------------------------------------

export const LB_CRASH_TICK = 60;
/** Slower checks than the lesson's demo, in proportion to common real settings (10 s, 3 failures). */
export const LB_INCIDENT_PARAMS = {
  ...DEFAULT_LB_PARAMS,
  checkInterval: 20,
  unhealthyThreshold: 3,
};
export const LB_CRASHED_SERVER = "app-2";
const LB_TICKS = 180;
const LB_BUCKET = 4; // 4 ticks × 25 ms = 100 ms

function lbEvidence(): IncidentEvidence {
  const frames = runSimulation(loadBalancerModel, {
    params: LB_INCIDENT_PARAMS,
    seed: 11,
    ticks: LB_TICKS,
    actions: [{ tick: LB_CRASH_TICK, action: { type: "crash", server: LB_CRASHED_SERVER } }],
  });
  const failedIn = (s: LbState) => Object.values(s.failedNow).reduce((a, b) => a + b, 0);
  const buckets: Frame<LbState>[][] = [];
  for (let i = 1; i < frames.length; i += LB_BUCKET) buckets.push(frames.slice(i, i + LB_BUCKET));
  const ms = (tick: number) => tick * LB_TICK_MS;
  /** Bucket b holds ticks 4b+1 … 4b+4. */
  const crashBucket = Math.floor((LB_CRASH_TICK - 1) / LB_BUCKET);

  const healthLog = frames.flatMap((f) =>
    f.events
      .filter((e) => e.message.includes(LB_CRASHED_SERVER))
      .map((e) => `${String(ms(f.index)).padStart(5)} ms  ${e.message}`),
  );

  return {
    charts: {
      "lb-errors": {
        unit: "requests per 100 ms",
        xUnit: "ms",
        xStep: LB_BUCKET * LB_TICK_MS,
        series: [
          {
            label: "Failed",
            values: buckets.map((b) => b.reduce((sum, f) => sum + failedIn(f.state), 0)),
          },
          {
            label: "Succeeded",
            values: buckets.map(
              (b, i) =>
                (b.at(-1)?.state.totals.completed ?? 0) -
                (i === 0 ? 0 : (buckets[i - 1]?.at(-1)?.state.totals.completed ?? 0)),
            ),
          },
        ],
        markers: [{ at: crashBucket, label: `${LB_CRASHED_SERVER} crashes` }],
      },
      "lb-rotation": {
        unit: "servers",
        xUnit: "ms",
        xStep: LB_BUCKET * LB_TICK_MS,
        series: [
          {
            label: "Servers in rotation",
            values: buckets.map(
              (b) => b.at(-1)?.state.servers.filter((s) => s.inRotation).length ?? 0,
            ),
          },
        ],
        markers: [{ at: crashBucket, label: `${LB_CRASHED_SERVER} crashes` }],
        yMax: DEFAULT_LB_PARAMS.servers,
      },
    },
    logs: {
      "lb-events": healthLog,
      "lb-config": [
        `health_check.interval = ${LB_INCIDENT_PARAMS.checkInterval * LB_TICK_MS} ms`,
        `health_check.unhealthy_threshold = ${LB_INCIDENT_PARAMS.unhealthyThreshold}`,
        `health_check.healthy_threshold = ${LB_INCIDENT_PARAMS.healthyThreshold}`,
        `algorithm = ${LB_INCIDENT_PARAMS.algorithm}`,
      ],
    },
  };
}

// --- Cache: a sequential scan through an LRU cache --------------------------------------------

export const CACHE_SCAN_TICK = 120;
const CACHE_TICKS = 240;

function cacheEvidence(): IncidentEvidence {
  const frames = runSimulation(cacheModel, {
    params: DEFAULT_CACHE_CONFIG,
    seed: 3,
    ticks: CACHE_TICKS,
    actions: [
      { tick: CACHE_SCAN_TICK, action: { type: "configure", config: { pattern: "scan" } } },
    ],
  });
  const series = (pick: (s: CacheState) => number | undefined) =>
    frames.slice(1).map((f) => round(pick(f.state) ?? 0));

  const accesses = frames.slice(CACHE_SCAN_TICK + 20, CACHE_SCAN_TICK + 32).flatMap((f) => {
    const c = f.state.current;
    if (!c) return [];
    const evicted = c.evicted ? `, evicted ${c.evicted}` : "";
    return [`request ${String(f.index).padStart(3)}  GET ${c.key}  ${c.outcome}${evicted}`];
  });

  return {
    charts: {
      "cache-hit-ratio": {
        unit: "%",
        xUnit: "requests",
        xStep: 1,
        yMax: 100,
        series: [
          {
            label: "Hit ratio (last 40 requests)",
            values: series((s) => (hitRatio(s) ?? 0) * 100),
          },
        ],
        markers: [{ at: CACHE_SCAN_TICK - 1, label: "Nightly export job starts" }],
      },
      "cache-latency": {
        unit: "ms",
        xUnit: "requests",
        xStep: 1,
        series: [{ label: "Average response time", values: series(averageLatency) }],
        markers: [{ at: CACHE_SCAN_TICK - 1, label: "Nightly export job starts" }],
      },
    },
    logs: {
      "cache-access-log": accesses,
      "cache-config": [
        `eviction_policy = ${DEFAULT_CACHE_CONFIG.policy}`,
        `capacity = ${DEFAULT_CACHE_CONFIG.capacity} keys`,
        "distinct keys read by the export job = 8",
      ],
    },
  };
}

// --- Kubernetes: a node failure and the eviction timeout ----------------------------------------

export const K8S_FAIL_TICK = 10;
export const K8S_FAILED_NODE = "node-b";
const K8S_TICKS = 40;

function kubernetesEvidence(): IncidentEvidence {
  const frames = runSimulation(kubernetesModel, {
    params: DEFAULT_KUBE_PARAMS,
    seed: 5,
    ticks: K8S_TICKS,
    actions: [{ tick: K8S_FAIL_TICK, action: { type: "fail-node", node: K8S_FAILED_NODE } }],
  });
  const eventLog = frames
    .slice(K8S_FAIL_TICK)
    .flatMap((f) => f.events.map((e) => `step ${String(f.index).padStart(2)}  ${e.message}`));

  return {
    charts: {
      "k8s-ready": {
        unit: "pods",
        xUnit: "steps",
        xStep: 1,
        yMax: DEFAULT_KUBE_PARAMS.replicas,
        series: [
          {
            label: "Ready pods behind the Service",
            values: frames.map((f) => endpoints(f.state).length),
          },
        ],
        markers: [{ at: K8S_FAIL_TICK, label: `${K8S_FAILED_NODE} loses power` }],
      },
    },
    logs: { "k8s-events": eventLog },
  };
}

export const INCIDENT_EVIDENCE: Record<string, () => IncidentEvidence> = {
  "orders-arriving-late": queueEvidence,
  "errors-after-a-crash": lbEvidence,
  "cache-collapse-at-night": cacheEvidence,
  "pods-missing-after-node-failure": kubernetesEvidence,
};

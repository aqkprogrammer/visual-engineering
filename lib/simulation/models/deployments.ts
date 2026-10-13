/**
 * Deployment strategies: the same release shipped four ways. Each one-minute step decides what
 * share of traffic the new version (v2) gets, how many instances are running, and how many
 * requests fail — then watches for trouble and rolls back.
 *
 * Illustrative numbers: 10 instances serving 1,000 requests/s, a 0.2% baseline error rate, and a
 * buggy v2 that fails 15% of the requests it handles. Automated checks look at error rates every
 * minute; without them, someone notices about ten minutes after errors start.
 */
import type { SimEvent, SimulationModel, StepResult } from "../types";

export const FLEET = 10;
export const DEMAND = 1000;
export const BASELINE_ERROR = 0.002;
export const BUGGY_ERROR = 0.15;
export const DEPLOY_AT = 5;
/** Minutes for a new instance to start and pass health checks. */
export const BOOT_STEPS = 2;
/** Minutes each rolling batch or canary stage runs before the next. */
export const BAKE_STEPS = 4;
export const ROLLING_BATCH = 3;
export const CANARY_STAGES = [0.05, 0.25, 0.5, 1] as const;
/** Aggregate alarm: overall error rate above this for two minutes in a row. */
export const ALARM_THRESHOLD = 0.01;
/** Canary analysis: canary error rate this far above the control's for two minutes. */
export const CANARY_MARGIN = 0.02;
export const MANUAL_DETECTION_STEPS = 10;
/** Minutes blue-green keeps the old fleet after switching, for instant rollback. */
export const BLUE_KEEP_STEPS = 10;
export const HISTORY_STEPS = 60;

export type Strategy = "all-at-once" | "rolling" | "blue-green" | "canary";
export type DeployConfig = { strategy: Strategy; buggy: boolean; autoRollback: boolean };

export const DEFAULT_DEPLOY_CONFIG: DeployConfig = {
  strategy: "canary",
  buggy: true,
  autoRollback: true,
};

export type Phase = "waiting" | "deploying" | "complete" | "rolling-back" | "rolled-back";

export type DeployState = {
  tick: number;
  config: DeployConfig;
  phase: Phase;
  /** Share of traffic served by v2 (0–1). */
  v2Share: number;
  /** Instances running: v1 and v2 (blue-green runs both fleets at once). */
  instances: { v1: number; v2: number };
  /** Minutes of downtime remaining while instances restart (all-at-once). */
  downUntil: number;
  /** Step at which the current batch or stage started. */
  stageStart: number;
  stage: number;
  /** Consecutive minutes the active check has been breached. */
  breaches: number;
  /** First minute v2 caused errors, for manual detection. */
  errorsSince: number | null;
  metrics: {
    errorRate: number;
    v1ErrorRate: number;
    v2ErrorRate: number;
    failed: number;
    downtime: boolean;
  } | null;
  history: { at: number; errorRate: number; v2Share: number }[];
  totals: { failed: number; instanceMinutes: number; peakErrorRate: number };
  /** Minute the rollout finished or rollback completed. */
  finishedAt: number | null;
};

/** No user actions: the strategy, bug and rollback setting define the whole run. */
export type DeployAction = never;

export const STRATEGY_LABEL: Record<Strategy, string> = {
  "all-at-once": "All at once",
  rolling: "Rolling",
  "blue-green": "Blue-green",
  canary: "Canary",
};

const v2Error = (c: DeployConfig) => (c.buggy ? BUGGY_ERROR : BASELINE_ERROR);

function startRollback(s: DeployState, at: number, events: SimEvent[], reason: string) {
  s.phase = "rolling-back";
  s.stageStart = at;
  s.breaches = 0;
  events.push({ at, tone: "warning", message: `${reason} — rolling back` });
  if (s.config.strategy === "blue-green" || s.config.strategy === "canary") {
    // Traffic shifts back at once; the old version is still running.
    s.v2Share = 0;
    s.phase = "rolled-back";
    s.finishedAt = at;
    s.instances = { v1: FLEET, v2: 0 };
    events.push({ at, tone: "success", message: "Rolled back: all traffic is on v1 again" });
  } else if (s.config.strategy === "all-at-once") {
    // Redeploy v1 the same way: every instance restarts.
    s.downUntil = at + BOOT_STEPS;
    s.instances = { v1: FLEET, v2: 0 };
    s.v2Share = 0;
  }
}

function advance(s: DeployState, at: number, events: SimEvent[]) {
  const { strategy } = s.config;
  if (s.phase === "waiting" && at >= DEPLOY_AT) {
    s.phase = "deploying";
    s.stageStart = at;
    s.stage = 0;
    events.push({
      at,
      tone: "info",
      message: `${STRATEGY_LABEL[strategy]} deployment of v2 started`,
    });
    if (strategy === "all-at-once") {
      s.downUntil = at + BOOT_STEPS;
      s.instances = { v1: 0, v2: FLEET };
      events.push({
        at,
        tone: "warning",
        message: `Every instance restarts at once — ${BOOT_STEPS} min with nothing serving`,
      });
    } else if (strategy === "blue-green") {
      s.instances = { v1: FLEET, v2: FLEET };
      events.push({
        at,
        tone: "info",
        message: `Green fleet of ${FLEET} v2 instances starting alongside blue`,
      });
    } else if (strategy === "rolling") {
      s.instances = { v1: FLEET - ROLLING_BATCH, v2: ROLLING_BATCH };
      s.v2Share = ROLLING_BATCH / FLEET;
    } else {
      s.instances = { v1: FLEET, v2: 1 };
      s.v2Share = CANARY_STAGES[0];
      events.push({
        at,
        tone: "info",
        message: `Canary: ${Math.round(CANARY_STAGES[0] * 100)}% of traffic to v2`,
      });
    }
    return;
  }

  if (s.phase === "deploying") {
    const elapsed = at - s.stageStart;
    if (strategy === "all-at-once" && at >= s.downUntil) {
      s.v2Share = 1;
      s.phase = "complete";
      s.finishedAt = at;
      events.push({ at, tone: "success", message: "All instances are running v2" });
    } else if (strategy === "blue-green") {
      if (elapsed === BOOT_STEPS) {
        s.v2Share = 1;
        events.push({
          at,
          tone: "info",
          message: "Load balancer switched: 100% of traffic to green (v2)",
        });
      } else if (elapsed >= BOOT_STEPS + BLUE_KEEP_STEPS) {
        s.instances = { v1: 0, v2: FLEET };
        s.phase = "complete";
        s.finishedAt = at;
        events.push({ at, tone: "success", message: "Blue fleet retired; v2 is live" });
      }
    } else if (strategy === "rolling" && elapsed >= BAKE_STEPS) {
      const v2 = Math.min(FLEET, s.instances.v2 + ROLLING_BATCH);
      s.instances = { v1: FLEET - v2, v2 };
      s.v2Share = v2 / FLEET;
      s.stageStart = at;
      events.push({ at, tone: "info", message: `Rolling: ${v2} of ${FLEET} instances on v2` });
      if (v2 === FLEET) {
        s.phase = "complete";
        s.finishedAt = at;
      }
    } else if (strategy === "canary" && elapsed >= BAKE_STEPS) {
      s.stage += 1;
      const share = CANARY_STAGES[s.stage] ?? 1;
      s.v2Share = share;
      s.stageStart = at;
      s.instances = {
        v1: Math.ceil(FLEET * (1 - share)),
        v2: Math.max(1, Math.ceil(FLEET * share)),
      };
      events.push({
        at,
        tone: "info",
        message: `Canary: ${Math.round(share * 100)}% of traffic to v2`,
      });
      if (share === 1) {
        s.instances = { v1: 0, v2: FLEET };
        s.phase = "complete";
        s.finishedAt = at;
      }
    }
    return;
  }

  if (s.phase === "rolling-back") {
    if (strategy === "all-at-once" && at >= s.downUntil) {
      s.phase = "rolled-back";
      s.finishedAt = at;
      events.push({ at, tone: "success", message: "Rolled back: every instance is on v1 again" });
    } else if (strategy === "rolling" && at - s.stageStart >= BAKE_STEPS) {
      const v2 = Math.max(0, s.instances.v2 - ROLLING_BATCH);
      s.instances = { v1: FLEET - v2, v2 };
      s.v2Share = v2 / FLEET;
      s.stageStart = at;
      if (v2 === 0) {
        s.phase = "rolled-back";
        s.finishedAt = at;
        events.push({ at, tone: "success", message: "Rolled back: every instance is on v1 again" });
      }
    }
  }
}

function tick(state: DeployState): StepResult<DeployState> {
  const s: DeployState = {
    ...state,
    instances: { ...state.instances },
    history: [...state.history],
    totals: { ...state.totals },
  };
  s.tick += 1;
  const at = s.tick;
  const events: SimEvent[] = [];
  advance(s, at, events);

  const downtime = at < s.downUntil;
  const v2Rate = v2Error(s.config);
  const errorRate = downtime ? 1 : (1 - s.v2Share) * BASELINE_ERROR + s.v2Share * v2Rate;
  const failed = DEMAND * errorRate;
  const v2Serving = !downtime && s.v2Share > 0;

  // Detection, only while the rollout is in progress or v2 is serving.
  const watching = s.phase === "deploying" || s.phase === "complete";
  if (watching && v2Serving && s.config.buggy) {
    if (s.errorsSince === null) s.errorsSince = at;
    if (s.config.autoRollback) {
      const breached =
        s.config.strategy === "canary" && s.v2Share < 1
          ? v2Rate - BASELINE_ERROR > CANARY_MARGIN
          : errorRate > ALARM_THRESHOLD;
      s.breaches = breached ? s.breaches + 1 : 0;
      if (s.breaches >= 2) {
        startRollback(
          s,
          at,
          events,
          s.config.strategy === "canary" && s.v2Share < 1
            ? `Canary analysis: v2 fails ${Math.round(v2Rate * 100)}% of requests against ${(BASELINE_ERROR * 100).toFixed(1)}% on v1`
            : `Alarm: error rate above ${ALARM_THRESHOLD * 100}% for 2 minutes`,
        );
      }
    } else if (at - s.errorsSince >= MANUAL_DETECTION_STEPS) {
      startRollback(s, at, events, "On-call engineer notices the errors");
    }
  }

  const instanceCount = s.instances.v1 + s.instances.v2;
  s.metrics = {
    errorRate,
    v1ErrorRate: BASELINE_ERROR,
    v2ErrorRate: v2Rate,
    failed,
    downtime,
  };
  s.history = [...s.history, { at, errorRate, v2Share: s.v2Share }].slice(-HISTORY_STEPS);
  s.totals = {
    failed: s.totals.failed + failed * 60,
    instanceMinutes: s.totals.instanceMinutes + instanceCount,
    peakErrorRate: Math.max(s.totals.peakErrorRate, errorRate),
  };
  return { state: s, events };
}

function describe(state: DeployState): string {
  const m = state.metrics;
  if (!m)
    return `Ready to ship v2 with a ${STRATEGY_LABEL[state.config.strategy].toLowerCase()} deployment. Press Play.`;
  const share = Math.round(state.v2Share * 100);
  const err = (m.errorRate * 100).toFixed(m.errorRate < 0.1 ? 1 : 0);
  const phase = {
    waiting: "Waiting to deploy.",
    deploying: `Deploying: v2 serves ${share}% of traffic.`,
    complete: "Rollout complete: v2 serves all traffic.",
    "rolling-back": "Rolling back to v1.",
    "rolled-back": "Rolled back: v1 serves all traffic.",
  }[state.phase];
  return m.downtime
    ? `${phase} Nothing is serving while instances restart — every request fails.`
    : `${phase} Error rate ${err}%.`;
}

export const deploymentModel: SimulationModel<DeployState, DeployConfig, DeployAction> = {
  id: "deployment-strategies",
  init(config) {
    return {
      tick: 0,
      config,
      phase: "waiting",
      v2Share: 0,
      instances: { v1: FLEET, v2: 0 },
      downUntil: 0,
      stageStart: 0,
      stage: 0,
      breaches: 0,
      errorsSince: null,
      metrics: null,
      history: [],
      totals: { failed: 0, instanceMinutes: 0, peakErrorRate: 0 },
      finishedAt: null,
    };
  },
  tick,
  apply(state) {
    return { state, events: [] };
  },
  describe,
};

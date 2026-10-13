/**
 * Autoscaling with a target tracking policy: keep average CPU utilisation near a target by adding
 * or removing instances. Each step is one minute.
 *
 * The policy follows the documented shape of Kubernetes' Horizontal Pod Autoscaler and EC2 Auto
 * Scaling target tracking: desired = ceil(current × utilisation ÷ target), no action within a 10%
 * tolerance, scale out immediately (counting instances still starting), and scale in only to the
 * highest recommendation seen within a stabilisation window.
 *
 * Illustrative numbers: one instance handles 100 requests/s at 100% CPU.
 */
import type { Rng } from "../rng";
import type { SimEvent, SimulationModel, StepResult } from "../types";

export const INSTANCE_CAPACITY = 100;
export const MIN_INSTANCES = 2;
export const MAX_INSTANCES = 30;
export const TOLERANCE = 0.1;
export const HISTORY_STEPS = 90;

export type Pattern = "ramp" | "spike" | "daily" | "bursty";
export type AutoscalingConfig = {
  pattern: Pattern;
  /** Target average CPU utilisation (0–1). */
  target: number;
  /** Minutes from launch until an instance serves traffic. */
  startup: number;
  /** Scale-in stabilisation window in minutes (0 = scale in on every evaluation). */
  scaleInWindow: number;
};

export const DEFAULT_AUTOSCALING_CONFIG: AutoscalingConfig = {
  pattern: "ramp",
  target: 0.6,
  startup: 3,
  scaleInWindow: 5,
};

export type AutoscalingState = {
  tick: number;
  config: AutoscalingConfig;
  inService: number;
  /** Launches in progress: the minute each starts serving. */
  launching: number[];
  /** Scale-in recommendations, newest last, for the stabilisation window. */
  recommendations: number[];
  metrics: {
    load: number;
    capacity: number;
    utilisation: number;
    served: number;
    failed: number;
    errorRate: number;
  } | null;
  history: { at: number; load: number; capacity: number; instances: number }[];
  totals: { requests: number; failed: number; instanceMinutes: number; scalingActions: number };
};

/** Users can add sudden load on top of the pattern. */
export type AutoscalingAction = { type: "surge" };

const SURGE_EXTRA = 800;
const SURGE_STEPS = 6;

/** Requests per second the pattern asks for at a given minute, before noise. */
export function baseLoad(pattern: Pattern, t: number): number {
  switch (pattern) {
    case "ramp":
      // Quiet, a steady climb to five times the traffic, a plateau, then back down.
      if (t < 10) return 300;
      if (t < 40) return 300 + ((t - 10) / 30) * 1200;
      if (t < 70) return 1500;
      if (t < 90) return 1500 - ((t - 70) / 20) * 1200;
      return 300;
    case "spike":
      return t >= 20 && t < 35 ? 1800 : 300;
    case "bursty":
      // Short bursts and lulls, three minutes each: the case scale-in stabilisation exists for.
      if (t < 10) return 300;
      return Math.floor((t - 10) / 3) % 2 === 0 ? 1200 : 500;
    case "daily":
      // A smooth daily-style wave, compressed into two hours.
      return 900 - 600 * Math.cos((2 * Math.PI * t) / 120);
  }
}

type Internal = AutoscalingState & { surgeUntil: number };

function tick(state: AutoscalingState, rng: Rng): StepResult<AutoscalingState> {
  const prev = state as Internal;
  const s: Internal = {
    ...prev,
    launching: [...prev.launching],
    recommendations: [...prev.recommendations],
    history: [...prev.history],
    totals: { ...prev.totals },
  };
  s.tick += 1;
  const at = s.tick;
  const events: SimEvent[] = [];
  const c = s.config;

  // Launches that finished starting begin serving.
  const ready = s.launching.filter((t) => t <= at).length;
  if (ready > 0) {
    s.inService += ready;
    s.launching = s.launching.filter((t) => t > at);
    events.push({
      at,
      tone: "success",
      message: `${ready} instance${ready === 1 ? "" : "s"} now serving (${s.inService} in service)`,
    });
  }

  const noise = 1 + (rng.next() - 0.5) * 0.06;
  const surge = at < (s.surgeUntil ?? 0) ? SURGE_EXTRA : 0;
  const load = Math.round(baseLoad(c.pattern, at) * noise + surge);
  const capacity = s.inService * INSTANCE_CAPACITY;
  const served = Math.min(load, capacity);
  const failed = load - served;
  const utilisation = capacity > 0 ? Math.min(1, load / capacity) : 1;
  // Demand-based utilisation can exceed 100% when overloaded; that is what the policy sees.
  const demandUtilisation = capacity > 0 ? load / capacity : Infinity;

  // Target tracking evaluation.
  const ratio = demandUtilisation / c.target;
  if (Math.abs(ratio - 1) > TOLERANCE) {
    const desired = Math.min(
      MAX_INSTANCES,
      Math.max(MIN_INSTANCES, Math.ceil(s.inService * ratio)),
    );
    const total = s.inService + s.launching.length;
    if (desired > total) {
      const add = desired - total;
      for (let i = 0; i < add; i++) s.launching.push(at + c.startup);
      s.totals.scalingActions += 1;
      events.push({
        at,
        tone: "info",
        message: `Utilisation ${Math.round(demandUtilisation * 100)}% vs target ${Math.round(c.target * 100)}%: launching ${add} instance${add === 1 ? "" : "s"} (ready in ${c.startup} min)`,
      });
    }
    s.recommendations = [...s.recommendations, desired];
  } else {
    s.recommendations = [...s.recommendations, s.inService];
  }
  const window = Math.max(1, c.scaleInWindow);
  s.recommendations = s.recommendations.slice(-window);

  // Scale in: never while instances are still starting, and only to the highest recent
  // recommendation, so a brief dip doesn't remove capacity that is needed a minute later.
  const highest = Math.max(...s.recommendations);
  if (s.launching.length === 0 && highest < s.inService) {
    const remove = s.inService - Math.max(MIN_INSTANCES, highest);
    if (remove > 0) {
      s.inService -= remove;
      s.totals.scalingActions += 1;
      events.push({
        at,
        tone: "info",
        message: `Scaling in: removed ${remove} instance${remove === 1 ? "" : "s"} (${s.inService} in service)`,
      });
    }
  }

  const errorRate = load > 0 ? failed / load : 0;
  const was = prev.metrics?.errorRate ?? 0;
  if (errorRate > 0.01 && was <= 0.01) {
    events.push({
      at,
      tone: "error",
      message: `Overloaded: ${Math.round(errorRate * 100)}% of requests failing while capacity catches up`,
    });
  } else if (errorRate <= 0.01 && was > 0.01) {
    events.push({ at, tone: "success", message: "Capacity caught up with demand" });
  }

  s.metrics = { load, capacity, utilisation, served, failed, errorRate };
  s.history = [...s.history, { at, load, capacity, instances: s.inService }].slice(-HISTORY_STEPS);
  s.totals = {
    ...s.totals,
    requests: s.totals.requests + load * 60,
    failed: s.totals.failed + failed * 60,
    instanceMinutes: s.totals.instanceMinutes + s.inService + s.launching.length,
  };
  return { state: s, events };
}

function apply(state: AutoscalingState, action: AutoscalingAction): StepResult<AutoscalingState> {
  const at = state.tick + 1;
  if (action.type === "surge") {
    return {
      state: { ...(state as Internal), surgeUntil: at + SURGE_STEPS } as AutoscalingState,
      events: [
        {
          at,
          tone: "warning",
          message: `Surge: +${SURGE_EXTRA} requests/s for ${SURGE_STEPS} minutes`,
        },
      ],
    };
  }
  return { state, events: [] };
}

function describe(state: AutoscalingState): string {
  const m = state.metrics;
  if (!m) return "Ready. Press Play to start the traffic pattern.";
  const pending = state.launching.length;
  const overload = m.failed > 0 ? ` ${Math.round(m.errorRate * 100)}% of requests failing.` : "";
  return `${Math.round(m.load).toLocaleString("en-US")} requests/s, ${state.inService} instances at ${Math.round(m.utilisation * 100)}% CPU${pending ? `, ${pending} starting` : ""}.${overload}`;
}

export const autoscalingModel: SimulationModel<
  AutoscalingState,
  AutoscalingConfig,
  AutoscalingAction
> = {
  id: "autoscaling",
  init(config) {
    const initial = Math.max(
      MIN_INSTANCES,
      Math.ceil(baseLoad(config.pattern, 0) / INSTANCE_CAPACITY / config.target),
    );
    const state: Internal = {
      tick: 0,
      config,
      inService: initial,
      launching: [],
      recommendations: [],
      metrics: null,
      history: [],
      totals: { requests: 0, failed: 0, instanceMinutes: 0, scalingActions: 0 },
      surgeUntil: 0,
    };
    return state;
  },
  tick,
  apply,
  describe,
};

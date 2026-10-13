/**
 * Regions and Availability Zones: where instances run decides which failures an application
 * survives. Each one-minute step routes a fixed demand to the healthy capacity in each region,
 * and records what was served and what failed.
 *
 * Illustrative numbers: 3,000 requests/s of demand, 500 requests/s per instance, five minutes to
 * launch a replacement, four minutes for DNS to move a region's users elsewhere.
 */
import type { SimEvent, SimulationModel, StepResult } from "../types";

export const DEMAND = 3000;
export const INSTANCE_CAPACITY = 500;
/** Instances needed to carry the demand with nothing to spare. */
export const REQUIRED = Math.ceil(DEMAND / INSTANCE_CAPACITY);
export const REPLACE_STEPS = 5;
export const FAILOVER_STEPS = 4;
export const HISTORY_STEPS = 60;

export type Layout = "single-zone" | "multi-zone" | "multi-region";
/** `lean`: exactly the capacity needed. `survive-failure`: enough to lose a zone (or a region). */
export type Headroom = "lean" | "survive-failure";

export type ZonesConfig = { layout: Layout; headroom: Headroom; autoRecover: boolean };

export const DEFAULT_ZONES_CONFIG: ZonesConfig = {
  layout: "multi-zone",
  headroom: "lean",
  autoRecover: true,
};

export type Zone = {
  id: string;
  healthy: boolean;
  /** Instances the plan places here. */
  base: number;
  /** Extra instances launched by auto-recovery. */
  extra: number;
  /** Launches in progress: the step each becomes ready. */
  launching: number[];
};

export type Region = {
  id: string;
  healthy: boolean;
  zones: Zone[];
};

export type ZonesMetrics = {
  demand: number;
  capacity: number;
  served: number;
  failed: number;
  errorRate: number;
  inService: number;
  launching: number;
  /** Share of demand each region receives, after any DNS failover. */
  shares: Record<string, number>;
};

export type ZonesState = {
  tick: number;
  config: ZonesConfig;
  regions: Region[];
  controlPlaneHealthy: boolean;
  /** A region whose users are being moved by DNS, and the step when that completes. */
  failover: { from: string; completeAt: number } | null;
  /** Regions whose users have been moved away. */
  drained: string[];
  metrics: ZonesMetrics | null;
  history: { at: number; errorRate: number; capacity: number }[];
  totals: { requests: number; failed: number; instanceMinutes: number };
};

export type ZonesAction =
  | { type: "fail-zone"; zone: string }
  | { type: "restore-zone"; zone: string }
  | { type: "fail-region"; region: string }
  | { type: "restore-region"; region: string }
  | { type: "impair-control-plane" }
  | { type: "restore-control-plane" };

/** How many instances each region runs, by layout and headroom. */
export function plannedInstances(config: ZonesConfig): number[] {
  const survive = config.headroom === "survive-failure";
  switch (config.layout) {
    case "single-zone":
      // Headroom here survives an instance failure, not a zone failure.
      return [survive ? Math.ceil(REQUIRED * 1.5) : REQUIRED];
    case "multi-zone":
      // Three zones: losing one leaves two thirds, so survive-failure provisions 50% extra.
      return [survive ? Math.ceil(REQUIRED * 1.5) : REQUIRED];
    case "multi-region":
      // Active-active, half the users each. Survive-failure sizes each region for all users.
      return survive ? [REQUIRED, REQUIRED] : [REQUIRED / 2, REQUIRED / 2];
  }
}

function buildRegions(config: ZonesConfig): Region[] {
  const regionIds = config.layout === "multi-region" ? ["A", "B"] : ["A"];
  const zoneCount = config.layout === "single-zone" ? 1 : 3;
  const planned = plannedInstances(config);
  return regionIds.map((id, r) => {
    const total = planned[r] ?? 0;
    return {
      id,
      healthy: true,
      zones: Array.from({ length: zoneCount }, (_, z) => ({
        id: `${id.toLowerCase()}${z + 1}`,
        healthy: true,
        base: Math.floor(total / zoneCount) + (z < total % zoneCount ? 1 : 0),
        extra: 0,
        launching: [],
      })),
    };
  });
}

const zoneServing = (z: Zone) => (z.healthy ? z.base + z.extra : 0);
const regionServing = (r: Region) =>
  r.healthy ? r.zones.reduce((n, z) => n + zoneServing(z), 0) : 0;
export const zoneLabel = (id: string) => `zone ${id}`;

function copy(state: ZonesState): ZonesState {
  return {
    ...state,
    regions: state.regions.map((r) => ({
      ...r,
      zones: r.zones.map((z) => ({ ...z, launching: [...z.launching] })),
    })),
    drained: [...state.drained],
    history: [...state.history],
    totals: { ...state.totals },
  };
}

/** Share of all users sent to each region: DNS moves a failed region's users after a delay. */
function shares(state: ZonesState): Record<string, number> {
  const live = state.regions.filter((r) => !state.drained.includes(r.id));
  const out: Record<string, number> = {};
  for (const r of state.regions) out[r.id] = 0;
  for (const r of live) out[r.id] = 1 / live.length;
  return out;
}

function tick(state: ZonesState): StepResult<ZonesState> {
  const s = copy(state);
  s.tick += 1;
  const at = s.tick;
  const events: SimEvent[] = [];

  // Finish launches.
  for (const r of s.regions) {
    for (const z of r.zones) {
      const ready = z.launching.filter((t) => t <= at).length;
      if (ready > 0) {
        z.launching = z.launching.filter((t) => t > at);
        if (z.healthy && r.healthy) {
          z.extra += ready;
          events.push({
            at,
            tone: "success",
            message: `${ready} replacement instance${ready === 1 ? "" : "s"} in service in ${zoneLabel(z.id)}`,
          });
        }
      }
    }
  }

  // DNS failover completes.
  if (s.failover && at >= s.failover.completeAt) {
    s.drained = [...s.drained, s.failover.from];
    events.push({
      at,
      tone: "info",
      message: `DNS failover complete: Region ${s.failover.from}'s users now go to the other region`,
    });
    s.failover = null;
  }

  const share = shares(s);
  let capacity = 0;
  let served = 0;
  for (const r of s.regions) {
    const load = DEMAND * (share[r.id] ?? 0);
    const cap = regionServing(r) * INSTANCE_CAPACITY;
    capacity += cap;
    served += Math.min(load, cap);

    // Auto-recovery: launch what the region needs, in its healthy zones, if the control plane works.
    const needed = Math.ceil(load / INSTANCE_CAPACITY);
    const have =
      regionServing(r) + r.zones.reduce((n, z) => n + (z.healthy ? z.launching.length : 0), 0);
    if (s.config.autoRecover && r.healthy && needed > have) {
      const healthy = r.zones.filter((z) => z.healthy);
      if (healthy.length > 0 && s.controlPlaneHealthy) {
        const missing = needed - have;
        for (let i = 0; i < missing; i++) {
          healthy[i % healthy.length]!.launching.push(at + REPLACE_STEPS);
        }
        events.push({
          at,
          tone: "info",
          message: `Auto-recovery: launching ${missing} instance${missing === 1 ? "" : "s"} in Region ${r.id} (ready in ${REPLACE_STEPS} min)`,
        });
      }
    }
  }

  // Scale extra capacity back in once zones recover and the region has more than it needs.
  for (const r of s.regions) {
    const load = DEMAND * (share[r.id] ?? 0);
    const planned = r.zones.reduce((n, z) => n + z.base, 0);
    const needed = Math.max(planned, Math.ceil(load / INSTANCE_CAPACITY));
    let surplus = regionServing(r) - needed;
    for (const z of r.zones) {
      while (surplus > 0 && z.extra > 0 && z.healthy) {
        z.extra -= 1;
        surplus -= 1;
      }
    }
  }

  const failed = DEMAND - served;
  const inService = s.regions.reduce((n, r) => n + regionServing(r), 0);
  const launching = s.regions.reduce(
    (n, r) => n + r.zones.reduce((m, z) => m + z.launching.length, 0),
    0,
  );
  const errorRate = failed / DEMAND;
  const previous = state.metrics?.errorRate ?? 0;
  if (errorRate > 0.001 && previous <= 0.001) {
    events.push({
      at,
      tone: "error",
      message: `${Math.round(errorRate * 100)}% of requests failing`,
    });
  } else if (errorRate <= 0.001 && previous > 0.001) {
    events.push({ at, tone: "success", message: "All requests served again" });
  }

  s.metrics = {
    demand: DEMAND,
    capacity,
    served,
    failed,
    errorRate,
    inService,
    launching,
    shares: share,
  };
  s.history = [...s.history, { at, errorRate, capacity }].slice(-HISTORY_STEPS);
  s.totals = {
    requests: s.totals.requests + DEMAND,
    failed: s.totals.failed + failed,
    instanceMinutes: s.totals.instanceMinutes + inService + launching,
  };
  return { state: s, events };
}

function apply(state: ZonesState, action: ZonesAction): StepResult<ZonesState> {
  const s = copy(state);
  const at = s.tick + 1;
  const events: SimEvent[] = [];
  const zone = (id: string) => s.regions.flatMap((r) => r.zones).find((z) => z.id === id);
  const region = (id: string) => s.regions.find((r) => r.id === id);

  switch (action.type) {
    case "fail-zone": {
      const z = zone(action.zone);
      if (!z || !z.healthy) break;
      z.healthy = false;
      z.launching = [];
      events.push({
        at,
        tone: "error",
        message: `${zoneLabel(z.id)} failed — its ${z.base + z.extra} instance${z.base + z.extra === 1 ? " is" : "s are"} unreachable`,
      });
      break;
    }
    case "restore-zone": {
      const z = zone(action.zone);
      if (!z || z.healthy) break;
      z.healthy = true;
      events.push({ at, tone: "success", message: `${zoneLabel(z.id)} recovered` });
      break;
    }
    case "fail-region": {
      const r = region(action.region);
      if (!r || !r.healthy) break;
      r.healthy = false;
      for (const z of r.zones) z.launching = [];
      const others = s.regions.filter((o) => o.id !== r.id && o.healthy);
      if (others.length > 0 && !s.drained.includes(r.id)) {
        s.failover = { from: r.id, completeAt: at + FAILOVER_STEPS };
        events.push({
          at,
          tone: "error",
          message: `Region ${r.id} is down — DNS health checks will move its users in about ${FAILOVER_STEPS} min`,
        });
      } else {
        events.push({
          at,
          tone: "error",
          message: `Region ${r.id} is down, and there is nowhere else to send users`,
        });
      }
      break;
    }
    case "restore-region": {
      const r = region(action.region);
      if (!r || r.healthy) break;
      r.healthy = true;
      if (s.failover?.from === r.id) s.failover = null;
      s.drained = s.drained.filter((id) => id !== r.id);
      events.push({
        at,
        tone: "success",
        message: `Region ${r.id} recovered and is taking its users back`,
      });
      break;
    }
    case "impair-control-plane":
      if (!s.controlPlaneHealthy) break;
      s.controlPlaneHealthy = false;
      events.push({
        at,
        tone: "warning",
        message: "The control plane is impaired: no new instances can be launched",
      });
      break;
    case "restore-control-plane":
      if (s.controlPlaneHealthy) break;
      s.controlPlaneHealthy = true;
      events.push({ at, tone: "success", message: "The control plane is working again" });
      break;
  }
  return { state: s, events };
}

function describe(state: ZonesState): string {
  const m = state.metrics;
  if (!m)
    return "Ready. Press Play to send users to the application, then fail a zone or a region.";
  const pct = Math.round(m.errorRate * 100);
  return pct === 0
    ? `All ${DEMAND.toLocaleString("en-US")} requests a second served by ${m.inService} instances.`
    : `${pct}% of requests failing: ${m.inService} instances can serve ${m.capacity.toLocaleString("en-US")} of ${DEMAND.toLocaleString("en-US")} requests a second${m.launching ? `, ${m.launching} more launching` : ""}.`;
}

export const zonesModel: SimulationModel<ZonesState, ZonesConfig, ZonesAction> = {
  id: "availability-zones",
  init(config) {
    return {
      tick: 0,
      config,
      regions: buildRegions(config),
      controlPlaneHealthy: true,
      failover: null,
      drained: [],
      metrics: null,
      history: [],
      totals: { requests: 0, failed: 0, instanceMinutes: 0 },
    };
  },
  tick,
  apply,
  describe,
};

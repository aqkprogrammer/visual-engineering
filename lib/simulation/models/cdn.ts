/**
 * Teaching model of a content delivery network: users in three regions, an origin in one of
 * them, and edge caches (with an optional origin shield) in between.
 *
 * Simplifications (shown to learners):
 * - One step is one second. Requests are counted as fractional amounts (a fluid model) over 50
 *   pages whose popularity falls off with rank (Zipf-like), the same in every region.
 * - Caches start warm, with pages cached at different times, so they expire at different times.
 *   When a cached page expires, it is fetched again in the next second, and the requests for it
 *   in that second wait for the one fetch (request collapsing).
 * - Network round-trip times are fixed, illustrative numbers. The origin answers in 50 ms.
 */
import type { Rng } from "../rng";
import type { SimEvent, SimulationModel, StepResult } from "../types";

export const REGIONS = ["europe", "americas", "asia"] as const;
export type Region = (typeof REGIONS)[number];
export const REGION_LABEL: Record<Region, string> = {
  europe: "Europe",
  americas: "Americas",
  asia: "Asia",
};
/** The origin and the shield are in the Americas. */
export const ORIGIN_REGION: Region = "americas";
export const PAGES = 50;
export const REQUESTS_PER_REGION = 300;
export const USER_TO_EDGE_MS = 20;
export const ORIGIN_MS = 50;
/** Round trip from each region's edge to the origin (and to the shield, which sits beside it). */
export const EDGE_TO_ORIGIN_MS: Record<Region, number> = { europe: 90, americas: 30, asia: 180 };
export const SHIELD_TO_ORIGIN_MS = 5;
export const TTL_OPTIONS = [10, 60, 600] as const;
export const SWR_SECONDS = 60;

export type CdnConfig = {
  cdn: boolean;
  ttl: number;
  staleWhileRevalidate: boolean;
  shield: boolean;
};
export const DEFAULT_CDN_CONFIG: CdnConfig = {
  cdn: true,
  ttl: 60,
  staleWhileRevalidate: false,
  shield: false,
};

/** Share of requests for each page: proportional to 1 / rank. */
export const POPULARITY: number[] = (() => {
  const raw = Array.from({ length: PAGES }, (_, i) => 1 / (i + 1));
  const sum = raw.reduce((a, b) => a + b, 0);
  return raw.map((r) => r / sum);
})();

type Entry = { storedAt: number; version: number } | null;

export type RegionMetrics = {
  requests: number;
  hits: number;
  latencyMs: number;
  /** Requests answered with an older version than the origin now has. */
  stale: number;
  /** Requests that had to wait for a fetch from the origin or the shield. */
  waited: number;
};

export type CdnState = {
  tick: number;
  config: CdnConfig;
  /** Current version of each page at the origin. */
  versions: number[];
  edges: Record<Region, Entry[]>;
  shield: Entry[];
  metrics: {
    regions: Record<Region, RegionMetrics>;
    originRequests: number;
  } | null;
  totals: { requests: number; hits: number; originRequests: number; stale: number };
};

export type CdnAction = { type: "publish" } | { type: "purge" };

const emptyCache = (): Entry[] => Array.from({ length: PAGES }, () => null);

/** A cache that has been running for a while: every page stored, at spread-out times. */
const warmCache = (ttl: number, salt: number): Entry[] =>
  Array.from({ length: PAGES }, (_, page) => ({
    storedAt: -((page * 37 + salt * 11) % ttl),
    version: 1,
  }));

function clone(s: CdnState): CdnState {
  return {
    ...s,
    config: { ...s.config },
    versions: [...s.versions],
    edges: Object.fromEntries(
      REGIONS.map((r) => [r, s.edges[r].map((e) => e && { ...e })]),
    ) as CdnState["edges"],
    shield: s.shield.map((e) => e && { ...e }),
    totals: { ...s.totals },
  };
}

type Lookup = "fresh" | "stale-usable" | "miss";
function lookup(entry: Entry, now: number, config: CdnConfig): Lookup {
  if (!entry) return "miss";
  const age = now - entry.storedAt;
  if (age < config.ttl) return "fresh";
  if (config.staleWhileRevalidate && age < config.ttl + SWR_SECONDS) return "stale-usable";
  return "miss";
}

function tick(state: CdnState, _rng: Rng): StepResult<CdnState> {
  const s = clone(state);
  s.tick += 1;
  const now = s.tick;
  let originRequests = 0;
  const regions = {} as Record<Region, RegionMetrics>;

  /** Fetches a page for an edge; returns the round-trip time beyond the edge and the version. */
  const fetchUpstream = (region: Region, page: number): { ms: number; version: number } => {
    const useShield = s.config.shield && region !== ORIGIN_REGION;
    if (!useShield) {
      originRequests += 1;
      return { ms: EDGE_TO_ORIGIN_MS[region] + ORIGIN_MS, version: s.versions[page]! };
    }
    const entry = s.shield[page]!;
    const found = lookup(entry, now, s.config);
    if (found === "fresh") return { ms: EDGE_TO_ORIGIN_MS[region], version: entry!.version };
    if (found === "stale-usable") {
      originRequests += 1; // background revalidation
      s.shield[page] = { storedAt: now, version: s.versions[page]! };
      return { ms: EDGE_TO_ORIGIN_MS[region], version: entry!.version };
    }
    originRequests += 1;
    s.shield[page] = { storedAt: now, version: s.versions[page]! };
    return {
      ms: EDGE_TO_ORIGIN_MS[region] + SHIELD_TO_ORIGIN_MS + ORIGIN_MS,
      version: s.versions[page]!,
    };
  };

  for (const region of REGIONS) {
    let hits = 0;
    let stale = 0;
    let waited = 0;
    let weightedMs = 0;
    const cache = s.edges[region];
    POPULARITY.forEach((share, page) => {
      const r = REQUESTS_PER_REGION * share;
      if (!s.config.cdn) {
        originRequests += r;
        waited += r;
        weightedMs += r * (USER_TO_EDGE_MS + EDGE_TO_ORIGIN_MS[region] + ORIGIN_MS);
        return;
      }
      const entry = cache[page]!;
      const found = lookup(entry, now, s.config);
      if (found === "fresh" || found === "stale-usable") {
        hits += r;
        weightedMs += r * USER_TO_EDGE_MS;
        if (entry!.version < s.versions[page]!) stale += r;
        if (found === "stale-usable") {
          const fetched = fetchUpstream(region, page);
          cache[page] = { storedAt: now, version: fetched.version };
        }
        return;
      }
      // A miss: one fetch, and every request for this page this second waits for it.
      // Rare pages are requested less than once a second, so only part of a fetch happens now.
      const fetched = fetchUpstream(region, page);
      cache[page] = { storedAt: now, version: fetched.version };
      const waiting = Math.min(r, 1);
      waited += waiting;
      hits += r - waiting;
      weightedMs += waiting * (USER_TO_EDGE_MS + fetched.ms) + (r - waiting) * USER_TO_EDGE_MS;
    });
    regions[region] = {
      requests: REQUESTS_PER_REGION,
      hits,
      latencyMs: weightedMs / REQUESTS_PER_REGION,
      stale,
      waited,
    };
    s.totals.requests += REQUESTS_PER_REGION;
    s.totals.hits += hits;
    s.totals.stale += stale;
  }
  s.metrics = { regions, originRequests };
  s.totals.originRequests += originRequests;
  return { state: s, events: [] };
}

function apply(state: CdnState, action: CdnAction): StepResult<CdnState> {
  const s = clone(state);
  const at = s.tick + 1;
  const events: SimEvent[] = [];
  if (action.type === "publish") {
    s.versions = s.versions.map((v) => v + 1);
    events.push({
      at,
      tone: "info",
      message: "New versions of every page published at the origin",
    });
  } else {
    for (const region of REGIONS) s.edges[region] = emptyCache();
    s.shield = emptyCache();
    events.push({
      at,
      tone: "warning",
      message: "Every cache purged: the next request for each page goes back to the origin",
    });
  }
  return { state: s, events };
}

export const cdnModel: SimulationModel<CdnState, CdnConfig, CdnAction> = {
  id: "cdn",
  init(config) {
    return {
      tick: 0,
      config,
      versions: Array(PAGES).fill(1),
      edges: Object.fromEntries(
        REGIONS.map((r, ri) => [r, warmCache(config.ttl, ri + 1)]),
      ) as CdnState["edges"],
      shield: warmCache(config.ttl, 7),
      metrics: null,
      totals: { requests: 0, hits: 0, originRequests: 0, stale: 0 },
    };
  },
  tick,
  apply,
  describe(s) {
    const m = s.metrics;
    if (!m) return "Press play to start sending requests.";
    const asia = m.regions.asia;
    const n = Math.round(m.originRequests);
    return `${s.tick} s: the origin receives ${n} request${n === 1 ? "" : "s"}/s; users in Asia wait ${Math.round(asia.latencyMs)} ms on average.`;
  },
};

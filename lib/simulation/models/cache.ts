/**
 * Teaching model of a cache-aside cache in front of a database.
 *
 * Simplifications (shown to learners):
 * - One request per tick, for one of eight keys (A–H). Hits cost 1 ms, misses 40 ms (illustrative).
 * - Every value has the same size, so capacity is counted in entries.
 * - LRU and LFU are exact here; production caches such as Redis approximate them by sampling.
 * - LFU counts every access since the entry was cached and never decays.
 * - Writes go straight to the database; the cache is only updated by reads (cache-aside).
 */
import type { Rng } from "../rng";
import type { SimEvent, SimulationModel, StepResult } from "../types";

export const KEYS = ["A", "B", "C", "D", "E", "F", "G", "H"] as const;
export type Key = (typeof KEYS)[number];

export const HIT_MS = 1;
export const MISS_MS = 40;
export const WINDOW = 40;

export type Policy = "lru" | "lfu" | "fifo";
export type Pattern = "hot-keys" | "uniform" | "scan";

/** Relative popularity for the hot-keys pattern: a few keys get most of the traffic. */
const HOT_WEIGHTS: Record<Key, number> = { A: 30, B: 20, C: 14, D: 10, E: 8, F: 7, G: 6, H: 5 };

export type CacheConfig = {
  policy: Policy;
  capacity: number;
  pattern: Pattern;
  /** Ticks an entry stays valid; 0 means no expiry. */
  ttl: number;
  /** Delete the cached entry whenever the database value is written. */
  invalidateOnWrite: boolean;
};

export const DEFAULT_CACHE_CONFIG: CacheConfig = {
  policy: "lru",
  capacity: 4,
  pattern: "hot-keys",
  ttl: 0,
  invalidateOnWrite: true,
};

export type Entry = {
  key: Key;
  /** Version of the value when it was cached. */
  version: number;
  insertedAt: number;
  lastUsed: number;
  uses: number;
  expiresAt: number | null;
};

export type Outcome = "hit" | "miss" | "stale-hit" | "expired";

export type CacheState = {
  tick: number;
  config: CacheConfig;
  entries: Entry[];
  /** The database: current version of each key. */
  db: Record<Key, number>;
  scanCursor: number;
  /** The request served in this tick. */
  current: { key: Key; outcome: Outcome; evicted: Key | null } | null;
  history: { at: number; key: Key; outcome: Outcome }[];
  totals: { hits: number; misses: number; stale: number };
};

export type CacheAction =
  | { type: "configure"; config: Partial<CacheConfig> }
  | { type: "write"; key: Key }
  | { type: "flush" };

const clone = <T>(value: T): T => structuredClone(value);

function nextKey(s: CacheState, rng: Rng): Key {
  switch (s.config.pattern) {
    case "scan": {
      const key = KEYS[s.scanCursor % KEYS.length]!;
      s.scanCursor += 1;
      return key;
    }
    case "uniform":
      return rng.pick(KEYS);
    case "hot-keys": {
      const total = KEYS.reduce((n, k) => n + HOT_WEIGHTS[k], 0);
      let roll = rng.next() * total;
      for (const key of KEYS) {
        roll -= HOT_WEIGHTS[key];
        if (roll < 0) return key;
      }
      return "H";
    }
  }
}

/** The entry a policy would evict next. */
export function victim(entries: Entry[], policy: Policy): Entry | undefined {
  const by = (score: (e: Entry) => number) =>
    entries.reduce<Entry | undefined>(
      (worst, e) => (!worst || score(e) < score(worst) ? e : worst),
      undefined,
    );
  switch (policy) {
    case "lru":
      return by((e) => e.lastUsed);
    case "fifo":
      return by((e) => e.insertedAt);
    case "lfu":
      // Ties broken by recency so the choice is deterministic and sensible.
      return by((e) => e.uses * 1e6 + e.lastUsed);
  }
}

export function hitRatio(state: CacheState): number | undefined {
  const recent = state.history.slice(-WINDOW);
  if (recent.length === 0) return undefined;
  return (
    recent.filter((h) => h.outcome === "hit" || h.outcome === "stale-hit").length / recent.length
  );
}

export function averageLatency(state: CacheState): number | undefined {
  const recent = state.history.slice(-WINDOW);
  if (recent.length === 0) return undefined;
  const ms = recent.reduce(
    (n, h) => n + (h.outcome === "hit" || h.outcome === "stale-hit" ? HIT_MS : MISS_MS),
    0,
  );
  return ms / recent.length;
}

function tick(state: CacheState, rng: Rng): StepResult<CacheState> {
  const s = clone(state);
  const events: SimEvent[] = [];
  s.tick += 1;
  const key = nextKey(s, rng);
  const entry = s.entries.find((e) => e.key === key);
  let outcome: Outcome;
  let evicted: Key | null = null;

  if (entry && entry.expiresAt !== null && s.tick >= entry.expiresAt) {
    // Expired: treat as a miss and refresh from the database.
    s.entries = s.entries.filter((e) => e !== entry);
    outcome = "expired";
  } else if (entry) {
    entry.lastUsed = s.tick;
    entry.uses += 1;
    outcome = entry.version < s.db[key] ? "stale-hit" : "hit";
    if (outcome === "stale-hit") {
      s.totals.stale += 1;
      events.push({
        at: s.tick,
        tone: "error",
        message: `Stale read: served ${key} v${entry.version} from cache, but the database has v${s.db[key]}`,
      });
    }
  } else {
    outcome = "miss";
  }

  if (outcome === "miss" || outcome === "expired") {
    s.totals.misses += 1;
    if (s.entries.length >= s.config.capacity) {
      const out = victim(s.entries, s.config.policy)!;
      s.entries = s.entries.filter((e) => e !== out);
      evicted = out.key;
    }
    s.entries.push({
      key,
      version: s.db[key],
      insertedAt: s.tick,
      lastUsed: s.tick,
      uses: 1,
      expiresAt: s.config.ttl > 0 ? s.tick + s.config.ttl : null,
    });
    if (outcome === "expired") {
      events.push({
        at: s.tick,
        tone: "info",
        message: `${key} had expired (TTL) — reloaded v${s.db[key]} from the database`,
      });
    }
  } else {
    s.totals.hits += 1;
  }

  s.current = { key, outcome, evicted };
  s.history.push({ at: s.tick, key, outcome });
  if (s.history.length > 120) s.history = s.history.slice(-120);
  return { state: s, events };
}

function apply(state: CacheState, action: CacheAction): StepResult<CacheState> {
  const s = clone(state);
  const events: SimEvent[] = [];
  const at = s.tick + 1;
  switch (action.type) {
    case "write": {
      s.db[action.key] += 1;
      const cached = s.entries.some((e) => e.key === action.key);
      if (s.config.invalidateOnWrite && cached) {
        s.entries = s.entries.filter((e) => e.key !== action.key);
        events.push({
          at,
          tone: "info",
          message: `Wrote ${action.key} v${s.db[action.key]} to the database and invalidated the cached copy`,
        });
      } else {
        events.push({
          at,
          tone: cached ? "warning" : "info",
          message: cached
            ? `Wrote ${action.key} v${s.db[action.key]} to the database — the cache still holds v${s.db[action.key] - 1}`
            : `Wrote ${action.key} v${s.db[action.key]} to the database (not cached)`,
        });
      }
      break;
    }
    case "flush":
      s.entries = [];
      events.push({ at, tone: "warning", message: "Cache flushed — every key will miss once" });
      break;
    case "configure": {
      const before = s.config;
      s.config = { ...s.config, ...action.config };
      if (before.policy !== s.config.policy)
        events.push({
          at,
          tone: "info",
          message: `Eviction policy: ${s.config.policy.toUpperCase()}`,
        });
      if (before.pattern !== s.config.pattern)
        events.push({ at, tone: "info", message: `Access pattern: ${s.config.pattern}` });
      if (before.ttl !== s.config.ttl) {
        events.push({
          at,
          tone: "info",
          message:
            s.config.ttl > 0
              ? `New entries expire after ${s.config.ttl} requests`
              : "Entries no longer expire",
        });
      }
      if (before.invalidateOnWrite !== s.config.invalidateOnWrite) {
        events.push({
          at,
          tone: s.config.invalidateOnWrite ? "info" : "warning",
          message: s.config.invalidateOnWrite
            ? "Writes now invalidate the cache"
            : "Writes no longer invalidate the cache",
        });
      }
      if (before.capacity !== s.config.capacity) {
        events.push({ at, tone: "info", message: `Capacity: ${s.config.capacity} entries` });
        while (s.entries.length > s.config.capacity) {
          const out = victim(s.entries, s.config.policy)!;
          s.entries = s.entries.filter((e) => e !== out);
        }
      }
      break;
    }
  }
  return { state: s, events };
}

export const cacheModel: SimulationModel<CacheState, CacheConfig, CacheAction> = {
  id: "cache",
  init(config) {
    return {
      tick: 0,
      config,
      entries: [],
      db: Object.fromEntries(KEYS.map((k) => [k, 1])) as Record<Key, number>,
      scanCursor: 0,
      current: null,
      history: [],
      totals: { hits: 0, misses: 0, stale: 0 },
    };
  },
  tick,
  apply,
  describe(state) {
    if (!state.current)
      return `Empty cache with room for ${state.config.capacity} entries. No requests yet.`;
    const { key, outcome, evicted } = state.current;
    const ratio = hitRatio(state);
    const what = {
      hit: `Request for ${key}: hit`,
      "stale-hit": `Request for ${key}: hit, but the value is stale`,
      miss: `Request for ${key}: miss, loaded from the database`,
      expired: `Request for ${key}: expired, reloaded from the database`,
    }[outcome];
    return [
      `${what}${evicted ? `, evicting ${evicted}` : ""}`,
      ratio === undefined
        ? ""
        : `hit ratio ${Math.round(ratio * 100)}% over the last ${Math.min(WINDOW, state.history.length)} requests`,
    ]
      .filter(Boolean)
      .join(" · ");
  },
};

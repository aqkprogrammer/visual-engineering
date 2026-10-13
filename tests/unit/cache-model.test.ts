import { describe, expect, it } from "vitest";
import {
  cacheModel,
  DEFAULT_CACHE_CONFIG,
  hitRatio,
  victim,
  type CacheAction,
  type CacheConfig,
  type Entry,
} from "@/lib/simulation/models/cache";
import { runSimulation } from "@/lib/simulation/run";
import type { ScheduledAction } from "@/lib/simulation/types";

const run = (
  config: Partial<CacheConfig> = {},
  actions: ScheduledAction<CacheAction>[] = [],
  ticks = 200,
) =>
  runSimulation(cacheModel, {
    params: { ...DEFAULT_CACHE_CONFIG, ...config },
    seed: 5,
    ticks,
    actions,
  });
const messages = (frames: { events: { message: string }[] }[]) =>
  frames.flatMap((f) => f.events.map((e) => e.message));

const entry = (key: Entry["key"], insertedAt: number, lastUsed: number, uses: number): Entry => ({
  key,
  version: 1,
  insertedAt,
  lastUsed,
  uses,
  expiresAt: null,
});

describe("eviction victims", () => {
  const entries = [entry("A", 1, 9, 5), entry("B", 2, 3, 9), entry("C", 3, 8, 1)];
  it("LRU evicts the least recently used", () => expect(victim(entries, "lru")!.key).toBe("B"));
  it("FIFO evicts the oldest insertion", () => expect(victim(entries, "fifo")!.key).toBe("A"));
  it("LFU evicts the least frequently used", () => expect(victim(entries, "lfu")!.key).toBe("C"));
});

describe("cache model", () => {
  it("is deterministic and never exceeds capacity", () => {
    const frames = run({ capacity: 3, pattern: "uniform" });
    expect(frames).toEqual(run({ capacity: 3, pattern: "uniform" }));
    for (const f of frames) expect(f.state.entries.length).toBeLessThanOrEqual(3);
  });

  it("a sequential scan larger than the cache never hits under LRU or FIFO", () => {
    for (const policy of ["lru", "fifo"] as const) {
      const end = run({ policy, pattern: "scan", capacity: 4 }).at(-1)!.state;
      expect(end.totals.hits, policy).toBe(0);
    }
  });

  it("hot keys hit more often when the cache holds them", () => {
    const small = hitRatio(run({ capacity: 2 }).at(-1)!.state)!;
    const large = hitRatio(run({ capacity: 6 }).at(-1)!.state)!;
    expect(large).toBeGreaterThan(small);
  });

  it("LFU beats LRU on hot keys mixed with occasional scans of cold keys", () => {
    // Alternate hot-key traffic with bursts of scanning to pollute an LRU cache.
    const actions: ScheduledAction<CacheAction>[] = [];
    for (let t = 20; t < 400; t += 40) {
      actions.push({ tick: t, action: { type: "configure", config: { pattern: "scan" } } });
      actions.push({ tick: t + 8, action: { type: "configure", config: { pattern: "hot-keys" } } });
    }
    const hits = (policy: CacheConfig["policy"]) =>
      runSimulation(cacheModel, {
        params: { ...DEFAULT_CACHE_CONFIG, policy },
        seed: 5,
        ticks: 400,
        actions,
      }).at(-1)!.state.totals.hits;
    expect(hits("lfu")).toBeGreaterThan(hits("lru"));
  });

  it("serves stale data after a write when invalidation is off, and not when it is on", () => {
    const writeA = (invalidateOnWrite: boolean) =>
      run({ invalidateOnWrite }, [{ tick: 60, action: { type: "write", key: "A" } }]);
    expect(writeA(false).at(-1)!.state.totals.stale).toBeGreaterThan(0);
    expect(writeA(true).at(-1)!.state.totals.stale).toBe(0);
    expect(messages(writeA(false)).some((m) => m.startsWith("Stale read: served A v1"))).toBe(true);
  });

  it("a TTL bounds how long stale data can be served", () => {
    const stale = (ttl: number) =>
      run(
        { invalidateOnWrite: false, ttl },
        [{ tick: 60, action: { type: "write", key: "A" } }],
        400,
      ).at(-1)!.state.totals.stale;
    expect(stale(10)).toBeLessThan(stale(0));
    expect(messages(run({ ttl: 10 })).some((m) => m.includes("had expired (TTL)"))).toBe(true);
  });

  it("shrinking capacity evicts down to the new size", () => {
    const frames = run({ capacity: 6 }, [
      { tick: 50, action: { type: "configure", config: { capacity: 2 } } },
    ]);
    expect(frames[50]!.state.entries.length).toBeLessThanOrEqual(2);
  });
});

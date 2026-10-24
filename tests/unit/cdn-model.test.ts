import { describe, expect, it } from "vitest";
import {
  cdnModel,
  DEFAULT_CDN_CONFIG,
  POPULARITY,
  REGIONS,
  type CdnAction,
  type CdnConfig,
} from "@/lib/simulation/models/cdn";
import { runSimulation } from "@/lib/simulation/run";
import type { ScheduledAction } from "@/lib/simulation/types";

const run = (
  config: Partial<CdnConfig> = {},
  actions: ScheduledAction<CdnAction>[] = [],
  ticks = 200,
) =>
  runSimulation(cdnModel, {
    params: { ...DEFAULT_CDN_CONFIG, ...config },
    seed: 1,
    ticks,
    actions,
  });
type Frames = ReturnType<typeof run>;
const avg = (frames: Frames, from: number, to: number, pick: (f: Frames[number]) => number) =>
  frames.slice(from, to).reduce((n, f) => n + pick(f), 0) / (to - from);
const origin = (f: Frames[number]) => f.state.metrics!.originRequests;
const asia = (f: Frames[number]) => f.state.metrics!.regions.asia.latencyMs;
const total = (f: Frames[number], key: "stale" | "waited") =>
  REGIONS.reduce((n, r) => n + f.state.metrics!.regions[r][key], 0);
const publish: ScheduledAction<CdnAction> = { tick: 100, action: { type: "publish" } };
const purge: ScheduledAction<CdnAction> = { tick: 150, action: { type: "purge" } };
const staleSeconds = (frames: Frames) =>
  frames.slice(101, 150).filter((f) => total(f, "stale") > 0.5).length;

describe("CDN model", () => {
  it("has popularity shares that add up to one, most popular first", () => {
    expect(POPULARITY.reduce((a, b) => a + b, 0)).toBeCloseTo(1, 10);
    expect(POPULARITY[0]).toBeGreaterThan(POPULARITY.at(-1)! * 10);
  });

  // The demo's "things to try", in order.
  it("without a CDN, Asia waits about 250 ms and the origin takes 900 requests a second", () => {
    const frames = run({ cdn: false });
    expect(avg(frames, 5, 100, asia)).toBeCloseTo(250, 0);
    expect(avg(frames, 5, 100, origin)).toBeCloseTo(900, 0);
  });

  it("with a CDN, about 20 ms and a few requests a second", () => {
    const frames = run();
    expect(avg(frames, 5, 100, asia)).toBeLessThan(22);
    expect(avg(frames, 5, 100, origin)).toBeLessThan(5);
  });

  it("after publishing, a 10-minute TTL serves old pages for the rest of the run; 10 s clears them within seconds", () => {
    expect(staleSeconds(run({ ttl: 600 }, [publish, purge]))).toBe(49);
    const short = staleSeconds(run({ ttl: 10 }, [publish, purge]));
    expect(short).toBeGreaterThan(0);
    expect(short).toBeLessThanOrEqual(10);
  });

  it("a 10 s TTL costs about six times the origin load of 60 s", () => {
    const ratio = avg(run({ ttl: 10 }), 5, 100, origin) / avg(run({ ttl: 60 }), 5, 100, origin);
    expect(ratio).toBeGreaterThan(5);
    expect(ratio).toBeLessThan(7);
  });

  it("stale-while-revalidate: nobody waits for the origin, at the same origin load", () => {
    const plain = run();
    const swr = run({ staleWhileRevalidate: true });
    expect(avg(plain, 5, 100, (f) => total(f, "waited"))).toBeGreaterThan(1);
    expect(avg(swr, 5, 100, (f) => total(f, "waited"))).toBe(0);
    expect(avg(swr, 5, 100, origin)).toBeCloseTo(avg(plain, 5, 100, origin), 5);
  });

  it("purging sends 150 requests to the origin in one second; a shield makes it 100", () => {
    const peak = (frames: Frames) => Math.max(...frames.slice(148, 155).map(origin));
    expect(peak(run({}, [purge]))).toBeCloseTo(150, 5);
    expect(peak(run({ shield: true }, [purge]))).toBeCloseTo(100, 5);
  });

  it("a shield also lowers everyday origin load", () => {
    expect(avg(run({ shield: true }), 5, 100, origin)).toBeLessThan(avg(run(), 5, 100, origin));
  });
});

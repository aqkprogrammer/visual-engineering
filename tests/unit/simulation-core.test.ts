import { describe, expect, it } from "vitest";
import { createRng } from "@/lib/simulation/rng";
import { runSimulation, walkthroughFrames } from "@/lib/simulation/run";
import type { SimulationModel } from "@/lib/simulation/types";

describe("createRng", () => {
  it("is deterministic for a seed and differs across seeds", () => {
    const a = createRng(42);
    const b = createRng(42);
    const c = createRng(43);
    const seqA = Array.from({ length: 5 }, () => a.next());
    expect(Array.from({ length: 5 }, () => b.next())).toEqual(seqA);
    expect(Array.from({ length: 5 }, () => c.next())).not.toEqual(seqA);
  });

  it("keeps values in range", () => {
    const rng = createRng(7);
    for (let i = 0; i < 2000; i++) {
      const f = rng.next();
      expect(f).toBeGreaterThanOrEqual(0);
      expect(f).toBeLessThan(1);
      const n = rng.int(3, 5);
      expect([3, 4, 5]).toContain(n);
    }
  });

  it("produces roughly the requested probability", () => {
    const rng = createRng(1);
    const hits = Array.from({ length: 10_000 }, () => rng.chance(0.2)).filter(Boolean).length;
    expect(hits / 10_000).toBeGreaterThan(0.18);
    expect(hits / 10_000).toBeLessThan(0.22);
  });
});

// A tiny counter model: each tick adds a random 0/1; "bump" adds 10.
type CounterState = { value: number };
const counter: SimulationModel<CounterState, { start: number }, { type: "bump" }> = {
  id: "counter",
  init: (p) => ({ value: p.start }),
  tick: (s, rng) => ({ state: { value: s.value + rng.int(0, 1) }, events: [] }),
  apply: (s) => ({ state: { value: s.value + 10 }, events: [{ at: 0, message: "bump" }] }),
  describe: (s) => `value ${s.value}`,
};

describe("runSimulation", () => {
  it("returns ticks + 1 frames, frame 0 being the initial state", () => {
    const frames = runSimulation(counter, { params: { start: 5 }, seed: 1, ticks: 10 });
    expect(frames).toHaveLength(11);
    expect(frames[0]!.state.value).toBe(5);
    expect(frames.map((f) => f.index)).toEqual([...Array(11).keys()]);
  });

  it("is reproducible", () => {
    const run = () => runSimulation(counter, { params: { start: 0 }, seed: 9, ticks: 50 });
    expect(run()).toEqual(run());
  });

  it("applies actions at their tick without changing earlier frames", () => {
    const base = runSimulation(counter, { params: { start: 0 }, seed: 3, ticks: 20 });
    const withAction = runSimulation(counter, {
      params: { start: 0 },
      seed: 3,
      ticks: 20,
      actions: [{ tick: 12, action: { type: "bump" } }],
    });
    expect(withAction.slice(0, 12)).toEqual(base.slice(0, 12));
    expect(withAction[12]!.state.value - base[12]!.state.value).toBe(10);
    expect(withAction[12]!.events.map((e) => e.message)).toContain("bump");
  });
});

describe("walkthroughFrames", () => {
  it("turns authored steps into indexed frames with titled captions", () => {
    const frames = walkthroughFrames([
      { title: "One", caption: "First.", state: 1 },
      { title: "Two", caption: "Second.", state: 2, events: [{ message: "hello" }] },
    ]);
    expect(frames[1]).toEqual({
      index: 1,
      state: 2,
      caption: "Two. Second.",
      events: [{ message: "hello", at: 1 }],
    });
  });
});

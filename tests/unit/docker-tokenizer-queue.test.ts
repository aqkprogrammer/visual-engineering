import { describe, expect, it } from "vitest";
import {
  buildSteps,
  INITIAL_FILES,
  plan,
  type BuildInput,
  type FileName,
} from "@/lib/simulation/models/docker";
import {
  BOUNDED_CAPACITY,
  capacityPerSecond,
  DEFAULT_QUEUE_CONFIG,
  oldestAgeTicks,
  queueModel,
  type QueueAction,
  type QueueConfig,
} from "@/lib/simulation/models/queue";
import { runSimulation } from "@/lib/simulation/run";
import type { ScheduledAction } from "@/lib/simulation/types";
import { tokenize, tokenizeWord, train } from "@/lib/simulation/models/tokenizer";

describe("Docker layer cache", () => {
  const first = (layout: BuildInput["layout"], dockerignore = false) => {
    const input: BuildInput = {
      layout,
      dockerignore,
      files: INITIAL_FILES,
      cache: [],
      registry: [],
      buildNumber: 1,
    };
    return { input, result: buildSteps(input) };
  };
  const rebuildAfterEdit = (layout: BuildInput["layout"], file: FileName, dockerignore = false) => {
    const { input, result } = first(layout, dockerignore);
    return plan({
      ...input,
      files: { ...input.files, [file]: 2 },
      cache: result.cache,
      registry: result.registry,
      buildNumber: 2,
    });
  };
  const status = (steps: ReturnType<typeof plan>) =>
    Object.fromEntries(steps.map((s) => [s.id, s.status]));

  it("builds everything the first time", () => {
    expect(first("dependencies-first").result.steps.length).toBeGreaterThan(0);
    expect(plan(first("dependencies-first").input).every((s) => s.status === "built")).toBe(true);
  });

  it("an unchanged rebuild is fully cached", () => {
    const { input, result } = first("dependencies-first");
    expect(plan({ ...input, cache: result.cache }).every((s) => s.status === "cached")).toBe(true);
  });

  it("dependencies-first: editing source code keeps the dependency install cached", () => {
    expect(status(rebuildAfterEdit("dependencies-first", "src/server.js"))).toMatchObject({
      deps: "cached",
      src: "built",
    });
  });

  it("copy-everything: editing source code forces a full dependency reinstall", () => {
    expect(status(rebuildAfterEdit("copy-everything", "src/server.js"))).toMatchObject({
      all: "built",
      deps: "built",
    });
  });

  it("a miss invalidates every later layer", () => {
    const steps = rebuildAfterEdit("dependencies-first", "package.json");
    const firstMiss = steps.findIndex((s) => s.status === "built");
    expect(steps.slice(firstMiss).every((s) => s.status === "built")).toBe(true);
    expect(steps.slice(firstMiss + 1)[0]!.reason).toMatch(/previous layer changed/);
  });

  it(".dockerignore keeps irrelevant files from busting the cache", () => {
    expect(status(rebuildAfterEdit("copy-everything", "README.md", false)).deps).toBe("built");
    expect(status(rebuildAfterEdit("copy-everything", "README.md", true)).deps).toBe("cached");
  });

  it("pushes only layers the registry doesn't already have", () => {
    const { input, result } = first("dependencies-first");
    const second = buildSteps({
      ...input,
      files: { ...input.files, "src/server.js": 2 },
      cache: result.cache,
      registry: result.registry,
      buildNumber: 2,
    });
    const push = second.steps.find((s) => s.state.phase === "push")!.state.pushed!;
    expect(push.uploaded).toHaveLength(1);
    expect(push.skipped.length).toBeGreaterThan(0);
  });
});

describe("toy BPE tokenizer", () => {
  const merges = train(undefined, 10);

  it("learns the classic first merges from Sennrich et al.'s example corpus", () => {
    expect(merges.slice(0, 5).map((m) => m.merged)).toEqual(["es", "est", "est_", "lo", "low"]);
    expect(merges[0]!.frequency).toBe(9);
  });

  it("is deterministic", () => {
    expect(train(undefined, 10)).toEqual(merges);
  });

  it("splits unseen words into known subwords", () => {
    expect(tokenizeWord("lowest", merges)).toEqual(["low", "est_"]);
  });

  it("uses fewer tokens as more merges are learned", () => {
    const count = (n: number) => tokenize("lowest newer widest", train(undefined, n)).length;
    expect(count(10)).toBeLessThan(count(3));
    expect(count(3)).toBeLessThan(count(0));
  });

  it("characters never seen in training get no id", () => {
    const unknown = tokenize("zebra", merges)
      .filter((t) => t.id === null)
      .map((t) => t.text);
    expect(unknown).toEqual(expect.arrayContaining(["z", "b", "a"]));
  });
});

describe("message queue", () => {
  const run = (
    config: Partial<QueueConfig> = {},
    actions: ScheduledAction<QueueAction>[] = [],
    ticks = 300,
  ) =>
    runSimulation(queueModel, {
      params: { ...DEFAULT_QUEUE_CONFIG, ...config },
      seed: 2,
      ticks,
      actions,
    });

  it("keeps the backlog small when capacity exceeds the arrival rate", () => {
    expect(capacityPerSecond(DEFAULT_QUEUE_CONFIG)).toBeGreaterThan(10);
    const end = run().at(-1)!.state;
    expect(end.queue.length).toBeLessThan(5);
  });

  it("builds a growing backlog when arrivals exceed capacity", () => {
    const frames = run({ rate: "spike" });
    expect(frames[300]!.state.queue.length).toBeGreaterThan(frames[100]!.state.queue.length);
    expect(oldestAgeTicks(frames[300]!.state)).toBeGreaterThan(oldestAgeTicks(frames[100]!.state));
  });

  it("a slow downstream dependency turns a healthy queue into a backlog", () => {
    const frames = run({}, [
      { tick: 100, action: { type: "configure", config: { slowDownstream: true } } },
    ]);
    expect(frames[300]!.state.queue.length).toBeGreaterThan(frames[99]!.state.queue.length + 50);
  });

  it("adding consumers drains the backlog", () => {
    const frames = run({ rate: "spike" }, [
      { tick: 150, action: { type: "configure", config: { consumers: 6 } } },
    ]);
    expect(frames[300]!.state.queue.length).toBeLessThan(frames[150]!.state.queue.length);
  });

  it("a bounded queue never exceeds its capacity and rejects instead", () => {
    const frames = run({ rate: "spike", bounded: true });
    for (const f of frames) expect(f.state.queue.length).toBeLessThanOrEqual(BOUNDED_CAPACITY);
    expect(frames.at(-1)!.state.totals.rejected).toBeGreaterThan(0);
  });

  it("poison messages end up in the dead-letter queue after the maximum receives", () => {
    const end = run({ poisonShare: 0.1 }).at(-1)!.state;
    expect(end.dlq.length).toBeGreaterThan(0);
    for (const m of end.dlq) expect(m.receives).toBe(3);
  });
});

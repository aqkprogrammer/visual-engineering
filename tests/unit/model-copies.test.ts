import { describe, expect, it } from "vitest";
import type { SimulationModel } from "@/lib/simulation/types";
import {
  btreeScenario,
  fingerprint,
  resolveScenario,
  runScenario,
  SCENARIOS,
} from "../support/model-scenarios";
import { runSimulation } from "@/lib/simulation/run";
import { build, INITIAL_KEYS, insert } from "@/lib/simulation/models/btree";

/**
 * Several models copy only the parts of their state a step changes, instead of deep-cloning it
 * all. These tests guard that optimisation: outputs must match fingerprints taken with the
 * original structuredClone implementation, and no step may modify a previous frame's state.
 */
const BASELINE: Record<string, string> = {
  "load balancer: crash, restart, scale, reconfigure": "8688321d7e8bda0b",
  "queue: spike, slow downstream, bounded, poison": "17d855409188784a",
  "rate limiter: token-bucket": "200661071698e415",
  "rate limiter: fixed-window": "aac1dd9bba33bab8",
  "rate limiter: sliding-log": "d4a9263359c9d74a",
  "rate limiter: sliding-counter": "ede6336aef388cae",
  "kubernetes: crashes, node failure, scaling": "6bd214c732cc514e",
};
const BTREE_BASELINE = "8191f5f593fda083";

function deepFreeze<T>(value: T): T {
  if (value && typeof value === "object" && !Object.isFrozen(value)) {
    Object.freeze(value);
    for (const child of Object.values(value)) deepFreeze(child);
  }
  return value;
}

/** Wraps a model so every state it receives is deeply frozen: any in-place mutation throws. */
function frozenInputs<S, P, A>(model: SimulationModel<S, P, A>): SimulationModel<S, P, A> {
  return {
    ...model,
    tick: (state, rng) => model.tick(deepFreeze(state), rng),
    apply: (state, action) => model.apply(deepFreeze(state), action),
  };
}

describe("optimised state copies", () => {
  it.each(SCENARIOS.map((s) => [s.name, s] as const))(
    "%s matches its baseline",
    (name, scenario) => {
      expect(fingerprint(runScenario(scenario))).toBe(BASELINE[name]);
    },
  );

  it.each(SCENARIOS.map((s) => [s.name, s] as const))(
    "%s never modifies a previous frame",
    (_, scenario) => {
      const resolved = resolveScenario(scenario);
      const frames = runSimulation(frozenInputs(resolved.model), {
        params: resolved.params,
        seed: 1,
        ticks: resolved.ticks,
        actions: resolved.actions,
      });
      expect(frames).toHaveLength(resolved.ticks + 1);
    },
  );

  it("B+ tree inserts match their baseline", () => {
    expect(fingerprint(btreeScenario())).toBe(BTREE_BASELINE);
  });

  it("B+ tree inserts never modify the previous tree", () => {
    let tree = deepFreeze(build(INITIAL_KEYS));
    for (const key of [5, 6, 8, 9, 10, 11, 13, 14, 99, 100, 101, 102]) {
      tree = deepFreeze(insert(tree, key).tree);
    }
    expect(Object.keys(tree.nodes).length).toBeGreaterThan(5);
  });
});

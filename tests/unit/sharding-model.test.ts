import { describe, expect, it } from "vitest";
import {
  assign,
  fnv1a,
  HOT_KEY,
  HOT_SHARE,
  idealMovedShare,
  imbalance,
  KEY_COUNT,
  KEYS,
  loads,
  movedShare,
  ringTokens,
  type ShardingParams,
} from "@/lib/simulation/models/sharding";

const config = (change: Partial<ShardingParams>): ShardingParams => ({
  strategy: "modulo",
  nodes: 4,
  vnodes: 1,
  workload: "uniform",
  ...change,
});

describe("sharding model", () => {
  it("hashes deterministically into 32 bits", () => {
    expect(fnv1a("user:0001")).toBe(fnv1a("user:0001"));
    expect(fnv1a("user:0001")).not.toBe(fnv1a("user:0002"));
    for (const key of KEYS) expect(fnv1a(key)).toBeLessThan(2 ** 32);
  });

  it("assigns every key to exactly one active node", () => {
    for (const strategy of ["modulo", "ring"] as const) {
      const owners = assign(config({ strategy, vnodes: 8, nodes: 5 }));
      expect(owners.size).toBe(KEY_COUNT);
      const total = loads(config({ strategy, vnodes: 8, nodes: 5 })).reduce(
        (n, l) => n + l.keys,
        0,
      );
      expect(total).toBe(KEY_COUNT);
    }
  });

  it("gives each node `vnodes` sorted ring positions", () => {
    const tokens = ringTokens(["node-a", "node-b"], 8);
    expect(tokens).toHaveLength(16);
    expect(tokens.map((t) => t.position)).toEqual(
      [...tokens.map((t) => t.position)].sort((a, b) => a - b),
    );
  });

  it("on a ring, adding a node only moves keys to the new node", () => {
    const before = assign(config({ strategy: "ring", vnodes: 8, nodes: 4 }));
    const after = assign(config({ strategy: "ring", vnodes: 8, nodes: 5 }));
    for (const key of KEYS) {
      if (before.get(key) !== after.get(key)) expect(after.get(key)).toBe("node-e");
    }
  });

  // The demo's "things to try", in order.
  it("hash mod N: adding a fifth node moves about 80% of keys, when an even split needs 20%", () => {
    const moved = movedShare(config({ nodes: 4 }), config({ nodes: 5 }));
    expect(moved).toBeGreaterThan(0.75);
    expect(moved).toBeLessThan(0.85);
    expect(idealMovedShare(4, 5)).toBeCloseTo(0.2);
  });

  it("one ring position per node: few keys move, but the busiest node holds about twice its share", () => {
    expect(
      movedShare(config({ strategy: "ring" }), config({ strategy: "ring", nodes: 5 })),
    ).toBeLessThan(0.2);
    const ratio = imbalance(loads(config({ strategy: "ring" })), "keys");
    expect(ratio).toBeGreaterThan(1.8);
    expect(ratio).toBeLessThan(2.4);
  });

  it("64 virtual nodes: about the even-split share moves, and the spread is even", () => {
    const params = config({ strategy: "ring", vnodes: 64 });
    const moved = movedShare(params, { ...params, nodes: 5 });
    expect(Math.abs(moved - 0.2)).toBeLessThan(0.03);
    expect(imbalance(loads(params), "keys")).toBeLessThan(1.25);
  });

  it("a hot key overloads its owner whatever the strategy", () => {
    for (const change of [
      {},
      { strategy: "ring" as const },
      { strategy: "ring" as const, vnodes: 64 },
    ]) {
      const l = loads(config({ ...change, workload: "hot-key" }));
      const owner = l.find((n) => n.hasHotKey)!;
      expect(owner.requestShare).toBeGreaterThan(1 / 3);
      expect(owner.requestShare).toBeGreaterThan(HOT_SHARE);
      expect(assign(config(change)).get(HOT_KEY)).toBe(owner.node);
    }
  });
});

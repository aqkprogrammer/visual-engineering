import { describe, expect, it } from "vitest";
import {
  build,
  emptyTree,
  height,
  INITIAL_KEYS,
  insert,
  insertSteps,
  leaves,
  MAX_KEYS,
  scaleEstimate,
  searchSteps,
  type BTree,
} from "@/lib/simulation/models/btree";

/** Structural invariants of a B+ tree. */
function checkInvariants(tree: BTree) {
  const leafDepths = new Set<number>();
  const visit = (id: number, depth: number, low: number, high: number) => {
    const node = tree.nodes[id]!;
    expect(node.keys.length).toBeLessThanOrEqual(MAX_KEYS);
    expect([...node.keys]).toEqual([...node.keys].sort((a, b) => a - b));
    for (const k of node.keys) {
      expect(k).toBeGreaterThanOrEqual(low);
      expect(k).toBeLessThan(high);
    }
    if (node.leaf) {
      leafDepths.add(depth);
      return;
    }
    expect(node.children).toHaveLength(node.keys.length + 1);
    node.children.forEach((child, i) =>
      visit(
        child,
        depth + 1,
        i === 0 ? low : node.keys[i - 1]!,
        i === node.keys.length ? high : node.keys[i]!,
      ),
    );
  };
  visit(tree.root, 1, -Infinity, Infinity);
  expect(leafDepths.size).toBe(1); // perfectly balanced
}

describe("B+ tree", () => {
  const tree = build(INITIAL_KEYS);

  it("keeps all keys, in order, across linked leaves", () => {
    expect(leaves(tree).flatMap((l) => l.keys)).toEqual([...INITIAL_KEYS].sort((a, b) => a - b));
  });

  it("stays balanced with bounded node sizes after every insert", () => {
    let t = emptyTree();
    for (const key of [...INITIAL_KEYS, 1, 2, 4, 5, 6, 99, 50]) {
      t = insert(t, key).tree;
      checkInvariants(t);
    }
  });

  it("ignores duplicate keys", () => {
    expect(insert(tree, 42).tree).toEqual(tree);
  });

  it("grows taller only through a root split", () => {
    const before = height(tree);
    let t = tree;
    let grew = false;
    for (let key = 1; key <= 30; key++) {
      const result = insert(t, key);
      if (height(result.tree) > height(t)) {
        grew = true;
        expect(result.log.at(-1)).toMatch(/root split/);
      }
      t = result.tree;
    }
    expect(grew).toBe(true);
    expect(height(t)).toBeGreaterThan(before);
  });
});

describe("search walkthrough", () => {
  const tree = build(INITIAL_KEYS);

  it("reads one page per level plus one heap page for a hit", () => {
    const steps = searchSteps(tree, INITIAL_KEYS, 55);
    const last = steps.at(-1)!.state;
    expect(last.found).toBe(true);
    expect(last.indexPagesRead).toBe(height(tree));
    expect(last.heapPage).toBe(Math.floor(INITIAL_KEYS.indexOf(55) / 3) + 1);
    expect(last.scanPages).toBe(5);
  });

  it("stops at the leaf when the key is missing", () => {
    const last = searchSteps(tree, INITIAL_KEYS, 50).at(-1)!.state;
    expect(last.found).toBe(false);
    expect(last.heapPage).toBeNull();
  });
});

describe("insert walkthrough", () => {
  it("reports splits and appends the row to the heap", () => {
    const tree = build(INITIAL_KEYS);
    const result = insertSteps(tree, INITIAL_KEYS, 13);
    expect(result.heap.at(-1)).toBe(13);
    expect(leaves(result.tree).flatMap((l) => l.keys)).toContain(13);
    const final = result.steps.at(-1)!;
    expect(final.state.found).toBe(true);
  });
});

describe("scale estimate", () => {
  it("shows an index needing a handful of reads for ten million rows", () => {
    expect(scaleEstimate(10_000_000)).toEqual({ heapPages: 100_000, indexReads: 4 });
  });
});

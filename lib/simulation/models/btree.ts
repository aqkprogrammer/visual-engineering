/**
 * A small, real B+ tree used to teach database indexes.
 *
 * Simplifications (shown to learners):
 * - Each node (page) holds at most 3 keys; real index pages hold hundreds.
 * - Keys are unique integers; leaves store the key and the heap page of its row.
 * - No concurrency control, deletion, or fill-factor tuning.
 * - Page reads are counted logically; there is no buffer cache, so every visited page counts.
 */
import type { WalkthroughStep } from "../run";

export const MAX_KEYS = 3;
export const ROWS_PER_HEAP_PAGE = 3;

export type BNode = {
  id: number;
  leaf: boolean;
  keys: number[];
  /** Child page ids (internal nodes only); always keys.length + 1 of them. */
  children: number[];
  /** Right sibling (leaves only). */
  next: number | null;
};

export type BTree = { nodes: Record<number, BNode>; root: number; nextId: number };

/** The table's rows in insertion order — a heap is not sorted by the indexed column. */
export type Heap = number[];

export const INITIAL_KEYS = [42, 7, 88, 23, 61, 15, 74, 3, 55, 31, 96, 48, 67, 12, 80];

export function emptyTree(): BTree {
  return {
    nodes: { 1: { id: 1, leaf: true, keys: [], children: [], next: null } },
    root: 1,
    nextId: 2,
  };
}

/** Index of the child to follow: the number of separator keys ≤ key. */
export function childIndex(node: BNode, key: number): number {
  let i = 0;
  while (i < node.keys.length && key >= node.keys[i]!) i++;
  return i;
}

type Split = { separator: number; right: number };

function insertInto(tree: BTree, nodeId: number, key: number, log: string[]): Split | null {
  // Copy-on-write: only pages on the insertion path are copied; the rest are shared.
  const original = tree.nodes[nodeId]!;
  const node: BNode = { ...original, keys: [...original.keys], children: [...original.children] };
  tree.nodes[nodeId] = node;
  if (node.leaf) {
    if (node.keys.includes(key)) return null;
    node.keys.push(key);
    node.keys.sort((a, b) => a - b);
    if (node.keys.length <= MAX_KEYS) return null;
    const right: BNode = {
      id: tree.nextId++,
      leaf: true,
      keys: node.keys.splice(2),
      children: [],
      next: node.next,
    };
    node.next = right.id;
    tree.nodes[right.id] = right;
    log.push(
      `Leaf page ${node.id} overflowed and split: [${node.keys.join(", ")}] | [${right.keys.join(", ")}] (new page ${right.id})`,
    );
    return { separator: right.keys[0]!, right: right.id };
  }
  const i = childIndex(node, key);
  const split = insertInto(tree, node.children[i]!, key, log);
  if (!split) return null;
  node.keys.splice(i, 0, split.separator);
  node.children.splice(i + 1, 0, split.right);
  if (node.keys.length <= MAX_KEYS) {
    log.push(`Separator ${split.separator} added to page ${node.id}`);
    return null;
  }
  const up = node.keys[2]!;
  const right: BNode = {
    id: tree.nextId++,
    leaf: false,
    keys: node.keys.splice(3),
    children: node.children.splice(3),
    next: null,
  };
  node.keys.splice(2, 1);
  tree.nodes[right.id] = right;
  log.push(
    `Internal page ${node.id} overflowed and split; ${up} moves up to the parent (new page ${right.id})`,
  );
  return { separator: up, right: right.id };
}

/** Inserts a key, returning the new tree and a description of any page splits. */
export function insert(tree: BTree, key: number): { tree: BTree; log: string[] } {
  const next: BTree = { ...tree, nodes: { ...tree.nodes } };
  const log: string[] = [];
  const split = insertInto(next, next.root, key, log);
  if (split) {
    const root: BNode = {
      id: next.nextId++,
      leaf: false,
      keys: [split.separator],
      children: [next.root, split.right],
      next: null,
    };
    next.nodes[root.id] = root;
    log.push(
      `The root split, so a new root page ${root.id} was created — the tree grew one level taller`,
    );
    next.root = root.id;
  }
  return { tree: next, log };
}

export function build(keys: number[]): BTree {
  return keys.reduce((tree, key) => insert(tree, key).tree, emptyTree());
}

export function height(tree: BTree): number {
  let h = 1;
  let node = tree.nodes[tree.root]!;
  while (!node.leaf) {
    node = tree.nodes[node.children[0]!]!;
    h++;
  }
  return h;
}

/** Leaves from left to right, following sibling links. */
export function leaves(tree: BTree): BNode[] {
  let node = tree.nodes[tree.root]!;
  while (!node.leaf) node = tree.nodes[node.children[0]!]!;
  const out: BNode[] = [node];
  while (node.next !== null) {
    node = tree.nodes[node.next]!;
    out.push(node);
  }
  return out;
}

export const heapPageOf = (heap: Heap, key: number) => {
  const index = heap.indexOf(key);
  return index < 0 ? null : Math.floor(index / ROWS_PER_HEAP_PAGE) + 1;
};
export const heapPageCount = (heap: Heap) =>
  Math.max(1, Math.ceil(heap.length / ROWS_PER_HEAP_PAGE));

// ---------------------------------------------------------------------------------------------
// Walkthroughs

export type IndexFrameState = {
  tree: BTree;
  heap: Heap;
  /** Pages on the current path (root → leaf). */
  path: number[];
  /** The page being examined in this step. */
  active: number | null;
  /** Key being searched or inserted. */
  key: number;
  indexPagesRead: number;
  /** Heap page read to fetch the row, if any. */
  heapPage: number | null;
  /** Pages a full table scan would read for the same query. */
  scanPages: number;
  found: boolean | null;
  operation: "search" | "insert";
};

function describeBranch(node: BNode, key: number): string {
  const i = childIndex(node, key);
  if (i === 0) return `${key} < ${node.keys[0]}, so follow the leftmost pointer`;
  if (i === node.keys.length)
    return `${key} ≥ ${node.keys.at(-1)}, so follow the rightmost pointer`;
  return `${node.keys[i - 1]} ≤ ${key} < ${node.keys[i]}, so follow pointer ${i + 1}`;
}

export function searchSteps(
  tree: BTree,
  heap: Heap,
  key: number,
): WalkthroughStep<IndexFrameState>[] {
  const base = { tree, heap, key, scanPages: heapPageCount(heap), operation: "search" as const };
  const steps: WalkthroughStep<IndexFrameState>[] = [];
  const path: number[] = [];
  let node = tree.nodes[tree.root]!;
  steps.push({
    title: `Look up ${key}`,
    caption: `Without an index the database would read all ${base.scanPages} heap pages and check every row. With the index it starts at the root page.`,
    state: { ...base, path: [], active: null, indexPagesRead: 0, heapPage: null, found: null },
  });
  while (!node.leaf) {
    path.push(node.id);
    steps.push({
      title: `Read page ${node.id}${node.id === tree.root ? " (root)" : ""}`,
      caption: `Separators [${node.keys.join(", ")}]: ${describeBranch(node, key)}.`,
      state: {
        ...base,
        path: [...path],
        active: node.id,
        indexPagesRead: path.length,
        heapPage: null,
        found: null,
      },
    });
    node = tree.nodes[node.children[childIndex(node, key)]!]!;
  }
  path.push(node.id);
  const found = node.keys.includes(key);
  steps.push({
    title: `Read leaf page ${node.id}`,
    caption: found
      ? `Leaf [${node.keys.join(", ")}] contains ${key} and a pointer to the row's location in the table.`
      : `Leaf [${node.keys.join(", ")}] does not contain ${key}, so no row matches — found after ${path.length} page reads instead of a full scan.`,
    state: {
      ...base,
      path: [...path],
      active: node.id,
      indexPagesRead: path.length,
      heapPage: null,
      found,
    },
    events: [
      {
        message: found ? `Index hit for ${key}` : `${key} is not in the index`,
        tone: found ? "success" : "warning",
      },
    ],
  });
  if (found) {
    const heapPage = heapPageOf(heap, key);
    steps.push({
      title: `Fetch the row from heap page ${heapPage}`,
      caption: `Total: ${path.length} index pages + 1 heap page = ${path.length + 1} reads, versus ${base.scanPages} for a full table scan.`,
      state: {
        ...base,
        path: [...path],
        active: null,
        indexPagesRead: path.length,
        heapPage,
        found,
      },
      events: [
        {
          message: `${path.length + 1} page reads with the index; ${base.scanPages} without`,
          tone: "success",
        },
      ],
    });
  }
  return steps;
}

export function insertSteps(
  tree: BTree,
  heap: Heap,
  key: number,
): { steps: WalkthroughStep<IndexFrameState>[]; tree: BTree; heap: Heap } {
  const newHeap = heap.includes(key) ? heap : [...heap, key];
  const search = searchSteps(tree, heap, key).filter(
    (s) => s.state.found === null || s.state.heapPage === null,
  );
  const descend = search.slice(0, -1).map((s, i) => ({
    ...s,
    title: i === 0 ? `Insert ${key}` : s.title,
    caption:
      i === 0
        ? `The row is appended to the table, then the index must find the leaf where ${key} belongs.`
        : s.caption,
    state: {
      ...s.state,
      operation: "insert" as const,
      heap: newHeap,
      scanPages: heapPageCount(newHeap),
    },
  }));
  const { tree: next, log } = insert(tree, key);
  const leafPath = searchSteps(next, newHeap, key)
    .filter((s) => s.state.active !== null)
    .map((s) => s.state.active!);
  const final: WalkthroughStep<IndexFrameState> = {
    title: log.length === 0 ? `Write ${key} into its leaf` : `Write ${key} — the leaf overflows`,
    caption:
      log.length === 0
        ? `The leaf had room, so ${key} is written in sorted position. One leaf page changes.`
        : `${log.join(". ")}. One logical insert changed ${log.length + 1} pages — this is the write cost of an index.`,
    state: {
      tree: next,
      heap: newHeap,
      path: leafPath,
      active: leafPath.at(-1) ?? null,
      key,
      indexPagesRead: leafPath.length,
      heapPage: null,
      scanPages: heapPageCount(newHeap),
      found: true,
      operation: "insert",
    },
    events:
      log.length === 0
        ? [{ message: `Inserted ${key} without a split`, tone: "success" }]
        : log.map((message) => ({ message, tone: "warning" as const })),
  };
  return { steps: [...descend, final], tree: next, heap: newHeap };
}

/** Rough page counts at production scale, for the "why it matters" comparison. Illustrative. */
export function scaleEstimate(rows: number, rowsPerPage = 100, fanout = 300) {
  const heapPages = Math.ceil(rows / rowsPerPage);
  const levels = Math.max(1, Math.ceil(Math.log(rows) / Math.log(fanout)));
  return { heapPages, indexReads: levels + 1 };
}

/**
 * Teaching model of sharding: assigning keys to nodes by hash modulo or by consistent hashing,
 * with or without virtual nodes, and what happens when a node is added or removed.
 *
 * Simplifications (shown to learners):
 * - Keys and node names are hashed with 32-bit FNV-1a plus a mixing step. Real systems use other hash functions
 *   (Cassandra uses Murmur3, for example), but the behaviour is the same.
 * - Every key is the same size and, unless a hot key is chosen, gets the same traffic.
 * - Moving a key is instantaneous; real rebalancing streams data and takes time.
 */

export const KEY_COUNT = 600;
export const NODE_NAMES = ["node-a", "node-b", "node-c", "node-d", "node-e", "node-f"] as const;
export const MIN_NODES = 2;
export const MAX_NODES = NODE_NAMES.length;
export const VNODE_OPTIONS = [1, 8, 64] as const;
/** Share of all requests that go to the hot key, when there is one. */
export const HOT_SHARE = 0.3;

export type Strategy = "modulo" | "ring";
export type Workload = "uniform" | "hot-key";

export type ShardingParams = {
  strategy: Strategy;
  nodes: number;
  /** Positions on the ring per node (consistent hashing only). */
  vnodes: number;
  workload: Workload;
};

export const DEFAULT_SHARDING_PARAMS: ShardingParams = {
  strategy: "modulo",
  nodes: 4,
  vnodes: 1,
  workload: "uniform",
};

const RING = 2 ** 32;

/** 32-bit FNV-1a with an extra mixing step: small, fast and deterministic, with good spread. */
export function fnv1a(text: string): number {
  let hash = 0x811c9dc5;
  for (let i = 0; i < text.length; i++) {
    hash ^= text.charCodeAt(i);
    hash = Math.imul(hash, 0x01000193) >>> 0;
  }
  // Final avalanche so similar strings spread around the whole ring.
  hash ^= hash >>> 16;
  hash = Math.imul(hash, 0x85ebca6b) >>> 0;
  hash ^= hash >>> 13;
  return hash >>> 0;
}

export const KEYS = Array.from(
  { length: KEY_COUNT },
  (_, i) => `user:${String(i + 1).padStart(4, "0")}`,
);
export const HOT_KEY = KEYS[41]!;

export type Token = { node: string; position: number };

/** Ring positions, sorted. Each node gets `vnodes` positions, hashed from "name#i". */
export function ringTokens(nodes: readonly string[], vnodes: number): Token[] {
  return nodes
    .flatMap((node) =>
      Array.from({ length: vnodes }, (_, i) => ({ node, position: fnv1a(`${node}#${i}`) })),
    )
    .sort((a, b) => a.position - b.position || a.node.localeCompare(b.node));
}

/** The first token clockwise from a position owns it. */
function ownerOnRing(tokens: Token[], position: number): string {
  let lo = 0;
  let hi = tokens.length;
  while (lo < hi) {
    const mid = (lo + hi) >> 1;
    if (tokens[mid]!.position < position) lo = mid + 1;
    else hi = mid;
  }
  return tokens[lo === tokens.length ? 0 : lo]!.node;
}

export const activeNodes = (count: number) => NODE_NAMES.slice(0, count);

/** Which node owns each key. */
export function assign(params: Omit<ShardingParams, "workload">): Map<string, string> {
  const nodes = activeNodes(params.nodes);
  const owners = new Map<string, string>();
  if (params.strategy === "modulo") {
    for (const key of KEYS) owners.set(key, nodes[fnv1a(key) % nodes.length]!);
  } else {
    const tokens = ringTokens(nodes, params.vnodes);
    for (const key of KEYS) owners.set(key, ownerOnRing(tokens, fnv1a(key)));
  }
  return owners;
}

export type NodeLoad = { node: string; keys: number; requestShare: number; hasHotKey: boolean };

export function loads(params: ShardingParams): NodeLoad[] {
  const owners = assign(params);
  const hot = params.workload === "hot-key";
  const perKey = (key: string) =>
    hot ? (key === HOT_KEY ? HOT_SHARE : (1 - HOT_SHARE) / (KEY_COUNT - 1)) : 1 / KEY_COUNT;
  return activeNodes(params.nodes).map((node) => {
    const keys = KEYS.filter((k) => owners.get(k) === node);
    return {
      node,
      keys: keys.length,
      requestShare: keys.reduce((sum, k) => sum + perKey(k), 0),
      hasHotKey: hot && owners.get(HOT_KEY) === node,
    };
  });
}

/** Share of keys whose owner differs between two configurations. */
export function movedShare(
  before: Omit<ShardingParams, "workload">,
  after: Omit<ShardingParams, "workload">,
) {
  const a = assign(before);
  const b = assign(after);
  return KEYS.filter((k) => a.get(k) !== b.get(k)).length / KEY_COUNT;
}

/** Share of keys that must move to keep an even split: the new node's fair share, or the departing node's. */
export const idealMovedShare = (from: number, to: number) =>
  Math.abs(to - from) / Math.max(from, to);

/** Busiest node's share of requests divided by an even share: 1 is perfectly balanced. */
export function imbalance(nodeLoads: NodeLoad[], measure: "keys" | "requests"): number {
  const values = nodeLoads.map((n) => (measure === "keys" ? n.keys / KEY_COUNT : n.requestShare));
  return Math.max(...values) * nodeLoads.length;
}

export const RING_SIZE = RING;

/**
 * Teaching model of consistency under a network partition: a "likes" counter replicated in three
 * regions, updated and read by users in two of them.
 *
 * Simplifications (shown to learners):
 * - One step is 100 ms. US users add 2 likes on even steps and European users 1 like on odd
 *   steps; everyone reads the count every step.
 * - Strong mode is a majority quorum: an update or read must reach 2 of the 3 replicas. Eventual
 *   modes answer from the local replica and copy changes to the others one step later.
 * - "Last writer wins" stores the count as a single number with a timestamp; "merge" stores a
 *   per-replica tally (a grow-only counter CRDT) and adds them up.
 * - Round trips are illustrative: 80 ms US–Europe, 120 ms US–Asia, 160 ms Europe–Asia.
 */
import type { Rng } from "../rng";
import type { SimEvent, SimulationModel, StepResult } from "../types";

export const STEP_MS = 100;
export const REPLICAS = ["us", "eu", "ap"] as const;
export type ReplicaId = (typeof REPLICAS)[number];
export const CLIENTS = ["us", "eu"] as const;
export type ClientId = (typeof CLIENTS)[number];
export const REPLICA_LABEL: Record<ReplicaId, string> = { us: "US", eu: "Europe", ap: "Asia" };
export const LOCAL_MS = 2;
export const RTT_MS: Record<string, number> = { "us-eu": 80, "us-ap": 120, "eu-ap": 160 };
export const rtt = (a: ReplicaId, b: ReplicaId) =>
  a === b ? 0 : (RTT_MS[`${a}-${b}`] ?? RTT_MS[`${b}-${a}`])!;

export type Mode = "strong" | "lww" | "merge";
/** Likes each region adds on its turn: US on even steps, Europe on odd steps. */
export const LIKES_PER_TURN: Record<ClientId, number> = { us: 2, eu: 1 };
const turn = (c: ClientId, tick: number) => (c === "us" ? tick % 2 === 0 : tick % 2 === 1);
export type ConsistencyConfig = { mode: Mode };
export const DEFAULT_CONSISTENCY_CONFIG: ConsistencyConfig = { mode: "strong" };

type Replica = {
  /** Last-writer-wins register. */
  lww: { value: number; stamp: number };
  /** Grow-only counter: likes counted at each replica. */
  tally: Record<ReplicaId, number>;
};

export type ClientResult = {
  /** Whether this step's update and read succeeded. */
  ok: boolean;
  /** Slowest of the update and the read, in ms; null if they failed. */
  latencyMs: number | null;
  /** The count this user saw. */
  seen: number | null;
};

export type ConsistencyState = {
  tick: number;
  config: ConsistencyConfig;
  /** Europe is cut off from the US and Asia. */
  partitioned: boolean;
  replicas: Record<ReplicaId, Replica>;
  /** Strong mode: the committed count every majority agrees on. */
  committed: number;
  /** Likes the system told users were saved. */
  acknowledged: number;
  failed: number;
  clients: Record<ClientId, ClientResult> | null;
};

export type ConsistencyAction = { type: "partition" } | { type: "heal" };

const reachable = (s: ConsistencyState, a: ReplicaId, b: ReplicaId) =>
  a === b || !s.partitioned || (a !== "eu" && b !== "eu");

/** What a replica currently says the count is. */
export function countAt(s: ConsistencyState, id: ReplicaId): number {
  if (s.config.mode === "strong") return s.committed;
  const r = s.replicas[id];
  return s.config.mode === "lww" ? r.lww.value : REPLICAS.reduce((n, k) => n + r.tally[k], 0);
}

/** Likes that were acknowledged but are missing from the count the replicas will settle on. */
export function lostLikes(s: ConsistencyState): number {
  const best = Math.max(...REPLICAS.map((id) => countAt(s, id)));
  return Math.max(0, s.acknowledged - best);
}

function clone(s: ConsistencyState): ConsistencyState {
  return {
    ...s,
    config: { ...s.config },
    replicas: Object.fromEntries(
      REPLICAS.map((id) => [
        id,
        { lww: { ...s.replicas[id].lww }, tally: { ...s.replicas[id].tally } },
      ]),
    ) as ConsistencyState["replicas"],
    clients: null,
  };
}

function tick(state: ConsistencyState, _rng: Rng): StepResult<ConsistencyState> {
  const s = clone(state);
  const events: SimEvent[] = [];
  s.tick += 1;
  const clients = {} as Record<ClientId, ClientResult>;

  for (const c of CLIENTS) {
    const writes = turn(c, s.tick) ? LIKES_PER_TURN[c] : 0;
    if (s.config.mode === "strong") {
      // A majority is this replica plus the nearest other one it can reach.
      const others = REPLICAS.filter((r) => r !== c && reachable(s, c, r)).map((r) => rtt(c, r));
      if (others.length === 0) {
        s.failed += writes > 0 ? writes : 0;
        clients[c] = { ok: false, latencyMs: null, seen: null };
        continue;
      }
      s.committed += writes;
      s.acknowledged += writes;
      clients[c] = { ok: true, latencyMs: LOCAL_MS + Math.min(...others), seen: s.committed };
    } else {
      // Eventual: update and read the local replica.
      const r = s.replicas[c];
      if (writes > 0) {
        if (s.config.mode === "lww") {
          // Read the count, add to it, write it back with a newer timestamp.
          r.lww = { value: r.lww.value + writes, stamp: s.tick * 10 + REPLICAS.indexOf(c) };
        } else {
          r.tally[c] += writes;
        }
        s.acknowledged += writes;
      }
      clients[c] = { ok: true, latencyMs: LOCAL_MS, seen: countAt(s, c) };
    }
  }

  // Strong reads happen after this step's updates, so every successful reader sees the same count.
  if (s.config.mode === "strong") {
    for (const c of CLIENTS) if (clients[c].ok) clients[c].seen = s.committed;
  }

  // Background replication: every replica sends its state to those it can reach.
  if (s.config.mode !== "strong") {
    const snapshot = clone(s);
    for (const to of REPLICAS) {
      for (const from of REPLICAS) {
        if (from === to || !reachable(s, from, to)) continue;
        const incoming = snapshot.replicas[from];
        const target = s.replicas[to];
        if (incoming.lww.stamp > target.lww.stamp) target.lww = { ...incoming.lww };
        for (const k of REPLICAS) target.tally[k] = Math.max(target.tally[k], incoming.tally[k]);
      }
    }
  }

  s.clients = clients;
  return { state: s, events };
}

function apply(state: ConsistencyState, action: ConsistencyAction): StepResult<ConsistencyState> {
  const s = clone(state);
  const at = s.tick + 1;
  if (action.type === "partition" && !s.partitioned) {
    s.partitioned = true;
    return {
      state: s,
      events: [
        {
          at,
          tone: "error",
          message: "Network partition: Europe can no longer reach the US or Asia",
        },
      ],
    };
  }
  if (action.type === "heal" && s.partitioned) {
    s.partitioned = false;
    return {
      state: s,
      events: [{ at, tone: "success", message: "Partition healed: the replicas can talk again" }],
    };
  }
  return { state: s, events: [] };
}

export const consistencyModel: SimulationModel<
  ConsistencyState,
  ConsistencyConfig,
  ConsistencyAction
> = {
  id: "consistency",
  init(config) {
    const replica = (): Replica => ({
      lww: { value: 0, stamp: 0 },
      tally: { us: 0, eu: 0, ap: 0 },
    });
    return {
      tick: 0,
      config,
      partitioned: false,
      replicas: { us: replica(), eu: replica(), ap: replica() },
      committed: 0,
      acknowledged: 0,
      failed: 0,
      clients: null,
    };
  },
  tick,
  apply,
  describe(s) {
    if (!s.clients)
      return "Press play: users in the US and Europe add likes and keep reading the count.";
    const eu = s.clients.eu;
    const missing = lostLikes(s);
    const tail = s.partitioned ? `${missing} not yet counted everywhere` : `${missing} lost`;
    return `${((s.tick * STEP_MS) / 1000).toFixed(1)} s: ${s.acknowledged} likes saved; the US sees ${countAt(s, "us")}, Europe ${eu.ok ? `sees ${countAt(s, "eu")}` : "gets an error"}; ${tail}.`;
  },
};

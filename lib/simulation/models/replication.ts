/**
 * Teaching model of leader-follower database replication. Many users write every step; one of
 * them saves their profile every second and keeps reading it back, while changes stream from the
 * leader to two followers.
 *
 * Simplifications (shown to learners):
 * - One step is 50 ms. Every step brings one write from some user; our user saves their profile
 *   every 20 steps and reads it back every step.
 * - Replication delay is a fixed number of steps per follower; real lag varies with load.
 * - Synchronous mode waits until db-2 has applied each change, like PostgreSQL with one
 *   synchronous standby and synchronous_commit = remote_apply.
 * - When the leader crashes, changes it had not yet sent are lost; failover takes 10 steps and
 *   promotes the most up-to-date follower. There is no split brain or old-leader rejoin.
 */
import type { Rng } from "../rng";
import type { SimEvent, SimulationModel, StepResult } from "../types";

export const STEP_MS = 50;
export const PROFILE_EVERY = 20;
export const FAILOVER_STEPS = 10;
export const LOCAL_COMMIT_MS = 5;
export const BASE_LAG = { "db-2": 1, "db-3": 3 } as const;
export const SLOW_LAG = 40;
/** Read-your-writes: after writing, read from the leader for this long. */
export const RYW_WINDOW = 10;

export type NodeId = "db-1" | "db-2" | "db-3";
export type Mode = "async" | "sync";
export type ReadRouting = "followers" | "leader" | "read-your-writes";

export type ReplicationConfig = { mode: Mode; reads: ReadRouting };
export const DEFAULT_REPLICATION_CONFIG: ReplicationConfig = { mode: "async", reads: "followers" };

export type DbNode = {
  id: NodeId;
  role: "leader" | "follower" | "down";
  /** Latest change applied on this node. */
  version: number;
  /** Steps a change takes to reach this follower. */
  lag: number;
  stopped: boolean;
  /** Changes on their way to this follower: version and arrival step. */
  inbox: { version: number; at: number }[];
};

export type ReplicationState = {
  tick: number;
  config: ReplicationConfig;
  nodes: DbNode[];
  /** Latest write acknowledged to its user. */
  acknowledged: number;
  nextVersion: number;
  /** Our user's latest saved profile: the version they were told was saved. */
  profileVersion: number;
  /** Our user's save that is still waiting to be acknowledged, if any. */
  profilePending: number | null;
  lastProfileTick: number;
  /** Synchronous writes waiting for db-2 to confirm. */
  waiting: { version: number; since: number }[];
  failoverUntil: number | null;
  read: { from: NodeId; version: number; stale: boolean } | null;
  lastWriteMs: number | null;
  totals: {
    writes: number;
    reads: number;
    staleReads: number;
    lostWrites: number;
    failedWrites: number;
  };
};

export type ReplicationAction =
  | { type: "crash-leader" }
  | { type: "slow-follower"; slow: boolean }
  | { type: "stop-follower"; stopped: boolean };

const clone = (s: ReplicationState): ReplicationState => ({
  ...s,
  config: { ...s.config },
  nodes: s.nodes.map((n) => ({ ...n, inbox: [...n.inbox] })),
  waiting: [...s.waiting],
  totals: { ...s.totals },
});

export const leaderOf = (s: ReplicationState) => s.nodes.find((n) => n.role === "leader");
export const followersOf = (s: ReplicationState) => s.nodes.filter((n) => n.role === "follower");

/** How far behind the leader each follower is, in steps' worth of changes. */
export function lagBehind(s: ReplicationState, node: DbNode): number {
  const leader = leaderOf(s);
  return leader ? Math.max(0, leader.version - node.version) : 0;
}

function send(s: ReplicationState, version: number) {
  for (const f of followersOf(s)) {
    if (!f.stopped) f.inbox.push({ version, at: s.tick + f.lag });
  }
}

function tick(state: ReplicationState, _rng: Rng): StepResult<ReplicationState> {
  const s = clone(state);
  const events: SimEvent[] = [];
  s.tick += 1;

  // Followers apply changes that have arrived, in order.
  for (const f of followersOf(s)) {
    if (f.stopped) continue;
    const arrived = f.inbox.filter((m) => m.at <= s.tick);
    for (const m of arrived) f.version = Math.max(f.version, m.version);
    f.inbox = f.inbox.filter((m) => m.at > s.tick);
  }

  // Failover completes: promote the most up-to-date follower.
  if (s.failoverUntil !== null && s.tick >= s.failoverUntil) {
    s.failoverUntil = null;
    const candidates = followersOf(s).filter((f) => !f.stopped);
    const best = [...candidates].sort((a, b) => b.version - a.version)[0];
    if (best) {
      best.role = "leader";
      best.inbox = [];
      // Versions are consecutive, one per write.
      const lostWrites = Math.max(0, s.acknowledged - best.version);
      if (lostWrites > 0) {
        s.totals.lostWrites += lostWrites;
        events.push({
          at: s.tick,
          tone: "error",
          message: `${best.id} promoted to leader — ${lostWrites} acknowledged write${lostWrites === 1 ? "" : "s"} it never received ${lostWrites === 1 ? "is" : "are"} lost`,
        });
      } else {
        events.push({
          at: s.tick,
          tone: "success",
          message: `${best.id} promoted to leader with every acknowledged write`,
        });
      }
      s.acknowledged = Math.min(s.acknowledged, best.version);
      s.profileVersion = Math.min(s.profileVersion, best.version);
      s.profilePending = null;
      s.nextVersion = best.version + 1;
      s.waiting = [];
      // The other follower catches up from the new leader.
      for (const f of followersOf(s)) {
        f.version = Math.min(f.version, best.version);
        f.inbox = [];
        for (let v = f.version + 1; v <= best.version; v++)
          f.inbox.push({ version: v, at: s.tick + f.lag });
      }
    }
  }

  const leader = leaderOf(s);

  // Synchronous writes are acknowledged once db-2 has them.
  if (s.config.mode === "sync" && leader) {
    const syncFollower = s.nodes.find((n) => n.id === "db-2" && n.role === "follower");
    s.waiting = s.waiting.filter((w) => {
      if (syncFollower && syncFollower.version >= w.version) {
        s.acknowledged = Math.max(s.acknowledged, w.version);
        s.lastWriteMs = (s.tick - w.since) * STEP_MS + LOCAL_COMMIT_MS;
        return false;
      }
      return true;
    });
  }

  // Every step, some user writes. Every PROFILE_EVERY steps, it is our user saving their profile.
  const isProfile = s.tick % PROFILE_EVERY === 0;
  if (!leader) {
    s.totals.failedWrites += 1;
  } else {
    const version = s.nextVersion++;
    leader.version = version;
    s.totals.writes += 1;
    send(s, version);
    if (isProfile) {
      s.lastProfileTick = s.tick;
      s.profilePending = version;
    }
    const syncTarget = s.nodes.find((n) => n.id === "db-2" && n.role === "follower");
    if (s.config.mode === "async" || !syncTarget) {
      s.acknowledged = version;
      s.lastWriteMs = LOCAL_COMMIT_MS;
    } else {
      s.waiting.push({ version, since: s.tick });
      if (s.waiting.length === 20) {
        events.push({
          at: s.tick,
          tone: "warning",
          message: "Writes are waiting for db-2 to confirm — none of them has been saved",
        });
      }
    }
  }
  if (s.profilePending !== null && s.acknowledged >= s.profilePending) {
    s.profileVersion = s.profilePending;
    s.profilePending = null;
  }

  // The user reads their profile back.
  const followers = followersOf(s).filter((f) => !f.stopped);
  const recentlyWrote = s.tick - s.lastProfileTick <= RYW_WINDOW;
  let target: DbNode | undefined;
  if (s.config.reads === "leader" || (s.config.reads === "read-your-writes" && recentlyWrote))
    target = leader;
  else target = followers.length > 0 ? followers[s.tick % followers.length] : leader;
  if (target) {
    const stale = target.version < s.profileVersion;
    s.read = { from: target.id, version: target.version, stale };
    s.totals.reads += 1;
    if (stale) s.totals.staleReads += 1;
  } else {
    s.read = null;
  }
  return { state: s, events };
}

function apply(state: ReplicationState, action: ReplicationAction): StepResult<ReplicationState> {
  const s = clone(state);
  const events: SimEvent[] = [];
  const at = s.tick + 1;
  switch (action.type) {
    case "crash-leader": {
      const leader = leaderOf(s);
      if (!leader || s.failoverUntil !== null) break;
      leader.role = "down";
      // Changes still on their way were never sent: they are gone with the leader.
      for (const f of followersOf(s)) f.inbox = [];
      s.waiting = [];
      s.failoverUntil = s.tick + FAILOVER_STEPS;
      events.push({
        at,
        tone: "error",
        message: `${leader.id} (the leader) crashed — writes fail until a follower is promoted`,
      });
      break;
    }
    case "slow-follower": {
      const f = s.nodes.find((n) => n.id === "db-3")!;
      f.lag = action.slow ? SLOW_LAG : BASE_LAG["db-3"];
      events.push({
        at,
        tone: action.slow ? "warning" : "info",
        message: action.slow
          ? `db-3 slowed down: changes take ${(SLOW_LAG * STEP_MS) / 1000} s to reach it`
          : "db-3 back to normal speed",
      });
      break;
    }
    case "stop-follower": {
      const f = s.nodes.find((n) => n.id === "db-2")!;
      if (f.role !== "follower") break;
      f.stopped = action.stopped;
      if (!action.stopped) {
        // Catch up on everything missed.
        const leader = leaderOf(s);
        if (leader)
          for (let v = f.version + 1; v <= leader.version; v++)
            f.inbox.push({ version: v, at: s.tick + f.lag });
      }
      events.push({
        at,
        tone: action.stopped ? "warning" : "info",
        message: action.stopped
          ? "db-2 stopped — it receives no changes"
          : "db-2 restarted and is catching up",
      });
      break;
    }
  }
  return { state: s, events };
}

export const replicationModel: SimulationModel<
  ReplicationState,
  ReplicationConfig,
  ReplicationAction
> = {
  id: "replication",
  init(config) {
    return {
      tick: 0,
      config,
      nodes: [
        { id: "db-1", role: "leader", version: 0, lag: 0, stopped: false, inbox: [] },
        {
          id: "db-2",
          role: "follower",
          version: 0,
          lag: BASE_LAG["db-2"],
          stopped: false,
          inbox: [],
        },
        {
          id: "db-3",
          role: "follower",
          version: 0,
          lag: BASE_LAG["db-3"],
          stopped: false,
          inbox: [],
        },
      ],
      acknowledged: 0,
      nextVersion: 1,
      profileVersion: 0,
      profilePending: null,
      lastProfileTick: -RYW_WINDOW - 1,
      waiting: [],
      failoverUntil: null,
      read: null,
      lastWriteMs: null,
      totals: { writes: 0, reads: 0, staleReads: 0, lostWrites: 0, failedWrites: 0 },
    };
  },
  tick,
  apply,
  describe(s) {
    const leader = leaderOf(s);
    if (!leader) return `Step ${s.tick}: no leader — failover in progress, writes fail.`;
    const read = s.read
      ? `the last read came from ${s.read.from} and ${s.read.stale ? `missed the latest profile save` : "was up to date"}`
      : "no read";
    return `Step ${s.tick}: ${leader.id} leads at version ${leader.version}; ${read}.`;
  },
};

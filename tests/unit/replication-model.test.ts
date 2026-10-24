import { describe, expect, it } from "vitest";
import {
  LOCAL_COMMIT_MS,
  replicationModel,
  type ReplicationAction,
  type ReplicationConfig,
} from "@/lib/simulation/models/replication";
import { runSimulation } from "@/lib/simulation/run";
import type { ScheduledAction } from "@/lib/simulation/types";

const run = (
  config: Partial<ReplicationConfig> = {},
  actions: ScheduledAction<ReplicationAction>[] = [],
  ticks = 200,
) =>
  runSimulation(replicationModel, {
    params: { mode: "async", reads: "followers", ...config },
    seed: 1,
    ticks,
    actions,
  });
const last = (frames: ReturnType<typeof run>) => frames.at(-1)!.state;
const staleShare = (frames: ReturnType<typeof run>) => {
  const t = last(frames).totals;
  return t.staleReads / t.reads;
};
const slow: ScheduledAction<ReplicationAction> = {
  tick: 1,
  action: { type: "slow-follower", slow: true },
};
const crash: ScheduledAction<ReplicationAction> = { tick: 101, action: { type: "crash-leader" } };

describe("replication model", () => {
  it("writes to the leader and lets followers catch up", () => {
    const s = last(run());
    const leader = s.nodes.find((n) => n.role === "leader")!;
    expect(leader.version).toBe(200);
    for (const f of s.nodes.filter((n) => n.role === "follower")) {
      expect(f.version).toBeLessThanOrEqual(leader.version);
      expect(leader.version - f.version).toBeLessThanOrEqual(3);
    }
  });

  // The demo's "things to try", in order.
  it("reads from followers miss the user's save about one time in ten; a slow follower makes it about half", () => {
    expect(staleShare(run())).toBeGreaterThan(0.05);
    expect(staleShare(run())).toBeLessThan(0.15);
    expect(staleShare(run({}, [slow]))).toBeGreaterThan(0.4);
    expect(staleShare(run({}, [slow]))).toBeLessThan(0.6);
  });

  it("read-your-writes removes stale reads until lag outgrows its window", () => {
    expect(last(run({ reads: "read-your-writes" })).totals.staleReads).toBe(0);
    expect(last(run({ reads: "read-your-writes" }, [slow])).totals.staleReads).toBeGreaterThan(0);
    expect(last(run({ reads: "leader" }, [slow])).totals.staleReads).toBe(0);
  });

  it("asynchronous: crashing the leader loses an acknowledged write and refuses writes during failover", () => {
    const frames = run({}, [crash]);
    const s = last(frames);
    expect(s.totals.lostWrites).toBeGreaterThan(0);
    expect(s.totals.failedWrites).toBeGreaterThan(0);
    expect(s.nodes.find((n) => n.id === "db-1")!.role).toBe("down");
    expect(s.nodes.find((n) => n.role === "leader")!.id).toBe("db-2");
    expect(
      frames.flatMap((f) => f.events).some((e) => /acknowledged write.*lost/.test(e.message)),
    ).toBe(true);
  });

  it("synchronous: nothing is lost, but writes take 55 ms instead of 5", () => {
    expect(last(run({ mode: "sync" }, [crash])).totals.lostWrites).toBe(0);
    const asyncLatency = Math.max(...run().map((f) => f.state.lastWriteMs ?? 0));
    const syncLatency = Math.max(...run({ mode: "sync" }).map((f) => f.state.lastWriteMs ?? 0));
    expect(asyncLatency).toBe(LOCAL_COMMIT_MS);
    expect(syncLatency).toBe(55);
  });

  it("synchronous: stopping db-2 stops writes being saved", () => {
    const s = last(
      run({ mode: "sync" }, [{ tick: 30, action: { type: "stop-follower", stopped: true } }]),
    );
    expect(s.waiting.length).toBeGreaterThan(100);
    expect(s.acknowledged).toBeLessThan(35);
  });

  it("never acknowledges more than the leader has", () => {
    for (const mode of ["async", "sync"] as const) {
      for (const f of run({ mode }, [crash])) {
        const leader = f.state.nodes.find((n) => n.role === "leader");
        if (leader) expect(f.state.acknowledged).toBeLessThanOrEqual(leader.version);
      }
    }
  });
});

"use client";

import { Pause, Play, RotateCcw, Snail, Zap } from "lucide-react";
import { useMemo, useState } from "react";
import {
  BASE_LAG,
  DEFAULT_REPLICATION_CONFIG,
  FAILOVER_STEPS,
  LOCAL_COMMIT_MS,
  PROFILE_EVERY,
  replicationModel,
  RYW_WINDOW,
  SLOW_LAG,
  STEP_MS,
  type Mode,
  type ReadRouting,
  type ReplicationAction,
  type ReplicationConfig,
} from "@/lib/simulation/models/replication";
import { runSimulation } from "@/lib/simulation/run";
import { ActionButton, SegmentedControl, Stat } from "../../player/controls";
import { SimulationPlayer } from "../../player/simulation-player";
import { useActionLog } from "../../player/use-action-log";
import { usePlayback } from "../../player/use-playback";
import { ReplicationScene } from "./replication-scene";

const BASE_TICKS = 200;

export const REPLICATION_ASSUMPTIONS = [
  `Each step is ${STEP_MS} ms. Some user writes every step; our user saves their profile every ${PROFILE_EVERY} steps (${(PROFILE_EVERY * STEP_MS) / 1000} s) and reads it back every step.`,
  `Changes take ${BASE_LAG["db-2"]} step to reach db-2 and ${BASE_LAG["db-3"]} steps to reach db-3 (${SLOW_LAG} when db-3 is slowed). A write is saved on the leader in ${LOCAL_COMMIT_MS} ms; synchronous mode also waits until db-2 has applied it, like PostgreSQL with one synchronous standby and synchronous_commit = remote_apply.`,
  `Reads from followers alternate between them. Read-your-writes sends reads to the leader for ${RYW_WINDOW} steps after the user saves.`,
  `If the leader crashes, changes it had not yet sent are lost. Failover takes ${FAILOVER_STEPS} steps and promotes the most up-to-date running follower; the old leader doesn't come back.`,
];

const pct = (n: number) => `${Math.round(n * 100)}%`;

export function ReplicationSimulation() {
  const [config, setConfig] = useState<ReplicationConfig>(DEFAULT_REPLICATION_CONFIG);
  const log = useActionLog<ReplicationAction>();
  const ticks = Math.max(BASE_TICKS, (log.actions.at(-1)?.tick ?? 0) + 60);
  const frames = useMemo(
    () => runSimulation(replicationModel, { params: config, seed: 1, ticks, actions: log.actions }),
    [config, ticks, log.actions],
  );
  const playback = usePlayback({ frameCount: frames.length, frameMs: 150 });
  const state = frames[Math.min(playback.frame, frames.length - 1)]!.state;
  const db2 = state.nodes.find((n) => n.id === "db-2")!;
  const db3 = state.nodes.find((n) => n.id === "db-3")!;

  const restart = () => {
    log.reset();
    playback.pause();
    playback.seek(0);
  };
  const configure = (change: Partial<ReplicationConfig>) => {
    setConfig((c) => ({ ...c, ...change }));
    restart();
  };
  const act = (action: ReplicationAction) => {
    log.add(playback.frame + 1, action);
    if (!playback.playing) playback.seek(playback.frame + 1);
  };

  return (
    <SimulationPlayer
      kind="simulation"
      title="Leader-follower replication"
      description="A leader database streams every change to two followers. One user keeps saving their profile and reading it back; reads that miss the user's latest save are marked stale. The leader can crash, a follower can be slowed or stopped, and writes can be asynchronous or wait for one follower."
      frames={frames}
      playback={playback}
      aspectRatio="760 / 360"
      scene={(f) => <ReplicationScene state={f.state} />}
      positionLabel={(f) => `${((f.index * STEP_MS) / 1000).toFixed(2)} s`}
      eventTime={(at) => `${((at * STEP_MS) / 1000).toFixed(2)} s`}
      assumptions={REPLICATION_ASSUMPTIONS}
      stats={(f) => {
        const t = f.state.totals;
        return (
          <dl className="grid grid-cols-2 gap-x-4 gap-y-2 sm:grid-cols-4">
            <Stat
              label="Time to save a write"
              value={
                f.state.waiting.length > 5
                  ? `waiting (${f.state.waiting.length} unsaved)`
                  : f.state.lastWriteMs === null
                    ? "—"
                    : `${f.state.lastWriteMs} ms`
              }
              tone={f.state.waiting.length > 5 ? "fail" : undefined}
            />
            <Stat
              label="Reads that missed the user's save"
              value={t.reads ? `${t.staleReads} (${pct(t.staleReads / t.reads)})` : "—"}
              tone={t.staleReads > 0 ? "warn" : "ok"}
            />
            <Stat
              label="Saved writes lost"
              value={t.lostWrites}
              tone={t.lostWrites > 0 ? "fail" : "ok"}
            />
            <Stat
              label="Writes refused (no leader)"
              value={t.failedWrites}
              tone={t.failedWrites > 0 ? "warn" : undefined}
            />
          </dl>
        );
      }}
      controls={
        <div className="space-y-5">
          <p className="text-xs text-fg-subtle">
            Changing a setting restarts the run. Failures happen at the current step.
          </p>
          <div className="flex flex-wrap gap-x-6 gap-y-4">
            <SegmentedControl<Mode>
              label="Writes"
              value={config.mode}
              options={[
                { value: "async", label: "Asynchronous" },
                { value: "sync", label: "Wait for db-2" },
              ]}
              onChange={(mode) => configure({ mode })}
            />
            <SegmentedControl<ReadRouting>
              label="Reads go to"
              value={config.reads}
              options={[
                { value: "followers", label: "Followers" },
                { value: "leader", label: "Leader" },
                { value: "read-your-writes", label: "Read-your-writes" },
              ]}
              onChange={(reads) => configure({ reads })}
            />
          </div>
          <div className="space-y-1.5">
            <p className="text-xs font-medium text-fg-muted">Break something</p>
            <div className="flex flex-wrap gap-2">
              <ActionButton
                tone="danger"
                onClick={() => act({ type: "crash-leader" })}
                disabled={
                  state.failoverUntil !== null || !state.nodes.some((n) => n.role === "leader")
                }
              >
                <Zap aria-hidden className="size-3.5" /> Crash the leader
              </ActionButton>
              {db3.lag === SLOW_LAG ? (
                <ActionButton
                  tone="positive"
                  onClick={() => act({ type: "slow-follower", slow: false })}
                >
                  <Play aria-hidden className="size-3.5" /> Speed db-3 back up
                </ActionButton>
              ) : (
                <ActionButton
                  tone="danger"
                  onClick={() => act({ type: "slow-follower", slow: true })}
                >
                  <Snail aria-hidden className="size-3.5" /> Slow down db-3
                </ActionButton>
              )}
              {db2.stopped ? (
                <ActionButton
                  tone="positive"
                  onClick={() => act({ type: "stop-follower", stopped: false })}
                >
                  <Play aria-hidden className="size-3.5" /> Restart db-2
                </ActionButton>
              ) : (
                <ActionButton
                  tone="danger"
                  onClick={() => act({ type: "stop-follower", stopped: true })}
                  disabled={db2.role !== "follower"}
                >
                  <Pause aria-hidden className="size-3.5" /> Stop db-2
                </ActionButton>
              )}
              <ActionButton
                onClick={restart}
                disabled={log.actions.length === 0 && playback.frame === 0}
              >
                <RotateCcw aria-hidden className="size-3.5" /> Restart run
              </ActionButton>
            </div>
          </div>
        </div>
      }
    />
  );
}

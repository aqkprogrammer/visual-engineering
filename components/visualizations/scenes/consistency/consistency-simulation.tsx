"use client";

import { Plug, RotateCcw, Unplug } from "lucide-react";
import { useMemo, useState } from "react";
import {
  consistencyModel,
  countAt,
  DEFAULT_CONSISTENCY_CONFIG,
  LIKES_PER_TURN,
  LOCAL_MS,
  lostLikes,
  RTT_MS,
  STEP_MS,
  type ConsistencyAction,
  type ConsistencyConfig,
  type Mode,
} from "@/lib/simulation/models/consistency";
import { runSimulation } from "@/lib/simulation/run";
import { ActionButton, SegmentedControl, Stat } from "../../player/controls";
import { SimulationPlayer } from "../../player/simulation-player";
import { useActionLog } from "../../player/use-action-log";
import { usePlayback } from "../../player/use-playback";
import { ConsistencyScene } from "./consistency-scene";

const BASE_TICKS = 160;

export const CONSISTENCY_ASSUMPTIONS = [
  `Each step is ${STEP_MS} ms. Users in the US add ${LIKES_PER_TURN.us} likes on even steps and users in Europe ${LIKES_PER_TURN.eu} on odd steps; everyone reads the count every step.`,
  `Strong mode is a majority quorum: an update or read must reach 2 of the 3 replicas, so it takes the round trip to the nearest reachable one (${RTT_MS["us-eu"]} ms US–Europe, ${RTT_MS["us-ap"]} ms US–Asia, ${RTT_MS["eu-ap"]} ms Europe–Asia). Eventual modes answer from the local replica in ${LOCAL_MS} ms and copy changes to the others one step later.`,
  "Last writer wins stores the count as one number with a timestamp and keeps the newest. Merge keeps a tally per replica (a grow-only counter, a kind of CRDT) and adds them up.",
  "The partition cuts Europe off from the US and Asia. There is no leader: in the eventual modes every replica accepts updates, and in strong mode any two replicas form a majority.",
];

export function ConsistencySimulation() {
  const [config, setConfig] = useState<ConsistencyConfig>(DEFAULT_CONSISTENCY_CONFIG);
  const log = useActionLog<ConsistencyAction>();
  const ticks = Math.max(BASE_TICKS, (log.actions.at(-1)?.tick ?? 0) + 60);
  const frames = useMemo(
    () => runSimulation(consistencyModel, { params: config, seed: 1, ticks, actions: log.actions }),
    [config, ticks, log.actions],
  );
  const playback = usePlayback({ frameCount: frames.length, frameMs: 150 });
  const state = frames[Math.min(playback.frame, frames.length - 1)]!.state;

  const restart = () => {
    log.reset();
    playback.pause();
    playback.seek(0);
  };
  const act = (action: ConsistencyAction) => {
    log.add(playback.frame + 1, action);
    if (!playback.playing) playback.seek(playback.frame + 1);
  };

  return (
    <SimulationPlayer
      kind="simulation"
      title="Consistency under a partition"
      description="A likes counter replicated in the US, Europe and Asia. Users in the US and Europe add likes and read the count. A network partition can cut Europe off; each replica shows its count, and each region's users show what they see and how long they wait."
      frames={frames}
      playback={playback}
      aspectRatio="760 / 360"
      scene={(f) => <ConsistencyScene state={f.state} />}
      positionLabel={(f) => `${((f.index * STEP_MS) / 1000).toFixed(1)} s`}
      eventTime={(at) => `${((at * STEP_MS) / 1000).toFixed(1)} s`}
      assumptions={CONSISTENCY_ASSUMPTIONS}
      stats={(f) => {
        const s = f.state;
        const missing = lostLikes(s);
        return (
          <dl className="grid grid-cols-2 gap-x-4 gap-y-2 sm:grid-cols-4">
            <Stat label="Likes users were told were saved" value={s.acknowledged} />
            <Stat
              label="US sees · Europe sees"
              value={
                s.clients
                  ? `${countAt(s, "us")} · ${s.clients.eu.ok ? countAt(s, "eu") : "error"}`
                  : "—"
              }
              tone={s.clients && countAt(s, "us") !== countAt(s, "eu") ? "warn" : undefined}
            />
            <Stat
              label={
                s.partitioned
                  ? "Saved likes not yet counted everywhere"
                  : "Saved likes missing for good"
              }
              value={missing}
              tone={missing > 0 ? (s.partitioned ? "warn" : "fail") : "ok"}
            />
            <Stat
              label="Likes refused (no majority)"
              value={s.failed}
              tone={s.failed > 0 ? "warn" : undefined}
            />
          </dl>
        );
      }}
      controls={
        <div className="space-y-5">
          <p className="text-xs text-fg-subtle">
            Changing the mode restarts the run. The partition starts and heals at the current step.
          </p>
          <SegmentedControl<Mode>
            label="Consistency"
            value={config.mode}
            options={[
              { value: "strong", label: "Strong (majority quorum)" },
              { value: "lww", label: "Eventual, last writer wins" },
              { value: "merge", label: "Eventual, merge counts" },
            ]}
            onChange={(mode) => {
              setConfig({ mode });
              restart();
            }}
          />
          <div className="flex flex-wrap gap-2">
            {state.partitioned ? (
              <ActionButton tone="positive" onClick={() => act({ type: "heal" })}>
                <Plug aria-hidden className="size-3.5" /> Heal the partition
              </ActionButton>
            ) : (
              <ActionButton tone="danger" onClick={() => act({ type: "partition" })}>
                <Unplug aria-hidden className="size-3.5" /> Cut Europe off
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
      }
    />
  );
}

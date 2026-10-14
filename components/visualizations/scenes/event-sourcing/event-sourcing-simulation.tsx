"use client";

import { Pause, Play, Plus, RefreshCw, RotateCcw, Undo2 } from "lucide-react";
import { useMemo, useState } from "react";
import {
  DEFAULT_EVENT_SOURCING_CONFIG,
  eventSourcingModel,
  REBUILD_RATE,
  SNAPSHOT_EVERY,
  type EventSourcingAction,
  type EventSourcingConfig,
} from "@/lib/simulation/models/event-sourcing";
import { runSimulation } from "@/lib/simulation/run";
import { ActionButton, SegmentedControl, Stat, Toggle } from "../../player/controls";
import { SimulationPlayer } from "../../player/simulation-player";
import { useActionLog } from "../../player/use-action-log";
import { usePlayback } from "../../player/use-playback";
import { EventSourcingScene } from "./event-sourcing-scene";

const BASE_TICKS = 40;
const SEED = 2;

export const EVENT_SOURCING_ASSUMPTIONS = [
  "Each step is one second with one customer command (deposit or withdrawal) from a fixed, seeded script. The write side rebuilds the account by replaying its events, rejects withdrawals larger than the balance, and appends an event for each accepted command.",
  `Read models apply events at their own pace: a projector applying 2 events a second keeps up; one applying 1 every 2 seconds falls behind. Rebuilding replays ${REBUILD_RATE} events a second.`,
  `With snapshots, loading the account replays only the events since the latest snapshot (one every ${SNAPSHOT_EVERY} events).`,
  "One account, one event store, no concurrency: real systems also need optimistic concurrency checks and idempotent projections, because events can be delivered more than once.",
  "Here a rebuild wipes the live read model; production systems usually rebuild into a new copy and switch to it once it has caught up.",
];

export function EventSourcingSimulation() {
  const [config, setConfig] = useState<EventSourcingConfig>(DEFAULT_EVENT_SOURCING_CONFIG);
  const log = useActionLog<EventSourcingAction>();
  const ticks = Math.max(BASE_TICKS, (log.actions.at(-1)?.tick ?? 0) + 25);
  const frames = useMemo(
    () =>
      runSimulation(eventSourcingModel, {
        params: config,
        seed: SEED,
        ticks,
        actions: log.actions,
      }),
    [config, ticks, log.actions],
  );
  const playback = usePlayback({ frameCount: frames.length, frameMs: 600 });
  const state = frames[Math.min(playback.frame, frames.length - 1)]!.state;
  const paused = state.projections.some((p) => p.paused);
  const hasSpending = state.projections.some((p) => p.id === "spending");

  const restart = () => {
    log.reset();
    playback.pause();
    playback.seek(0);
  };
  const configure = (change: Partial<EventSourcingConfig>) => {
    setConfig((c) => ({ ...c, ...change }));
    restart();
  };
  const act = (action: EventSourcingAction) => {
    log.add(playback.frame + 1, action);
    if (!playback.playing) playback.seek(playback.frame + 1);
  };

  return (
    <SimulationPlayer
      kind="simulation"
      title="Event sourcing and CQRS"
      description="Commands update an account whose only source of truth is an append-only event log, shown as numbered rows. Read models on the right apply those events at their own pace and show how far behind they are."
      frames={frames}
      playback={playback}
      aspectRatio="760 / 400"
      scene={(f) => <EventSourcingScene state={f.state} />}
      positionLabel={(f) => `${f.index} s`}
      eventTime={(at) => `${at} s`}
      assumptions={EVENT_SOURCING_ASSUMPTIONS}
      stats={(f) => {
        const m = f.state.metrics;
        const t = f.state.totals;
        return (
          <dl className="grid grid-cols-2 gap-x-4 gap-y-2 sm:grid-cols-4">
            <Stat label="Events in the log" value={f.state.log.length} />
            <Stat
              label="Balance view behind by"
              value={m ? `${m.lag} event${m.lag === 1 ? "" : "s"}` : "—"}
              tone={m && m.lag > 0 ? "warn" : undefined}
            />
            <Stat label="Out-of-date reads so far" value={`${t.staleReads} of ${t.reads}`} />
            <Stat label="Events replayed to load (total)" value={t.replayed} />
          </dl>
        );
      }}
      controls={
        <div className="space-y-5">
          <p className="text-xs text-fg-subtle">
            Changing a setting restarts the run. Actions happen at the current second.
          </p>
          <div className="flex flex-wrap gap-x-6 gap-y-4">
            <SegmentedControl
              label="Projector speed"
              value={String(config.projectorRate)}
              options={[
                { value: "2", label: "Keeps up" },
                { value: "0.5", label: "Falls behind" },
              ]}
              onChange={(rate) => configure({ projectorRate: Number(rate) })}
            />
            <Toggle
              label="Snapshots"
              description={`save the account every ${SNAPSHOT_EVERY} events`}
              checked={config.snapshots}
              onChange={(snapshots) => configure({ snapshots })}
            />
          </div>
          <div className="flex flex-wrap gap-2">
            {paused ? (
              <ActionButton tone="positive" onClick={() => act({ type: "resume-projector" })}>
                <Play aria-hidden className="size-3.5" /> Restart the projector
              </ActionButton>
            ) : (
              <ActionButton tone="danger" onClick={() => act({ type: "pause-projector" })}>
                <Pause aria-hidden className="size-3.5" /> Stop the projector
              </ActionButton>
            )}
            <ActionButton
              onClick={() => act({ type: "rebuild-projection", projection: "balance" })}
            >
              <RefreshCw aria-hidden className="size-3.5" /> Rebuild the balance view
            </ActionButton>
            <ActionButton
              onClick={() => act({ type: "add-spending-projection" })}
              disabled={hasSpending}
            >
              <Plus aria-hidden className="size-3.5" /> Add a spending-by-category view
            </ActionButton>
            <ActionButton onClick={() => act({ type: "reverse-last-withdrawal" })}>
              <Undo2 aria-hidden className="size-3.5" /> Reverse the last withdrawal
            </ActionButton>
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

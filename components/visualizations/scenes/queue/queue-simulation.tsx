"use client";

import { RotateCcw } from "lucide-react";
import { useMemo } from "react";
import {
  capacityPerSecond,
  DEFAULT_QUEUE_CONFIG,
  oldestAgeTicks,
  queueModel,
  RATES,
  throughput,
  TICK_MS,
  type QueueAction,
  type QueueConfig,
  type RateLevel,
} from "@/lib/simulation/models/queue";
import { runSimulation } from "@/lib/simulation/run";
import { ActionButton, SegmentedControl, Stat, Toggle } from "../../player/controls";
import { SimulationPlayer } from "../../player/simulation-player";
import { useActionLog } from "../../player/use-action-log";
import { usePlayback } from "../../player/use-playback";
import { QueueScene } from "./queue-scene";

const SEED = 77;
const BASE_TICKS = 400;

export const QUEUE_ASSUMPTIONS = [
  `Each step is ${TICK_MS} ms. Each consumer handles one message at a time: 5 per second normally, a third of that when the downstream dependency is slow.`,
  "Poison messages always fail; each failure returns the message to the end of the queue, and after 3 receives it goes to the dead-letter queue.",
  "A bounded queue rejects new messages when full; producers would have to back off and retry.",
  "No partitions, ordering guarantees, visibility timeouts or consumer crashes.",
];

const seconds = (tick: number) => `${((tick * TICK_MS) / 1000).toFixed(1)} s`;

export function QueueSimulation() {
  const log = useActionLog<QueueAction>();
  const ticks = Math.max(BASE_TICKS, (log.actions.at(-1)?.tick ?? 0) + 200);
  const frames = useMemo(
    () =>
      runSimulation(queueModel, {
        params: DEFAULT_QUEUE_CONFIG,
        seed: SEED,
        ticks,
        actions: log.actions,
      }),
    [log.actions, ticks],
  );
  const playback = usePlayback({ frameCount: frames.length, frameMs: 150 });
  const state = frames[Math.min(playback.frame, frames.length - 1)]!.state;
  const configure = (config: Partial<QueueConfig>) => {
    log.add(playback.frame + 1, { type: "configure", config });
    if (!playback.playing) playback.seek(playback.frame + 1);
  };

  return (
    <SimulationPlayer
      kind="simulation"
      title="Message queue simulation"
      description="Producers send messages into a queue that a pool of consumers drains. Change the arrival rate, the number of consumers, the speed of a downstream dependency, whether the queue is bounded and how many messages are malformed, and watch the backlog, message age and dead-letter queue."
      frames={frames}
      playback={playback}
      aspectRatio="760 / 380"
      scene={(f) => <QueueScene state={f.state} />}
      positionLabel={(f) => seconds(f.index)}
      eventTime={seconds}
      assumptions={QUEUE_ASSUMPTIONS}
      stats={(f) => {
        const age = (oldestAgeTicks(f.state) * TICK_MS) / 1000;
        return (
          <dl className="grid grid-cols-2 gap-x-4 gap-y-2 sm:grid-cols-4">
            <Stat
              label="In / out per second"
              value={`${RATES[f.state.config.rate]} / ${throughput(f.state)}`}
            />
            <Stat
              label="Capacity per second"
              value={capacityPerSecond(f.state.config).toFixed(1)}
            />
            <Stat
              label="Waiting"
              value={f.state.queue.length}
              tone={f.state.queue.length > 30 ? "fail" : undefined}
            />
            <Stat
              label="Oldest message age"
              value={`${age.toFixed(1)} s`}
              tone={age > 5 ? "fail" : age > 1 ? "warn" : "ok"}
            />
          </dl>
        );
      }}
      controls={
        <div className="flex flex-wrap gap-x-6 gap-y-4">
          <SegmentedControl<RateLevel>
            label="Producer rate"
            value={state.config.rate}
            options={[
              { value: "low", label: `Low (${RATES.low}/s)` },
              { value: "normal", label: `Normal (${RATES.normal}/s)` },
              { value: "spike", label: `Spike (${RATES.spike}/s)` },
            ]}
            onChange={(rate) => configure({ rate })}
          />
          <SegmentedControl
            label="Consumers"
            value={String(state.config.consumers)}
            options={[1, 2, 3, 4, 5, 6].map((n) => ({ value: String(n), label: String(n) }))}
            onChange={(n) => configure({ consumers: Number(n) })}
          />
          <SegmentedControl
            label="Malformed (poison) messages"
            value={String(state.config.poisonShare)}
            options={[
              { value: "0", label: "None" },
              { value: "0.05", label: "5%" },
              { value: "0.2", label: "20%" },
            ]}
            onChange={(share) => configure({ poisonShare: Number(share) })}
          />
          <Toggle
            label="Slow downstream"
            description="the database consumers write to slows down 3×"
            checked={state.config.slowDownstream}
            onChange={(slowDownstream) => configure({ slowDownstream })}
          />
          <Toggle
            label="Bounded queue"
            description="reject new messages when full"
            checked={state.config.bounded}
            onChange={(bounded) => configure({ bounded })}
          />
          <div className="self-end">
            <ActionButton
              onClick={() => {
                log.reset();
                playback.pause();
                playback.seek(0);
              }}
              disabled={log.actions.length === 0 && playback.frame === 0}
            >
              <RotateCcw aria-hidden className="size-3.5" /> Reset scenario
            </ActionButton>
          </div>
        </div>
      }
    />
  );
}

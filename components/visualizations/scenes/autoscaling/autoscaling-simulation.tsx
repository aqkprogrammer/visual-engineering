"use client";

import { RotateCcw, TrendingUp } from "lucide-react";
import { useMemo, useState } from "react";
import {
  autoscalingModel,
  DEFAULT_AUTOSCALING_CONFIG,
  INSTANCE_CAPACITY,
  MAX_INSTANCES,
  MIN_INSTANCES,
  TOLERANCE,
  type AutoscalingAction,
  type AutoscalingConfig,
  type Pattern,
} from "@/lib/simulation/models/autoscaling";
import { runSimulation } from "@/lib/simulation/run";
import { ActionButton, SegmentedControl, Stat } from "../../player/controls";
import { SimulationPlayer } from "../../player/simulation-player";
import { useActionLog } from "../../player/use-action-log";
import { usePlayback } from "../../player/use-playback";
import { AutoscalingScene } from "./autoscaling-scene";

const BASE_TICKS = 120;
const SEED = 3;

export const AUTOSCALING_ASSUMPTIONS = [
  `Each step is one minute. One instance serves ${INSTANCE_CAPACITY} requests/s at 100% CPU; requests beyond the fleet's capacity fail.`,
  `Target tracking runs every minute: desired = ceil(current × utilisation ÷ target), skipped within ±${TOLERANCE * 100}% of the target, between ${MIN_INSTANCES} and ${MAX_INSTANCES} instances.`,
  "Scale-out counts instances that are still starting, so it doesn't over-launch. Scale-in never happens while instances are starting, and goes only as low as the highest recommendation in the stabilisation window.",
  "Utilisation is measured on the previous minute's traffic with no metric delay; real metrics arrive tens of seconds to minutes late, which makes everything slower.",
  "Traffic has ±3% random noise from a fixed seed, so every run is identical.",
];

export function AutoscalingSimulation() {
  const [config, setConfig] = useState<AutoscalingConfig>(DEFAULT_AUTOSCALING_CONFIG);
  const log = useActionLog<AutoscalingAction>();
  const ticks = Math.max(BASE_TICKS, (log.actions.at(-1)?.tick ?? 0) + 30);
  const frames = useMemo(
    () =>
      runSimulation(autoscalingModel, { params: config, seed: SEED, ticks, actions: log.actions }),
    [config, ticks, log.actions],
  );
  const playback = usePlayback({ frameCount: frames.length, frameMs: 250 });

  const restart = () => {
    log.reset();
    playback.pause();
    playback.seek(0);
  };
  const configure = (change: Partial<AutoscalingConfig>) => {
    setConfig((c) => ({ ...c, ...change }));
    restart();
  };

  return (
    <SimulationPlayer
      kind="simulation"
      title="Autoscaling"
      description="A chart of demand (dashed) against serving capacity (a staircase) over time, with red bars where demand exceeds capacity and requests fail, and a strip of instances below, with starting instances drawn as dashed outlines."
      frames={frames}
      playback={playback}
      aspectRatio="760 / 400"
      scene={(f) => <AutoscalingScene state={f.state} />}
      positionLabel={(f) => `${f.index} min`}
      eventTime={(at) => `${at} min`}
      assumptions={AUTOSCALING_ASSUMPTIONS}
      stats={(f) => {
        const t = f.state.totals;
        return (
          <dl className="grid grid-cols-2 gap-x-4 gap-y-2 sm:grid-cols-4">
            <Stat
              label="Failed so far"
              value={t.requests ? `${((t.failed / t.requests) * 100).toFixed(2)}%` : "—"}
              tone={t.failed > 0 ? "fail" : "ok"}
            />
            <Stat
              label="Instances"
              value={`${f.state.inService}${f.state.launching.length ? ` (+${f.state.launching.length})` : ""}`}
            />
            <Stat label="Scaling actions" value={t.scalingActions} />
            <Stat label="Cost (instance-minutes)" value={t.instanceMinutes} />
          </dl>
        );
      }}
      controls={
        <div className="space-y-4">
          <p className="text-xs text-fg-subtle">
            Changing a setting restarts the run. A surge happens at the current minute.
          </p>
          <div className="flex flex-wrap gap-x-6 gap-y-4">
            <SegmentedControl<Pattern>
              label="Traffic"
              value={config.pattern}
              options={[
                { value: "ramp", label: "Ramp" },
                { value: "spike", label: "Spike" },
                { value: "bursty", label: "Bursty" },
                { value: "daily", label: "Daily wave" },
              ]}
              onChange={(pattern) => configure({ pattern })}
            />
            <SegmentedControl
              label="Target CPU"
              value={String(config.target)}
              options={[0.4, 0.6, 0.9].map((t) => ({ value: String(t), label: `${t * 100}%` }))}
              onChange={(target) => configure({ target: Number(target) })}
            />
            <SegmentedControl
              label="Instance start-up"
              value={String(config.startup)}
              options={[
                { value: "1", label: "1 min" },
                { value: "3", label: "3 min" },
                { value: "6", label: "6 min" },
              ]}
              onChange={(startup) => configure({ startup: Number(startup) })}
            />
            <SegmentedControl
              label="Scale-in window"
              value={String(config.scaleInWindow)}
              options={[
                { value: "0", label: "None" },
                { value: "5", label: "5 min" },
              ]}
              onChange={(w) => configure({ scaleInWindow: Number(w) })}
            />
          </div>
          <div className="flex flex-wrap gap-2">
            <ActionButton
              tone="danger"
              onClick={() => {
                log.add(playback.frame + 1, { type: "surge" });
                if (!playback.playing) playback.seek(playback.frame + 1);
              }}
            >
              <TrendingUp aria-hidden className="size-3.5" /> Add a traffic surge
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

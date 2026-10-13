"use client";

import { RotateCcw } from "lucide-react";
import { useMemo } from "react";
import {
  acceptedLastSecond,
  DEFAULT_LIMITER_CONFIG,
  rateLimiterModel,
  TICK_MS,
  type Algorithm,
  type LimiterAction,
  type Pattern,
} from "@/lib/simulation/models/rate-limiter";
import { runSimulation } from "@/lib/simulation/run";
import { ActionButton, SegmentedControl, Stat } from "../../player/controls";
import { SimulationPlayer } from "../../player/simulation-player";
import { useActionLog } from "../../player/use-action-log";
import { usePlayback } from "../../player/use-playback";
import { RateLimiterScene } from "./rate-limiter-scene";

const SEED = 9;
const BASE_TICKS = 300;

export const LIMITER_ASSUMPTIONS = [
  `Each step is ${TICK_MS} ms; the limit is per second (10 steps).`,
  "One client and one limiter — no shared counters across servers, clock skew or network delay.",
  "Rejected requests are dropped with 429 and never retried.",
  "The token bucket holds as many tokens as the per-second limit and refills continuously.",
  "The sliding window counter is Cloudflare's approximation: it assumes the previous window's requests were evenly spread.",
];

const seconds = (tick: number) => `${((tick * TICK_MS) / 1000).toFixed(1)} s`;

export function RateLimiterSimulation() {
  const log = useActionLog<LimiterAction>();
  const ticks = Math.max(BASE_TICKS, (log.actions.at(-1)?.tick ?? 0) + 150);
  const frames = useMemo(
    () =>
      runSimulation(rateLimiterModel, {
        params: DEFAULT_LIMITER_CONFIG,
        seed: SEED,
        ticks,
        actions: log.actions,
      }),
    [log.actions, ticks],
  );
  const playback = usePlayback({ frameCount: frames.length, frameMs: 200 });
  const state = frames[Math.min(playback.frame, frames.length - 1)]!.state;
  const act = (action: LimiterAction) => {
    log.add(playback.frame + 1, action);
    if (!playback.playing) playback.seek(playback.frame + 1);
  };

  return (
    <SimulationPlayer
      kind="simulation"
      title="Rate limiter simulation"
      description="A timeline of one client's requests, each marked accepted or rejected by the chosen rate-limiting algorithm, with the algorithm's internal state shown above it."
      frames={frames}
      playback={playback}
      aspectRatio="760 / 380"
      scene={(f) => <RateLimiterScene state={f.state} />}
      positionLabel={(f) => seconds(f.index)}
      eventTime={seconds}
      assumptions={LIMITER_ASSUMPTIONS}
      stats={(f) => (
        <dl className="grid grid-cols-2 gap-x-4 gap-y-2 sm:grid-cols-4">
          <Stat label="Accepted" value={f.state.totals.accepted} />
          <Stat
            label="Rejected (429)"
            value={f.state.totals.rejected}
            tone={f.state.totals.rejected > 0 ? "warn" : undefined}
          />
          <Stat
            label="Accepted in last second"
            value={`${acceptedLastSecond(f.state)} / ${f.state.config.limit}`}
          />
          <Stat
            label="Peak in any one second"
            value={f.state.peakPerSecond}
            tone={f.state.peakPerSecond > f.state.config.limit ? "fail" : "ok"}
          />
        </dl>
      )}
      controls={
        <div className="flex flex-wrap gap-x-6 gap-y-4">
          <SegmentedControl<Algorithm>
            label="Algorithm"
            value={state.config.algorithm}
            options={[
              { value: "token-bucket", label: "Token bucket" },
              { value: "fixed-window", label: "Fixed window" },
              { value: "sliding-log", label: "Sliding log" },
              { value: "sliding-counter", label: "Sliding counter" },
            ]}
            onChange={(algorithm) => act({ type: "configure", config: { algorithm } })}
          />
          <SegmentedControl<Pattern>
            label="Traffic"
            value={state.config.pattern}
            options={[
              { value: "under-limit", label: "Under limit" },
              { value: "steady-over", label: "Steady, over limit" },
              { value: "bursty", label: "Bursty" },
              { value: "boundary", label: "Window-edge bursts" },
            ]}
            onChange={(pattern) => act({ type: "configure", config: { pattern } })}
          />
          <SegmentedControl
            label="Limit"
            value={String(state.config.limit)}
            options={[5, 10, 20].map((n) => ({ value: String(n), label: `${n}/s` }))}
            onChange={(limit) => act({ type: "configure", config: { limit: Number(limit) } })}
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

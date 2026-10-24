"use client";

import { RotateCcw, Snail } from "lucide-react";
import { useMemo, useState } from "react";
import {
  ARRIVALS_PER_STEP,
  BREAKER,
  BUDGET_RATIO,
  CAPACITY_PER_STEP,
  DEFAULT_RETRIES_CONFIG,
  DEGRADED_CAPACITY,
  MAX_ATTEMPTS,
  retriesModel,
  SLOW_STEPS,
  STEP_MS,
  type RetriesAction,
  type RetriesConfig,
  type RetryPolicy,
  type TimeoutChoice,
} from "@/lib/simulation/models/retries";
import { runSimulation } from "@/lib/simulation/run";
import { ActionButton, SegmentedControl, Stat, Toggle } from "../../player/controls";
import { SimulationPlayer } from "../../player/simulation-player";
import { useActionLog } from "../../player/use-action-log";
import { usePlayback } from "../../player/use-playback";
import { RetriesScene } from "./retries-scene";

const BASE_TICKS = 300;
const perSecond = (n: number) => Math.round(n * (1000 / STEP_MS));

export const RETRIES_ASSUMPTIONS = [
  `Each step is ${STEP_MS} ms. Users send ${perSecond(ARRIVALS_PER_STEP)} requests a second; the dependency handles ${perSecond(CAPACITY_PER_STEP)} a second, or ${perSecond(DEGRADED_CAPACITY)} while slowed for ${(SLOW_STEPS * STEP_MS) / 1000} s.`,
  "Calls queue first-in, first-out. A call that times out fails for your service, but the dependency still does its work later — and that work is wasted.",
  `Retries mean up to ${MAX_ATTEMPTS - 1} more attempts. Backoff waits up to 200 ms, 400 ms, then 800 ms, spread at random ("full jitter"). The retry budget lets retries add at most ${Math.round(BUDGET_RATIO * 100)}% to new requests.`,
  `The circuit breaker opens when more than half of the last second's calls failed, fails calls fast for ${(BREAKER.openSteps * STEP_MS) / 1000} s, then lets ${Math.round(BREAKER.trialShare * 100)}% through as trials. Requests are counted as fractional amounts per step.`,
];

export function RetriesSimulation() {
  const [config, setConfig] = useState<RetriesConfig>(DEFAULT_RETRIES_CONFIG);
  const log = useActionLog<RetriesAction>();
  const ticks = Math.max(BASE_TICKS, (log.actions.at(-1)?.tick ?? 0) + 150);
  const frames = useMemo(
    () => runSimulation(retriesModel, { params: config, seed: 1, ticks, actions: log.actions }),
    [config, ticks, log.actions],
  );
  const playback = usePlayback({ frameCount: frames.length, frameMs: 80 });
  const state = frames[Math.min(playback.frame, frames.length - 1)]!.state;

  const restart = () => {
    log.reset();
    playback.pause();
    playback.seek(0);
  };
  const configure = (change: Partial<RetriesConfig>) => {
    setConfig((c) => ({ ...c, ...change }));
    restart();
  };
  const act = (action: RetriesAction) => {
    log.add(playback.frame + 1, action);
    if (!playback.playing) playback.seek(playback.frame + 1);
  };

  return (
    <SimulationPlayer
      kind="simulation"
      title="Timeouts, retries and circuit breakers"
      description="Users call your service, which calls a dependency through timeouts, optional retries and an optional circuit breaker. The dependency can be slowed for five seconds. A chart shows the calls reaching the dependency each second against its capacity."
      frames={frames}
      playback={playback}
      aspectRatio="760 / 360"
      scene={(f) => (
        <RetriesScene
          state={f.state}
          history={frames.slice(Math.max(0, f.index - 299), f.index + 1)}
        />
      )}
      positionLabel={(f) => `${((f.index * STEP_MS) / 1000).toFixed(1)} s`}
      eventTime={(at) => `${((at * STEP_MS) / 1000).toFixed(1)} s`}
      assumptions={RETRIES_ASSUMPTIONS}
      stats={(f) => {
        const recent = frames.slice(Math.max(1, f.index - 9), f.index + 1);
        const ok = recent.reduce((n, x) => n + (x.state.metrics?.succeeded ?? 0), 0);
        const bad = recent.reduce((n, x) => n + (x.state.metrics?.failed ?? 0), 0);
        const rate = ok + bad > 0 ? ok / (ok + bad) : 1;
        const m = f.state.metrics;
        return (
          <dl className="grid grid-cols-2 gap-x-4 gap-y-2 sm:grid-cols-4">
            <Stat
              label="Requests succeeding (last second)"
              value={m ? `${Math.round(rate * 100)}%` : "—"}
              tone={!m ? undefined : rate > 0.99 ? "ok" : rate > 0.5 ? "warn" : "fail"}
            />
            <Stat
              label="Calls sent vs capacity"
              value={m ? `${perSecond(m.sent)}/s of ${perSecond(f.state.capacity)}/s` : "—"}
              tone={m && m.sent > f.state.capacity ? "fail" : undefined}
            />
            <Stat
              label="Time to answer (successes)"
              value={m && m.succeeded > 0 ? `${Math.round(m.latencyMs)} ms` : "—"}
              tone={m && m.latencyMs > 1000 ? "warn" : undefined}
            />
            <Stat
              label="Work wasted on timed-out calls"
              value={Math.round(f.state.totals.wasted)}
            />
          </dl>
        );
      }}
      controls={
        <div className="space-y-5">
          <p className="text-xs text-fg-subtle">
            Changing a setting restarts the run. The slowdown starts at the current step.
          </p>
          <div className="flex flex-wrap gap-x-6 gap-y-4">
            <SegmentedControl<RetryPolicy>
              label="On failure"
              value={config.retries}
              options={[
                { value: "none", label: "Don't retry" },
                { value: "immediate", label: "Retry 3× at once" },
                { value: "backoff", label: "Retry 3× with backoff" },
                { value: "budget", label: "Retry within a budget" },
              ]}
              onChange={(retries) => configure({ retries })}
            />
            <SegmentedControl<TimeoutChoice>
              label="Timeout"
              value={config.timeout}
              options={[
                { value: "short", label: "1 s" },
                { value: "long", label: "3 s" },
              ]}
              onChange={(timeout) => configure({ timeout })}
            />
            <Toggle
              label="Circuit breaker"
              description="fail fast while the dependency is failing"
              checked={config.breaker}
              onChange={(breaker) => configure({ breaker })}
            />
          </div>
          <div className="flex flex-wrap gap-2">
            <ActionButton
              tone="danger"
              onClick={() => act({ type: "slow-dependency" })}
              disabled={state.slowUntil !== null}
            >
              <Snail aria-hidden className="size-3.5" /> Slow the dependency for 5 s
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

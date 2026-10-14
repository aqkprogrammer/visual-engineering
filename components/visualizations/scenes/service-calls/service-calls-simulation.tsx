"use client";

import { Power, RotateCcw, Snail, Zap } from "lucide-react";
import { useMemo, useState } from "react";
import {
  DEFAULT_SERVICE_CALLS_CONFIG,
  expectedSuccess,
  FAIL_CHANCE,
  HOP_MS,
  REQUESTS_PER_STEP,
  serviceCallsModel,
  serviceName,
  SLOW_CHANCE,
  SLOW_MS,
  TIMEOUT_MS,
  WORK_MS,
  type Architecture,
  type ServiceCallsAction,
  type ServiceCallsConfig,
  type Topology,
} from "@/lib/simulation/models/service-calls";
import { runSimulation } from "@/lib/simulation/run";
import { ActionButton, SegmentedControl, Stat, Toggle } from "../../player/controls";
import { SimulationPlayer } from "../../player/simulation-player";
import { useActionLog } from "../../player/use-action-log";
import { usePlayback } from "../../player/use-playback";
import { ServiceCallsScene } from "./service-calls-scene";

const BASE_TICKS = 60;
const SEED = 7;

export const SERVICE_CALLS_ASSUMPTIONS = [
  `Each step is one second with ${REQUESTS_PER_STEP} user requests. Every component does ${WORK_MS} ms of work; every network hop adds ${HOP_MS} ms.`,
  `Every remote call independently has a ${SLOW_CHANCE * 100}% chance of a slow (${SLOW_MS} ms) response and a ${FAIL_CHANCE * 100}% chance of failing. The monolith's modules share one process: one chance per request, not per call.`,
  `With timeouts on, a call gives up after ${TIMEOUT_MS} ms and is retried once. The fallback lets a request succeed without the optional recommendations service.`,
  "A module that crashes in the monolith takes the whole process down; in the microservices version, only calls to that service fail.",
  "Real benefits of microservices — independent deployment, scaling and team ownership — are organisational and don't appear in a latency model.",
];

const pct = (n: number, digits = 1) => `${(n * 100).toFixed(digits)}%`;

export function ServiceCallsSimulation() {
  const [config, setConfig] = useState<ServiceCallsConfig>(DEFAULT_SERVICE_CALLS_CONFIG);
  const log = useActionLog<ServiceCallsAction>();
  const ticks = Math.max(BASE_TICKS, (log.actions.at(-1)?.tick ?? 0) + 30);
  const frames = useMemo(
    () =>
      runSimulation(serviceCallsModel, { params: config, seed: SEED, ticks, actions: log.actions }),
    [config, ticks, log.actions],
  );
  const playback = usePlayback({ frameCount: frames.length, frameMs: 400 });
  const state = frames[Math.min(playback.frame, frames.length - 1)]!.state;

  const restart = () => {
    log.reset();
    playback.pause();
    playback.seek(0);
  };
  const configure = (change: Partial<ServiceCallsConfig>) => {
    setConfig((c) => ({ ...c, ...change }));
    restart();
  };
  const act = (action: ServiceCallsAction) => {
    log.add(playback.frame + 1, action);
    if (!playback.playing) playback.seek(playback.frame + 1);
  };
  const microservices = config.architecture === "microservices";

  return (
    <SimulationPlayer
      kind="simulation"
      title="Monolith versus microservices"
      description="A user request flowing either through modules inside one process, or through services that call each other over the network in a chain or in parallel, with a histogram of how long requests took in the current second. Slow and failed services are labelled."
      frames={frames}
      playback={playback}
      aspectRatio="760 / 400"
      scene={(f) => <ServiceCallsScene state={f.state} />}
      positionLabel={(f) => `${f.index} s`}
      eventTime={(at) => `${at} s`}
      assumptions={SERVICE_CALLS_ASSUMPTIONS}
      stats={(f) => {
        const t = f.state.totals;
        return (
          <dl className="grid grid-cols-2 gap-x-4 gap-y-2 sm:grid-cols-4">
            <Stat
              label="Succeeded so far"
              value={t.requests ? pct((t.succeeded + t.degraded) / t.requests, 2) : "—"}
              tone={t.requests && t.failed / t.requests > 0.01 ? "fail" : undefined}
            />
            <Stat label="Expected from failures alone" value={pct(expectedSuccess(config), 2)} />
            <Stat
              label="Slower than 300 ms"
              value={t.requests ? pct(t.slow / t.requests) : "—"}
              tone={t.requests && t.slow / t.requests > 0.05 ? "warn" : undefined}
            />
            <Stat label="Answered without recommendations" value={t.degraded} />
          </dl>
        );
      }}
      controls={
        <div className="space-y-5">
          <p className="text-xs text-fg-subtle">
            Changing the design restarts the run. Failures happen at the current second.
          </p>
          <div className="flex flex-wrap gap-x-6 gap-y-4">
            <SegmentedControl<Architecture>
              label="Architecture"
              value={config.architecture}
              options={[
                { value: "monolith", label: "Monolith" },
                { value: "microservices", label: "Microservices" },
              ]}
              onChange={(architecture) => configure({ architecture })}
            />
            <SegmentedControl
              label={microservices ? "Services per request" : "Modules per request"}
              value={String(config.services)}
              options={[3, 5, 10].map((n) => ({ value: String(n), label: String(n) }))}
              onChange={(services) => configure({ services: Number(services) })}
            />
            <SegmentedControl<Topology>
              label="Calls"
              value={config.topology}
              options={[
                { value: "chain", label: "One after another" },
                { value: "fan-out", label: "In parallel" },
              ]}
              onChange={(topology) => configure({ topology })}
            />
          </div>
          {microservices && (
            <div className="flex flex-wrap gap-x-8 gap-y-3">
              <Toggle
                label="Timeouts and one retry"
                description={`give up on a call after ${TIMEOUT_MS} ms`}
                checked={config.timeouts}
                onChange={(timeouts) => configure({ timeouts })}
              />
              <Toggle
                label="Fallback for recommendations"
                description="answer without them if they fail"
                checked={config.fallback}
                onChange={(fallback) => configure({ fallback })}
              />
            </div>
          )}
          <div className="space-y-1.5">
            <p className="text-xs font-medium text-fg-muted">Break something</p>
            <div className="flex flex-wrap gap-2">
              {[1, state.health.length - 1].map((index) => {
                const name = serviceName(index, state.health.length, config.architecture);
                const h = state.health[index];
                return h === "healthy" ? (
                  <span key={index} className="contents">
                    <ActionButton
                      tone="danger"
                      onClick={() => act({ type: "slow-service", index })}
                    >
                      <Snail aria-hidden className="size-3.5" /> Slow down {name}
                    </ActionButton>
                    <ActionButton
                      tone="danger"
                      onClick={() => act({ type: "fail-service", index })}
                    >
                      <Zap aria-hidden className="size-3.5" /> Crash {name}
                    </ActionButton>
                  </span>
                ) : (
                  <ActionButton
                    key={index}
                    tone="positive"
                    onClick={() => act({ type: "restore-service", index })}
                  >
                    <Power aria-hidden className="size-3.5" /> Restore {name}
                  </ActionButton>
                );
              })}
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

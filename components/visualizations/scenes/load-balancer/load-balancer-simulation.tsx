"use client";

import { Minus, Plus, Power, RotateCcw, Zap } from "lucide-react";
import { useMemo } from "react";
import {
  DEFAULT_LB_PARAMS,
  loadBalancerModel,
  MAX_SERVERS,
  MIN_SERVERS,
  p95,
  recentErrors,
  TICK_MS,
  type LbAction,
  type LbConfig,
  type TrafficLevel,
} from "@/lib/simulation/models/load-balancer";
import { runSimulation } from "@/lib/simulation/run";
import { ActionButton, SegmentedControl, Stat, Toggle } from "../../player/controls";
import { SimulationPlayer } from "../../player/simulation-player";
import { useActionLog } from "../../player/use-action-log";
import { usePlayback } from "../../player/use-playback";
import { LoadBalancerScene } from "./load-balancer-scene";

const SEED = 20261012;
const BASE_TICKS = 600; // 15 s of simulated time
const FRAME_MS = 120;

export const LB_ASSUMPTIONS = [
  `Time is discrete: one step is ${TICK_MS} ms of simulated time. Latencies are illustrative, not benchmarks.`,
  "Each hop between the load balancer and a server takes 2 steps, with no packet loss.",
  "Each server has 4 workers; extra requests wait in a queue on that server.",
  "Light requests take 3–5 steps of work, heavy ones 18–26. Nothing else varies.",
  "Active health checks run every 6 steps: 2 failures remove a server, 2 passes restore it.",
  "With no server in rotation the balancer answers 503 at once; some real balancers fail open instead.",
];

const seconds = (tick: number) => `${((tick * TICK_MS) / 1000).toFixed(2)} s`;

export function LoadBalancerSimulation() {
  const log = useActionLog<LbAction>();
  const lastActionTick = log.actions.at(-1)?.tick ?? 0;
  const ticks = Math.max(BASE_TICKS, lastActionTick + 240);
  const frames = useMemo(
    () =>
      runSimulation(loadBalancerModel, {
        params: DEFAULT_LB_PARAMS,
        seed: SEED,
        ticks,
        actions: log.actions,
      }),
    [log.actions, ticks],
  );
  const playback = usePlayback({ frameCount: frames.length, frameMs: FRAME_MS });
  const frame = frames[Math.min(playback.frame, frames.length - 1)]!;
  const { config, servers } = frame.state;
  const active = servers.filter((s) => !s.draining);

  /** Every change is recorded at the next tick, so the past stays exactly as it was. */
  const act = (action: LbAction) => {
    log.add(playback.frame + 1, action);
    if (!playback.playing) playback.seek(playback.frame + 1);
  };
  const configure = (patch: Partial<LbConfig>) => act({ type: "configure", config: patch });

  return (
    <SimulationPlayer
      kind="simulation"
      title="Load balancer simulation"
      description="Requests flow from clients through a load balancer to a pool of servers. You can change the routing algorithm, traffic and health checks, crash or restart servers, and add or remove servers, then watch latency and errors respond."
      frames={frames}
      playback={playback}
      aspectRatio="760 / 400"
      scene={(f) => <LoadBalancerScene state={f.state} />}
      positionLabel={(f) => seconds(f.index)}
      eventTime={seconds}
      assumptions={LB_ASSUMPTIONS}
      stats={(f) => {
        const latency = p95(f.state);
        const errors = recentErrors(f.state);
        const inRotation = f.state.servers.filter((s) => s.inRotation && !s.draining).length;
        return (
          <dl className="grid grid-cols-2 gap-x-4 gap-y-2 sm:grid-cols-4">
            <Stat label="Completed" value={f.state.totals.completed} />
            <Stat label="Errors (last 1 s)" value={errors} tone={errors > 0 ? "fail" : "ok"} />
            <Stat
              label="p95 latency (illustrative)"
              value={latency === undefined ? "—" : `${latency} ms`}
            />
            <Stat
              label="In rotation"
              value={`${inRotation} / ${f.state.servers.filter((s) => !s.draining).length}`}
              tone={inRotation === 0 ? "fail" : undefined}
            />
          </dl>
        );
      }}
      controls={
        <div className="space-y-5">
          <div className="flex flex-wrap gap-x-6 gap-y-4">
            <SegmentedControl
              label="Algorithm"
              value={config.algorithm}
              options={[
                { value: "round-robin", label: "Round robin" },
                { value: "least-connections", label: "Least connections" },
              ]}
              onChange={(algorithm) => configure({ algorithm })}
            />
            <SegmentedControl<TrafficLevel>
              label="Traffic"
              value={config.traffic}
              options={[
                { value: "low", label: "Low" },
                { value: "medium", label: "Medium" },
                { value: "high", label: "High" },
                { value: "overload", label: "Overload" },
              ]}
              onChange={(traffic) => configure({ traffic })}
            />
            <SegmentedControl
              label="Heavy requests"
              value={String(config.heavyShare)}
              options={[
                { value: "0", label: "None" },
                { value: "0.2", label: "20%" },
                { value: "0.4", label: "40%" },
              ]}
              onChange={(share) => configure({ heavyShare: Number(share) })}
            />
            <Toggle
              label="Health checks"
              description="probe servers and remove failures"
              checked={config.healthChecks}
              onChange={(healthChecks) => configure({ healthChecks })}
            />
          </div>

          <div>
            <p className="mb-2 text-xs font-medium text-fg-muted">Servers</p>
            <ul className="flex flex-wrap gap-2">
              {active.map((server) => (
                <li key={server.id}>
                  {server.up ? (
                    <ActionButton
                      tone="danger"
                      onClick={() => act({ type: "crash", server: server.id })}
                    >
                      <Zap aria-hidden className="size-3.5" /> Crash {server.id}
                    </ActionButton>
                  ) : (
                    <ActionButton
                      tone="positive"
                      onClick={() => act({ type: "restart", server: server.id })}
                    >
                      <Power aria-hidden className="size-3.5" /> Restart {server.id}
                    </ActionButton>
                  )}
                </li>
              ))}
              <li>
                <ActionButton
                  onClick={() => act({ type: "add-server" })}
                  disabled={active.length >= MAX_SERVERS}
                >
                  <Plus aria-hidden className="size-3.5" /> Add server
                </ActionButton>
              </li>
              <li>
                <ActionButton
                  onClick={() => act({ type: "remove-server" })}
                  disabled={active.length <= MIN_SERVERS}
                >
                  <Minus aria-hidden className="size-3.5" /> Remove server
                </ActionButton>
              </li>
              <li className="ml-auto">
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
              </li>
            </ul>
          </div>
        </div>
      }
    />
  );
}

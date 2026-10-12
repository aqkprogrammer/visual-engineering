"use client";

import { Minus, Plus, Power, RotateCcw, Trash2, Zap } from "lucide-react";
import { useMemo } from "react";
import {
  DEFAULT_KUBE_PARAMS,
  endpoints,
  kubernetesModel,
  MAX_REPLICAS,
  type KubeAction,
} from "@/lib/simulation/models/kubernetes";
import { runSimulation } from "@/lib/simulation/run";
import { cn } from "@/lib/utils/cn";
import { ActionButton, Stat } from "../../player/controls";
import { SimulationPlayer } from "../../player/simulation-player";
import { useActionLog } from "../../player/use-action-log";
import { usePlayback } from "../../player/use-playback";
import { KubernetesScene, STATUS_TONE } from "./kubernetes-scene";

const SEED = 1337;
const BASE_TICKS = 120;
const FRAME_MS = 700;

export const KUBE_ASSUMPTIONS = [
  "Time is compressed: each step stands for several seconds. Event messages quote the real default durations.",
  "One Deployment with one container per pod on three identical nodes; no resource limits or affinity rules.",
  "A container crash is injected directly; liveness probes and real application failures are not modelled.",
  "The scheduler picks the Ready node running the fewest pods; the real scheduler scores many more factors.",
  "Controllers react within one step; in a real cluster each hop goes through the API server.",
  "Rolling updates, PodDisruptionBudgets and persistent volumes are out of scope.",
];

const TONE_TEXT = {
  ok: "text-ok",
  warn: "text-warn",
  fail: "text-fail",
  muted: "text-fg-subtle",
} as const;

export function KubernetesSimulation() {
  const log = useActionLog<KubeAction>();
  const ticks = Math.max(BASE_TICKS, (log.actions.at(-1)?.tick ?? 0) + 80);
  const frames = useMemo(
    () =>
      runSimulation(kubernetesModel, {
        params: DEFAULT_KUBE_PARAMS,
        seed: SEED,
        ticks,
        actions: log.actions,
      }),
    [log.actions, ticks],
  );
  const playback = usePlayback({ frameCount: frames.length, frameMs: FRAME_MS });
  const state = frames[Math.min(playback.frame, frames.length - 1)]!.state;
  const eps = new Set(endpoints(state).map((p) => p.name));

  const act = (action: KubeAction) => {
    log.add(playback.frame + 1, action);
    if (!playback.playing) playback.seek(playback.frame + 1);
  };

  return (
    <SimulationPlayer
      kind="simulation"
      title="Kubernetes self-healing"
      description="A Deployment named web with pods spread over three nodes and a Service in front. You can crash containers, delete pods, fail and recover nodes and change the replica count, and watch each Kubernetes component react."
      frames={frames}
      playback={playback}
      aspectRatio="760 / 440"
      scene={(f) => <KubernetesScene state={f.state} />}
      positionLabel={(f) => `Step ${f.index}`}
      eventTime={(at) => `t+${at}`}
      assumptions={KUBE_ASSUMPTIONS}
      stats={(f) => {
        const ready = endpoints(f.state).length;
        return (
          <dl className="grid grid-cols-2 gap-x-4 gap-y-2 sm:grid-cols-4">
            <Stat label="Desired replicas" value={f.state.desired} />
            <Stat
              label="Ready endpoints"
              value={ready}
              tone={ready < f.state.desired ? "warn" : "ok"}
            />
            <Stat label="Pods (incl. terminating)" value={f.state.pods.length} />
            <Stat
              label="Container restarts"
              value={f.state.pods.reduce((n, p) => n + p.restarts, 0)}
            />
          </dl>
        );
      }}
      controls={
        <div className="space-y-5">
          <div className="flex flex-wrap items-end gap-x-6 gap-y-4">
            <div>
              <p className="mb-1.5 text-xs font-medium text-fg-muted">Replicas</p>
              <div className="flex items-center gap-2">
                <ActionButton
                  label="Scale down by one"
                  onClick={() => act({ type: "scale", replicas: state.desired - 1 })}
                  disabled={state.desired <= 0}
                >
                  <Minus aria-hidden className="size-3.5" />
                </ActionButton>
                <span className="w-6 text-center font-mono text-sm tabular-nums">
                  {state.desired}
                </span>
                <ActionButton
                  label="Scale up by one"
                  onClick={() => act({ type: "scale", replicas: state.desired + 1 })}
                  disabled={state.desired >= MAX_REPLICAS}
                >
                  <Plus aria-hidden className="size-3.5" />
                </ActionButton>
              </div>
            </div>
            <div>
              <p className="mb-1.5 text-xs font-medium text-fg-muted">Nodes</p>
              <ul className="flex flex-wrap gap-2">
                {state.nodes.map((node) => (
                  <li key={node.name}>
                    {node.healthy ? (
                      <ActionButton
                        tone="danger"
                        onClick={() => act({ type: "fail-node", node: node.name })}
                      >
                        <Zap aria-hidden className="size-3.5" /> Fail {node.name}
                      </ActionButton>
                    ) : (
                      <ActionButton
                        tone="positive"
                        onClick={() => act({ type: "recover-node", node: node.name })}
                      >
                        <Power aria-hidden className="size-3.5" /> Recover {node.name}
                      </ActionButton>
                    )}
                  </li>
                ))}
              </ul>
            </div>
            <div className="ml-auto">
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

          <div className="relative overflow-x-auto">
            <table className="w-full min-w-[36rem] font-mono text-xs">
              <caption className="mb-2 text-left font-sans text-xs font-medium text-fg-muted">
                kubectl get pods -o wide
              </caption>
              <thead>
                <tr className="text-left text-fg-subtle">
                  <th scope="col" className="py-1.5 pr-3 font-normal">
                    NAME
                  </th>
                  <th scope="col" className="py-1.5 pr-3 font-normal">
                    READY
                  </th>
                  <th scope="col" className="py-1.5 pr-3 font-normal">
                    STATUS
                  </th>
                  <th scope="col" className="py-1.5 pr-3 font-normal">
                    RESTARTS
                  </th>
                  <th scope="col" className="py-1.5 pr-3 font-normal">
                    NODE
                  </th>
                  <th scope="col" className="py-1.5 font-normal">
                    <span className="sr-only">Actions</span>
                  </th>
                </tr>
              </thead>
              <tbody>
                {state.pods.map((pod) => (
                  <tr key={pod.name} className="border-t border-border">
                    <th scope="row" className="py-1.5 pr-3 text-left font-normal">
                      {pod.name}
                      {eps.has(pod.name) && <span className="sr-only"> (Service endpoint)</span>}
                    </th>
                    <td className="py-1.5 pr-3">{pod.ready ? "1/1" : "0/1"}</td>
                    <td className={cn("py-1.5 pr-3", TONE_TEXT[STATUS_TONE[pod.status]])}>
                      {pod.status}
                    </td>
                    <td className="py-1.5 pr-3">{pod.restarts}</td>
                    <td className="py-1.5 pr-3">{pod.node ?? "<none>"}</td>
                    <td className="py-1 font-sans">
                      <div className="flex justify-end gap-1.5">
                        <ActionButton
                          tone="danger"
                          label={`Crash the container in ${pod.name}`}
                          onClick={() => act({ type: "crash-container", pod: pod.name })}
                          disabled={pod.status !== "Running"}
                        >
                          <Zap aria-hidden className="size-3.5" /> Crash
                        </ActionButton>
                        <ActionButton
                          label={`Delete pod ${pod.name}`}
                          onClick={() => act({ type: "delete-pod", pod: pod.name })}
                          disabled={pod.status === "Terminating"}
                        >
                          <Trash2 aria-hidden className="size-3.5" /> Delete
                        </ActionButton>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      }
    />
  );
}

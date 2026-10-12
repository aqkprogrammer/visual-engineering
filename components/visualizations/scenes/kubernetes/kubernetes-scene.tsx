import {
  endpoints,
  type KubeState,
  type Pod,
  type PodStatus,
} from "@/lib/simulation/models/kubernetes";
import { cn } from "@/lib/utils/cn";

const W = 760;
const H = 440;
const COL_W = 232;
const COL_GAP = 12;
const COL_X = (i: number) => 20 + i * (COL_W + COL_GAP);
const NODES_TOP = 150;
const POD_H = 46;
const POD_GAP = 8;

export const STATUS_TONE: Record<PodStatus, "ok" | "warn" | "fail" | "muted"> = {
  Running: "ok",
  Pending: "warn",
  ContainerCreating: "warn",
  Error: "fail",
  CrashLoopBackOff: "fail",
  Terminating: "muted",
};

const TONE_FILL = {
  ok: "fill-ok",
  warn: "fill-warn",
  fail: "fill-fail",
  muted: "fill-fg-subtle",
} as const;

export const shortName = (name: string) => `…${name.slice(-5)}`;

function PodCard({
  pod,
  x,
  y,
  endpoint,
  unreachable,
}: {
  pod: Pod;
  x: number;
  y: number;
  endpoint: boolean;
  unreachable: boolean;
}) {
  const tone = STATUS_TONE[pod.status];
  const terminating = pod.status === "Terminating";
  return (
    <g
      style={{
        transform: `translate(${x}px, ${y}px)`,
        transition: "transform var(--frame-ms) ease-out",
      }}
    >
      <rect
        width={COL_W - 24}
        height={POD_H}
        rx={7}
        strokeWidth={1}
        strokeDasharray={terminating || unreachable ? "4 4" : undefined}
        className={cn(
          terminating ? "fill-surface" : "fill-surface-2",
          tone === "fail" ? "stroke-fail" : endpoint ? "stroke-ok" : "stroke-border-strong",
        )}
      />
      <text x={10} y={18} className="fill-fg text-[12px]">
        web-{shortName(pod.name)}
      </text>
      <text x={10} y={35} className={cn("text-[11px]", TONE_FILL[tone])}>
        {pod.status}
      </text>
      <text x={COL_W - 34} y={18} textAnchor="end" className="fill-fg-muted text-[11px]">
        {pod.ready ? "1/1" : "0/1"} ready
      </text>
      <text x={COL_W - 34} y={35} textAnchor="end" className="fill-fg-subtle text-[11px]">
        {endpoint ? (unreachable ? "● endpoint (dead)" : "● endpoint") : `↻ ${pod.restarts}`}
      </text>
    </g>
  );
}

export function KubernetesScene({ state }: { state: KubeState }) {
  const eps = new Set(endpoints(state).map((p) => p.name));
  const pending = state.pods.filter((p) => p.node === null);
  const readyCount = endpoints(state).length;

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="absolute inset-0 h-full w-full font-mono" aria-hidden>
      {/* Control plane objects */}
      <g>
        <rect
          x={20}
          y={16}
          width={350}
          height={56}
          rx={8}
          className="fill-surface-2 stroke-accent"
          strokeWidth={1.5}
        />
        <text x={34} y={38} className="fill-fg text-[13px] font-medium">
          Deployment web
        </text>
        <text x={34} y={58} className="fill-fg-muted text-[11px]">
          desired {state.desired} · current{" "}
          {state.pods.filter((p) => p.status !== "Terminating").length} · ready {readyCount}
        </text>
        <rect
          x={390}
          y={16}
          width={350}
          height={56}
          rx={8}
          className="fill-surface-2 stroke-border-strong"
        />
        <text x={404} y={38} className="fill-fg text-[13px] font-medium">
          Service web
        </text>
        <text
          x={404}
          y={58}
          className={cn("text-[11px]", readyCount === 0 ? "fill-fail" : "fill-fg-muted")}
        >
          {readyCount} endpoint{readyCount === 1 ? "" : "s"} receiving traffic
        </text>
      </g>

      {/* Unscheduled pods */}
      <text x={20} y={100} className="fill-fg-subtle text-[11px]">
        Pending (not yet scheduled): {pending.length === 0 ? "none" : ""}
      </text>
      {pending.map((pod, i) => (
        <g key={pod.name}>
          <rect
            x={200 + i * 112}
            y={86}
            width={104}
            height={24}
            rx={6}
            className="fill-surface stroke-warn"
            strokeDasharray="4 3"
          />
          <text x={252 + i * 112} y={102} textAnchor="middle" className="fill-warn text-[11px]">
            {shortName(pod.name)}
          </text>
        </g>
      ))}

      {/* Nodes */}
      {state.nodes.map((node, i) => {
        const x = COL_X(i);
        const pods = state.pods.filter((p) => p.node === node.name);
        const detectedDown = !node.ready;
        const silentlyDown = !node.healthy && node.ready;
        return (
          <g key={node.name}>
            <rect
              x={x}
              y={NODES_TOP - 24}
              width={COL_W}
              height={H - NODES_TOP + 8}
              rx={10}
              strokeWidth={node.healthy ? 1 : 1.5}
              strokeDasharray={node.healthy ? undefined : "6 4"}
              className={cn("fill-surface", node.healthy ? "stroke-border-strong" : "stroke-fail")}
            />
            <text x={x + 12} y={NODES_TOP - 4} className="fill-fg text-[13px]">
              {node.name}
            </text>
            <text
              x={x + COL_W - 12}
              y={NODES_TOP - 4}
              textAnchor="end"
              className={cn("text-[11px]", detectedDown || silentlyDown ? "fill-fail" : "fill-ok")}
            >
              {detectedDown ? "✕ NotReady" : silentlyDown ? "✕ down · still Ready" : "✓ Ready"}
            </text>
            {pods.map((pod, j) => (
              <PodCard
                key={pod.name}
                pod={pod}
                x={x + 12}
                y={NODES_TOP + 10 + j * (POD_H + POD_GAP)}
                endpoint={eps.has(pod.name)}
                unreachable={!node.healthy}
              />
            ))}
          </g>
        );
      })}
    </svg>
  );
}

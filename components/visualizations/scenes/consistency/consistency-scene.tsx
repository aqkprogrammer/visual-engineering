import {
  countAt,
  REPLICA_LABEL,
  REPLICAS,
  rtt,
  type ClientId,
  type ConsistencyState,
  type ReplicaId,
} from "@/lib/simulation/models/consistency";
import { cn } from "@/lib/utils/cn";

const W = 760;
const H = 360;
const BOX = { w: 170, h: 66 };
const POS: Record<ReplicaId, { x: number; y: number }> = {
  us: { x: 150, y: 230 },
  eu: { x: 610, y: 230 },
  ap: { x: 380, y: 310 },
};
const CLIENT_POS: Record<ClientId, { x: number; y: number }> = {
  us: { x: 150, y: 70 },
  eu: { x: 610, y: 70 },
};

function Box({
  x,
  y,
  title,
  lines,
  tone,
}: {
  x: number;
  y: number;
  title: string;
  lines: string[];
  tone?: "accent" | "fail" | "warn";
}) {
  return (
    <g>
      <rect
        x={x - BOX.w / 2}
        y={y - BOX.h / 2}
        width={BOX.w}
        height={BOX.h}
        rx={9}
        strokeWidth={tone ? 2 : 1}
        className={cn(
          tone === "accent" && "fill-accent-soft stroke-accent",
          tone === "fail" && "fill-surface-2 stroke-fail",
          tone === "warn" && "fill-surface-2 stroke-warn",
          !tone && "fill-surface-2 stroke-border-strong",
        )}
      />
      <text x={x} y={y - 12} textAnchor="middle" className="fill-fg text-[12px] font-medium">
        {title}
      </text>
      {lines.map((l, i) => (
        <text
          key={i}
          x={x}
          y={y + 6 + i * 14}
          textAnchor="middle"
          className="fill-fg-subtle text-[10px]"
        >
          {l}
        </text>
      ))}
    </g>
  );
}

export function ConsistencyScene({ state }: { state: ConsistencyState }) {
  const counts = REPLICAS.map((id) => countAt(state, id));
  const disagree = new Set(counts).size > 1;
  const links: [ReplicaId, ReplicaId][] = [
    ["us", "eu"],
    ["us", "ap"],
    ["eu", "ap"],
  ];
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="absolute inset-0 h-full w-full font-mono" aria-hidden>
      {links.map(([a, b]) => {
        const cut = state.partitioned && (a === "eu" || b === "eu");
        const pa = POS[a];
        const pb = POS[b];
        const mx = (pa.x + pb.x) / 2;
        const my = (pa.y + pb.y) / 2;
        return (
          <g key={`${a}-${b}`}>
            <line
              x1={pa.x}
              y1={pa.y}
              x2={pb.x}
              y2={pb.y}
              strokeDasharray={cut ? "6 6" : undefined}
              strokeWidth={cut ? 2 : 1.5}
              className={cut ? "stroke-fail" : "stroke-border-strong"}
            />
            <rect x={mx - 34} y={my - 10} width={68} height={18} rx={4} className="fill-bg" />
            <text
              x={mx}
              y={my + 3}
              textAnchor="middle"
              className={cn("text-[10px]", cut ? "fill-fail" : "fill-fg-muted")}
            >
              {cut ? "✕ cut" : `${rtt(a, b)} ms`}
            </text>
          </g>
        );
      })}
      {REPLICAS.map((id, i) => (
        <Box
          key={id}
          x={POS[id].x}
          y={POS[id].y}
          title={`replica · ${REPLICA_LABEL[id]}`}
          lines={[
            `count: ${counts[i]}`,
            state.config.mode === "merge"
              ? `tally ${REPLICAS.map((k) => state.replicas[id].tally[k]).join(" + ")}`
              : "",
          ].filter(Boolean)}
          tone={disagree ? "warn" : "accent"}
        />
      ))}
      {(["us", "eu"] as const).map((c) => {
        const r = state.clients?.[c];
        return (
          <g key={c}>
            <line
              x1={CLIENT_POS[c].x}
              y1={CLIENT_POS[c].y + BOX.h / 2}
              x2={POS[c].x}
              y2={POS[c].y - BOX.h / 2}
              className="stroke-border-strong"
            />
            <Box
              x={CLIENT_POS[c].x}
              y={CLIENT_POS[c].y}
              title={`users · ${REPLICA_LABEL[c]}`}
              lines={[
                !r ? "—" : r.ok ? `see ${r.seen} likes` : "error: no majority",
                r?.latencyMs != null ? `answer in ${r.latencyMs} ms` : "",
              ].filter(Boolean)}
              tone={r && !r.ok ? "fail" : undefined}
            />
          </g>
        );
      })}
    </svg>
  );
}

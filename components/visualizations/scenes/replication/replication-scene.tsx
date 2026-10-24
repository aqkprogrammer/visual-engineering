import {
  lagBehind,
  leaderOf,
  type NodeId,
  type ReplicationState,
} from "@/lib/simulation/models/replication";
import { cn } from "@/lib/utils/cn";

const W = 760;
const H = 360;
const BOX = { w: 170, h: 74 };
const POS: Record<NodeId | "user", { x: number; y: number }> = {
  user: { x: 110, y: 180 },
  "db-1": { x: 400, y: 62 },
  "db-2": { x: 400, y: 298 },
  "db-3": { x: 650, y: 180 },
};

function anchor(from: { x: number; y: number }, to: { x: number; y: number }) {
  const dx = to.x - from.x;
  const dy = to.y - from.y;
  const scale = Math.min(
    BOX.w / 2 / Math.max(Math.abs(dx), 1e-6),
    BOX.h / 2 / Math.max(Math.abs(dy), 1e-6),
  );
  return { x: from.x + dx * scale, y: from.y + dy * scale };
}

function Arrow({
  from,
  to,
  className,
  dashed,
  label,
  offset = 0,
  labelAt = 0.5,
}: {
  from: { x: number; y: number };
  to: { x: number; y: number };
  className: string;
  dashed?: boolean;
  label?: string;
  /** Shift sideways, so a read and a write between the same boxes don't overlap. */
  offset?: number;
  /** Where along the arrow the label sits, from 0 (start) to 1 (end). */
  labelAt?: number;
}) {
  const a0 = anchor(from, to);
  const b0 = anchor(to, from);
  const len = Math.hypot(b0.x - a0.x, b0.y - a0.y) || 1;
  const nx = (-(b0.y - a0.y) / len) * offset;
  const ny = ((b0.x - a0.x) / len) * offset;
  const a = { x: a0.x + nx, y: a0.y + ny };
  const b = { x: b0.x + nx, y: b0.y + ny };
  return (
    <g>
      <line
        x1={a.x}
        y1={a.y}
        x2={b.x}
        y2={b.y}
        strokeWidth={2}
        strokeDasharray={dashed ? "5 5" : undefined}
        className={className}
        markerEnd="url(#repl-arrow)"
      />
      {label && (
        <text
          x={a.x + (b.x - a.x) * labelAt + 6}
          y={a.y + (b.y - a.y) * labelAt - 6}
          textAnchor="middle"
          className="fill-fg-muted text-[10px]"
        >
          {label}
        </text>
      )}
    </g>
  );
}

export function ReplicationScene({ state }: { state: ReplicationState }) {
  const leader = leaderOf(state);
  const read = state.read;
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="absolute inset-0 h-full w-full font-mono" aria-hidden>
      <defs>
        <marker
          id="repl-arrow"
          viewBox="0 0 10 10"
          refX="9"
          refY="5"
          markerWidth="6"
          markerHeight="6"
          orient="auto-start-reverse"
        >
          <path d="M0,0 L10,5 L0,10 z" className="fill-fg-muted" />
        </marker>
      </defs>

      {/* Replication streams. */}
      {leader &&
        state.nodes
          .filter((n) => n.role === "follower")
          .map((f) => (
            <Arrow
              key={f.id}
              from={POS[leader.id]}
              to={POS[f.id]}
              dashed={f.stopped}
              className={f.stopped ? "stroke-fail" : "stroke-border-strong"}
              labelAt={0.3}
              label={
                f.stopped
                  ? "stopped"
                  : f.inbox.length > 0
                    ? `${f.inbox.length} in flight`
                    : "up to date"
              }
            />
          ))}

      {/* Writes and reads. */}
      {leader ? (
        <Arrow from={POS.user} to={POS[leader.id]} className="stroke-accent" label="writes" />
      ) : (
        <text x={POS.user.x + 120} y={POS.user.y - 40} className="fill-fail text-[11px]">
          no leader — writes fail
        </text>
      )}
      {read && (
        <Arrow
          from={POS[read.from]}
          to={POS.user}
          className={read.stale ? "stroke-fail" : "stroke-ok"}
          label={read.stale ? "stale read" : "read"}
          labelAt={0.75}
          offset={leader && read.from === leader.id ? 12 : 0}
        />
      )}

      <g>
        <rect
          x={POS.user.x - BOX.w / 2}
          y={POS.user.y - BOX.h / 2}
          width={BOX.w}
          height={BOX.h}
          rx={9}
          className="fill-surface-2 stroke-border-strong"
        />
        <text
          x={POS.user.x}
          y={POS.user.y - 12}
          textAnchor="middle"
          className="fill-fg text-[12px] font-medium"
        >
          user
        </text>
        <text
          x={POS.user.x}
          y={POS.user.y + 6}
          textAnchor="middle"
          className="fill-fg-subtle text-[10px]"
        >
          profile saved at #{state.profileVersion}
        </text>
        <text
          x={POS.user.x}
          y={POS.user.y + 22}
          textAnchor="middle"
          className={cn("text-[10px]", read?.stale ? "fill-fail" : "fill-fg-subtle")}
        >
          {read ? (read.stale ? "read: old profile" : "read: current profile") : "—"}
        </text>
      </g>

      {state.nodes.map((n) => {
        const p = POS[n.id];
        const behind = n.role === "follower" ? lagBehind(state, n) : 0;
        return (
          <g key={n.id}>
            <rect
              x={p.x - BOX.w / 2}
              y={p.y - BOX.h / 2}
              width={BOX.w}
              height={BOX.h}
              rx={9}
              strokeWidth={n.role === "leader" ? 2.25 : 1}
              strokeDasharray={n.role === "down" ? "5 5" : undefined}
              className={cn(
                n.role === "leader" && "fill-accent-soft stroke-accent",
                n.role === "follower" && "fill-surface-2 stroke-border-strong",
                n.role === "down" && "fill-fail/10 stroke-fail",
              )}
            />
            <text
              x={p.x}
              y={p.y - 14}
              textAnchor="middle"
              className="fill-fg text-[12px] font-medium"
            >
              {n.id} · {n.role === "down" ? "crashed" : n.role}
            </text>
            <text x={p.x} y={p.y + 4} textAnchor="middle" className="fill-fg-subtle text-[10px]">
              {n.role === "down" ? "—" : `latest change #${n.version}`}
            </text>
            {n.role === "follower" && (
              <text
                x={p.x}
                y={p.y + 20}
                textAnchor="middle"
                className={cn("text-[10px]", behind > 5 ? "fill-warn" : "fill-fg-subtle")}
              >
                {n.stopped
                  ? "stopped"
                  : behind === 0
                    ? "caught up"
                    : `${behind} change${behind === 1 ? "" : "s"} behind`}
              </text>
            )}
          </g>
        );
      })}
      {state.failoverUntil !== null && (
        <text
          x={POS["db-1"].x}
          y={POS["db-1"].y + 58}
          textAnchor="middle"
          className="fill-warn text-[11px]"
        >
          failover in {state.failoverUntil - state.tick} steps
        </text>
      )}
    </svg>
  );
}

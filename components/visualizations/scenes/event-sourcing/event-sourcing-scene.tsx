import {
  PROJECTION_LABEL,
  replay,
  SNAPSHOT_EVERY,
  VISIBLE_EVENTS,
  type EventSourcingState,
  type Projection,
} from "@/lib/simulation/models/event-sourcing";
import { cn } from "@/lib/utils/cn";

const W = 760;
const H = 400;
const LOG = { x: 230, y: 40, w: 270, row: 26 };

function ReadModel({ p, latest, x, y }: { p: Projection; latest: number; x: number; y: number }) {
  const lag = latest - p.position;
  const status = p.paused
    ? "paused"
    : p.rebuilding
      ? "rebuilding"
      : lag > 0
        ? `${lag} behind`
        : "up to date";
  const categories = Object.entries(p.byCategory).filter(([, v]) => v > 0);
  const max = Math.max(1, ...categories.map(([, v]) => v));
  return (
    <g>
      <rect
        x={x}
        y={y}
        width={220}
        height={p.id === "spending" ? 120 : 64}
        rx={9}
        className={cn(
          "fill-surface-2",
          lag > 0 || p.paused ? "stroke-warn" : "stroke-border-strong",
        )}
      />
      <text x={x + 10} y={y + 18} className="fill-fg text-[12px]">
        {PROJECTION_LABEL[p.id]}
      </text>
      <text
        x={x + 210}
        y={y + 18}
        textAnchor="end"
        className={cn("text-[10px]", lag > 0 || p.paused ? "fill-warn" : "fill-fg-subtle")}
      >
        {status}
      </text>
      <text x={x + 10} y={y + 36} className="fill-fg-subtle text-[10px]">
        applied up to event {p.position}
      </text>
      {p.id === "balance" && (
        <text x={x + 10} y={y + 54} className="fill-fg text-[13px]">
          balance {p.balance}
        </text>
      )}
      {p.id === "statement" && (
        <text x={x + 10} y={y + 54} className="fill-fg text-[12px]">
          {p.lines} statement lines
        </text>
      )}
      {p.id === "spending" &&
        categories.map(([name, value], i) => (
          <g key={name}>
            <text x={x + 10} y={y + 56 + i * 18} className="fill-fg-muted text-[10px]">
              {name}
            </text>
            <rect
              x={x + 80}
              y={y + 47 + i * 18}
              width={(value / max) * 120}
              height={10}
              rx={2}
              className="fill-data"
            />
          </g>
        ))}
    </g>
  );
}

export function EventSourcingScene({ state }: { state: EventSourcingState }) {
  const latest = state.log.at(-1)?.seq ?? 0;
  const visible = state.log.slice(-VISIBLE_EVENTS);
  const balance = replay(state.log);

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="absolute inset-0 h-full w-full font-mono" aria-hidden>
      {/* Write side */}
      <text x={20} y={30} className="fill-fg-muted text-[11px]">
        write side (commands)
      </text>
      <rect
        x={20}
        y={40}
        width={180}
        height={92}
        rx={9}
        className="fill-surface-2 stroke-border-strong"
      />
      <text x={30} y={60} className="fill-fg text-[12px]">
        account
      </text>
      <text x={30} y={80} className="fill-fg-subtle text-[10px]">
        rebuilt from the log
      </text>
      <text x={30} y={100} className="fill-fg text-[13px]">
        balance {balance}
      </text>
      <text
        x={30}
        y={120}
        className={cn("text-[10px]", state.rejected ? "fill-warn" : "fill-fg-subtle")}
      >
        {state.rejected} command{state.rejected === 1 ? "" : "s"} rejected
      </text>
      <text x={20} y={154} className="fill-fg-subtle text-[10px]">
        replayed {state.lastRehydration} event{state.lastRehydration === 1 ? "" : "s"} to load
      </text>
      <text x={20} y={168} className="fill-fg-subtle text-[10px]">
        {state.config.snapshots ? `snapshot every ${SNAPSHOT_EVERY} events` : "no snapshots"}
      </text>
      <path d={`M 200 86 L ${LOG.x - 6} 86`} className="stroke-accent" strokeWidth={1.5} />
      <text x={203} y={100} className="fill-fg-subtle text-[9px]">
        append
      </text>

      {/* Event log */}
      <text x={LOG.x} y={30} className="fill-fg-muted text-[11px]">
        event log (append-only) · {latest} events
      </text>
      {visible.map((e, i) => {
        const y = LOG.y + i * LOG.row;
        const snapshot = state.config.snapshots && e.seq % SNAPSHOT_EVERY === 0;
        const sign = e.type === "MoneyWithdrawn" ? "−" : "+";
        return (
          <g key={e.seq}>
            <rect
              x={LOG.x}
              y={y}
              width={LOG.w}
              height={LOG.row - 4}
              rx={4}
              className={cn(
                "fill-surface",
                e.type === "WithdrawalReversed" ? "stroke-data" : "stroke-border",
              )}
            />
            <text x={LOG.x + 8} y={y + 15} className="fill-fg-subtle text-[10px]">
              #{e.seq}
            </text>
            <text x={LOG.x + 44} y={y + 15} className="fill-fg text-[10px]">
              {e.type}
            </text>
            <text
              x={LOG.x + LOG.w - 8}
              y={y + 15}
              textAnchor="end"
              className="fill-fg-muted text-[10px]"
            >
              {sign}
              {e.amount}
              {e.reverses ? ` (undoes #${e.reverses})` : ""}
            </text>
            {snapshot && (
              <text x={LOG.x - 6} y={y + 15} textAnchor="end" className="fill-accent text-[9px]">
                snap
              </text>
            )}
          </g>
        );
      })}

      {/* Read side */}
      <path d={`M ${LOG.x + LOG.w + 6} 86 L 515 86`} className="stroke-data" strokeWidth={1.5} />
      <text x={516} y={30} className="fill-fg-muted text-[11px]">
        read side (queries)
      </text>
      {state.projections.map((p, i) => (
        <ReadModel key={p.id} p={p} latest={latest} x={520} y={40 + i * 76} />
      ))}
    </svg>
  );
}

import { BOUNDED_CAPACITY, RATES, TICK_MS, type QueueState } from "@/lib/simulation/models/queue";
import { cn } from "@/lib/utils/cn";

const W = 760;
const H = 380;
const SLOT = 13;
const PER_ROW = 20;
const VISIBLE = 80;
const Q = { x: 190, y: 90 };

function ageClass(ageTicks: number) {
  const seconds = (ageTicks * TICK_MS) / 1000;
  if (seconds < 1) return "fill-accent";
  if (seconds < 5) return "fill-warn";
  return "fill-fail";
}

export function QueueScene({ state }: { state: QueueState }) {
  const visible = state.queue.slice(0, VISIBLE);
  const hidden = state.queue.length - visible.length;
  const rows = Math.ceil(BOUNDED_CAPACITY / PER_ROW);
  const work = state.config.slowDownstream ? 6 : 2;
  const consumerGap = Math.min(52, 300 / Math.max(state.consumers.length, 1));

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="absolute inset-0 h-full w-full font-mono" aria-hidden>
      {/* Producers */}
      <rect
        x={16}
        y={140}
        width={130}
        height={64}
        rx={9}
        className="fill-surface-2 stroke-border-strong"
      />
      <text x={81} y={166} textAnchor="middle" className="fill-fg text-[13px]">
        producers
      </text>
      <text x={81} y={186} textAnchor="middle" className="fill-fg-subtle text-[11px]">
        {RATES[state.config.rate]} msg/s
      </text>
      <line
        x1={146}
        y1={172}
        x2={Q.x - 6}
        y2={172}
        className={state.rejectedNow > 0 ? "stroke-fail" : "stroke-accent"}
        strokeWidth={1.75}
      />
      {state.rejectedNow > 0 && (
        <text x={168} y={160} textAnchor="middle" className="fill-fail text-[11px]">
          ✕ {state.rejectedNow} full
        </text>
      )}

      {/* Queue */}
      <rect
        x={Q.x - 6}
        y={Q.y - 30}
        width={PER_ROW * SLOT + 12}
        height={190}
        rx={10}
        className="fill-surface stroke-accent"
        strokeWidth={1.5}
      />
      <text x={Q.x} y={Q.y - 12} className="fill-fg text-[13px] font-medium">
        queue
      </text>
      <text
        x={Q.x + PER_ROW * SLOT}
        y={Q.y - 12}
        textAnchor="end"
        className="fill-fg-muted text-[11px]"
      >
        {state.queue.length} waiting
        {state.config.bounded ? ` / ${BOUNDED_CAPACITY} max` : " · unbounded"}
      </text>
      {state.config.bounded && (
        <rect
          x={Q.x - 2}
          y={Q.y - 2}
          width={PER_ROW * SLOT + 4}
          height={rows * SLOT + 4}
          rx={4}
          strokeDasharray="4 3"
          className="fill-none stroke-fg-subtle"
        />
      )}
      {visible.map((m, i) => {
        const x = Q.x + (i % PER_ROW) * SLOT;
        const y = Q.y + Math.floor(i / PER_ROW) * SLOT;
        return m.poison ? (
          <path
            key={m.id}
            d={`M${x + 1} ${y + 1} L${x + 10} ${y + 10} M${x + 10} ${y + 1} L${x + 1} ${y + 10}`}
            className="stroke-fail"
            strokeWidth={2}
          />
        ) : (
          <rect
            key={m.id}
            x={x}
            y={y}
            width={11}
            height={11}
            rx={2}
            className={ageClass(state.tick - m.createdAt)}
          />
        );
      })}
      {hidden > 0 && (
        <text x={Q.x} y={Q.y + 4 * SLOT + 22} className="fill-fail text-[12px] font-medium">
          + {hidden} more waiting
        </text>
      )}

      {/* Consumers */}
      <text x={570} y={44} className="fill-fg-subtle text-[11px]">
        consumers{state.config.slowDownstream ? " · 3× slower" : ""}
      </text>
      {state.consumers.map((c, i) => {
        const y = 56 + i * consumerGap;
        const busy = c.message !== null;
        const progress = busy ? 1 - c.remaining / work : 0;
        return (
          <g key={c.id}>
            <line
              x1={Q.x + PER_ROW * SLOT + 6}
              y1={172}
              x2={566}
              y2={y + 18}
              className="stroke-border-strong"
            />
            <rect
              x={566}
              y={y}
              width={176}
              height={36}
              rx={7}
              className={cn("fill-surface-2", busy ? "stroke-accent" : "stroke-border-strong")}
            />
            <text x={578} y={y + 15} className="fill-fg text-[11px]">
              consumer {c.id}
            </text>
            <text
              x={732}
              y={y + 15}
              textAnchor="end"
              className={cn(
                "text-[10px]",
                busy ? (c.message!.poison ? "fill-fail" : "fill-accent") : "fill-fg-subtle",
              )}
            >
              {busy
                ? `#${c.message!.id}${c.message!.receives > 1 ? ` (try ${c.message!.receives})` : ""}`
                : "idle"}
            </text>
            <rect x={578} y={y + 23} width={152} height={5} rx={2.5} className="fill-bg" />
            <rect
              x={578}
              y={y + 23}
              width={152 * progress}
              height={5}
              rx={2.5}
              className="fill-accent"
            />
          </g>
        );
      })}

      {/* Dead-letter queue */}
      <rect
        x={190}
        y={290}
        width={272}
        height={52}
        rx={9}
        className={cn(
          "fill-surface-2",
          state.dlq.length > 0 ? "stroke-fail" : "stroke-border-strong",
        )}
      />
      <text x={204} y={312} className="fill-fg text-[12px]">
        dead-letter queue
      </text>
      <text
        x={204}
        y={330}
        className={cn("text-[11px]", state.dlq.length > 0 ? "fill-fail" : "fill-fg-subtle")}
      >
        {state.dlq.length} message{state.dlq.length === 1 ? "" : "s"} failed 3 times
      </text>

      <g className="text-[10px]">
        <rect x={16} y={H - 22} width={10} height={10} rx={2} className="fill-accent" />
        <text x={30} y={H - 13} className="fill-fg-subtle">
          &lt;1 s old
        </text>
        <rect x={90} y={H - 22} width={10} height={10} rx={2} className="fill-warn" />
        <text x={104} y={H - 13} className="fill-fg-subtle">
          1–5 s
        </text>
        <rect x={150} y={H - 22} width={10} height={10} rx={2} className="fill-fail" />
        <text x={164} y={H - 13} className="fill-fg-subtle">
          &gt;5 s
        </text>
        <path d={`M${216} ${H - 21} l8 8 m0 -8 l-8 8`} className="stroke-fail" strokeWidth={2} />
        <text x={230} y={H - 13} className="fill-fg-subtle">
          poison message
        </text>
      </g>
    </svg>
  );
}

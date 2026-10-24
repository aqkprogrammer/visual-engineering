import { STEP_MS, type RetriesState } from "@/lib/simulation/models/retries";
import type { Frame } from "@/lib/simulation/types";
import { cn } from "@/lib/utils/cn";

const W = 760;
const H = 360;
const perSecond = (n: number) => Math.round(n * (1000 / STEP_MS));

function Box({
  x,
  y,
  w,
  h,
  title,
  lines,
  tone,
}: {
  x: number;
  y: number;
  w: number;
  h: number;
  title: string;
  lines: string[];
  tone?: "warn" | "fail" | "ok";
}) {
  return (
    <g>
      <rect
        x={x}
        y={y}
        width={w}
        height={h}
        rx={9}
        className={cn(
          "fill-surface-2",
          tone === "fail"
            ? "stroke-fail"
            : tone === "warn"
              ? "stroke-warn"
              : tone === "ok"
                ? "stroke-ok"
                : "stroke-border-strong",
        )}
        strokeWidth={tone ? 2 : 1}
      />
      <text
        x={x + w / 2}
        y={y + 22}
        textAnchor="middle"
        className="fill-fg text-[12px] font-medium"
      >
        {title}
      </text>
      {lines.map((line, i) => (
        <text
          key={i}
          x={x + w / 2}
          y={y + 40 + i * 15}
          textAnchor="middle"
          className="fill-fg-subtle text-[10px]"
        >
          {line}
        </text>
      ))}
    </g>
  );
}

function Arrow({
  x1,
  x2,
  y,
  label,
  className,
}: {
  x1: number;
  x2: number;
  y: number;
  label: string;
  className?: string;
}) {
  return (
    <g>
      <line
        x1={x1}
        y1={y}
        x2={x2 - 6}
        y2={y}
        strokeWidth={2}
        className={className ?? "stroke-border-strong"}
      />
      <path
        d={`M${x2 - 8},${y - 5} L${x2},${y} L${x2 - 8},${y + 5} z`}
        className={(className ?? "stroke-border-strong").replace("stroke-", "fill-")}
      />
      <text x={(x1 + x2) / 2} y={y - 8} textAnchor="middle" className="fill-fg-muted text-[10px]">
        {label}
      </text>
    </g>
  );
}

export function RetriesScene({
  state,
  history,
}: {
  state: RetriesState;
  history: Frame<RetriesState>[];
}) {
  const m = state.metrics;
  const sent = m ? perSecond(m.sent) : 0;
  const capacity = perSecond(state.capacity);
  const overloaded = sent > capacity;
  const breakerTone =
    state.breaker === "open" ? "fail" : state.breaker === "half-open" ? "warn" : undefined;

  // Calls sent per second over time, against capacity.
  const chart = { x: 40, y: 220, w: 680, h: 110 };
  const span = Math.max(100, history.length);
  const top = Math.max(450, ...history.map((f) => perSecond(f.state.metrics?.sent ?? 0)));
  const px = (i: number) => chart.x + (i / span) * chart.w;
  const py = (v: number) => chart.y + chart.h - (v / top) * chart.h;
  const sentLine = history
    .map((f, i) => `${px(i)},${py(perSecond(f.state.metrics?.sent ?? 0))}`)
    .join(" ");
  const capLine = history.map((f, i) => `${px(i)},${py(perSecond(f.state.capacity))}`).join(" ");

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="absolute inset-0 h-full w-full font-mono" aria-hidden>
      <Box
        x={20}
        y={40}
        w={120}
        h={80}
        title="users"
        lines={["100 requests/s", "each waits for one"]}
      />
      <Box
        x={210}
        y={40}
        w={170}
        h={110}
        title="your service"
        lines={[
          m ? `retries ${perSecond(m.retries)}/s` : "retries —",
          `timeout ${state.config.timeout === "short" ? 1 : 3} s`,
          state.config.breaker ? `breaker: ${state.breaker}` : "no circuit breaker",
          m && m.rejectedByBreaker > 0 ? `${perSecond(m.rejectedByBreaker)}/s failed fast` : "",
        ].filter(Boolean)}
        tone={breakerTone}
      />
      <Box
        x={500}
        y={40}
        w={230}
        h={110}
        title="dependency"
        lines={[
          `capacity ${capacity}/s`,
          m ? `queue ${Math.round(m.queue)} calls` : "queue 0",
          m ? `wasted on timed-out calls ${perSecond(m.wasted)}/s` : "",
        ].filter(Boolean)}
        tone={overloaded ? "fail" : state.slowUntil !== null ? "warn" : undefined}
      />
      <Arrow x1={140} x2={210} y={80} label="100/s" />
      <Arrow
        x1={380}
        x2={500}
        y={80}
        label={`${sent}/s sent`}
        className={overloaded ? "stroke-fail" : "stroke-accent"}
      />

      <text x={chart.x} y={chart.y - 12} className="fill-fg-muted text-[11px]">
        calls reaching the dependency per second, against its capacity
      </text>
      <line
        x1={chart.x}
        y1={chart.y + chart.h}
        x2={chart.x + chart.w}
        y2={chart.y + chart.h}
        className="stroke-border-strong"
      />
      <polyline
        points={capLine}
        fill="none"
        strokeWidth={1.5}
        strokeDasharray="5 4"
        className="stroke-fg-subtle"
      />
      <polyline
        points={sentLine}
        fill="none"
        strokeWidth={2}
        className={overloaded ? "stroke-fail" : "stroke-accent"}
      />
      <text
        x={chart.x + chart.w}
        y={chart.y - 12}
        textAnchor="end"
        className="fill-fg-subtle text-[10px]"
      >
        dashed: capacity · top {top}/s
      </text>
    </svg>
  );
}

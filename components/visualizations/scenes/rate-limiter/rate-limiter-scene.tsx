import {
  acceptedLastSecond,
  LABELS,
  slidingEstimate,
  TIMELINE_TICKS,
  WINDOW_TICKS,
  type LimiterState,
} from "@/lib/simulation/models/rate-limiter";
import { cn } from "@/lib/utils/cn";

const W = 760;
const H = 380;
const PLOT = { x: 24, y: 150, w: 712, bottom: 344 };
const COL = PLOT.w / TIMELINE_TICKS;
const DOT = 7.6;

function Bar({
  x,
  y,
  w,
  value,
  max,
  tone,
}: {
  x: number;
  y: number;
  w: number;
  value: number;
  max: number;
  tone: "accent" | "warn" | "fail";
}) {
  const ratio = Math.max(0, Math.min(1, value / max));
  return (
    <g>
      <rect
        x={x}
        y={y}
        width={w}
        height={14}
        rx={7}
        className="fill-surface-2 stroke-border-strong"
      />
      <rect
        x={x}
        y={y}
        width={w * ratio}
        height={14}
        rx={7}
        className={cn(
          tone === "accent" ? "fill-accent" : tone === "warn" ? "fill-warn" : "fill-fail",
        )}
        style={{ transition: "width var(--frame-ms) linear" }}
      />
    </g>
  );
}

function AlgorithmState({ state }: { state: LimiterState }) {
  const { algorithm, limit } = state.config;
  const position = state.tick % WINDOW_TICKS;
  switch (algorithm) {
    case "token-bucket":
      return (
        <g>
          <path
            d="M40 36 L52 124 H124 L136 36"
            fill="none"
            className="stroke-border-strong"
            strokeWidth={1.5}
          />
          <clipPath id="bucket">
            <path d="M40 36 L52 124 H124 L136 36 Z" />
          </clipPath>
          <rect
            x={36}
            width={104}
            y={124 - (88 * state.tokens) / limit}
            height={(88 * state.tokens) / limit}
            clipPath="url(#bucket)"
            className="fill-accent/60"
            style={{ transition: "y var(--frame-ms) linear, height var(--frame-ms) linear" }}
          />
          <text x={170} y={60} className="fill-fg text-[14px] font-medium">
            {state.tokens.toFixed(1)} / {limit} tokens
          </text>
          <text x={170} y={82} className="fill-fg-muted text-[12px]">
            Each request spends one token. Refill: {limit / WINDOW_TICKS} token every 100 ms.
          </text>
          <text x={170} y={102} className="fill-fg-muted text-[12px]">
            An empty bucket means 429 until tokens refill.
          </text>
        </g>
      );
    case "fixed-window":
      return (
        <g>
          <text x={40} y={50} className="fill-fg text-[14px] font-medium">
            {state.windowCount} / {limit} used in the current window
          </text>
          <Bar
            x={40}
            y={62}
            w={420}
            value={state.windowCount}
            max={limit}
            tone={state.windowCount >= limit ? "fail" : "accent"}
          />
          <text x={40} y={104} className="fill-fg-muted text-[12px]">
            Window progress: {position * 100} ms of 1000 ms — the counter resets to 0 at each
            boundary.
          </text>
          <Bar x={40} y={114} w={420} value={position} max={WINDOW_TICKS} tone="warn" />
        </g>
      );
    case "sliding-log":
      return (
        <g>
          <text x={40} y={50} className="fill-fg text-[14px] font-medium">
            {state.log.length} / {limit} accepted in the last 1000 ms
          </text>
          <Bar
            x={40}
            y={62}
            w={420}
            value={state.log.length}
            max={limit}
            tone={state.log.length >= limit ? "fail" : "accent"}
          />
          <text x={40} y={104} className="fill-fg-muted text-[12px]">
            Stores a timestamp per accepted request and counts those inside the rolling window.
          </text>
          <text x={40} y={122} className="fill-fg-muted text-[12px]">
            Exact, but memory grows with the limit.
          </text>
        </g>
      );
    case "sliding-counter": {
      const overlap = 1 - position / WINDOW_TICKS;
      const estimate = slidingEstimate(state);
      return (
        <g>
          <text x={40} y={50} className="fill-fg text-[14px] font-medium">
            estimate = {state.previousWindowCount} × {Math.round(overlap * 100)}% +{" "}
            {state.windowCount} = {estimate.toFixed(1)} / {limit}
          </text>
          <Bar
            x={40}
            y={62}
            w={420}
            value={estimate}
            max={limit}
            tone={estimate + 1 > limit ? "fail" : "accent"}
          />
          <text x={40} y={104} className="fill-fg-muted text-[12px]">
            previous window&rsquo;s count × share of it still inside the last second + current
            count.
          </text>
          <text x={40} y={122} className="fill-fg-muted text-[12px]">
            Two counters per client; assumes the previous window&rsquo;s requests were evenly
            spread.
          </text>
        </g>
      );
    }
  }
}

export function RateLimiterScene({ state }: { state: LimiterState }) {
  const firstTick = Math.max(1, state.tick - TIMELINE_TICKS + 1);
  const x = (tick: number) => PLOT.x + (tick - firstTick) * COL;
  const rolling =
    state.config.algorithm === "sliding-log" || state.config.algorithm === "sliding-counter";

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="absolute inset-0 h-full w-full font-mono" aria-hidden>
      <text x={W - 24} y={30} textAnchor="end" className="fill-fg-subtle text-[11px]">
        {LABELS[state.config.algorithm]} · limit {state.config.limit}/s ·{" "}
        {acceptedLastSecond(state)} accepted in the last second
      </text>
      <AlgorithmState state={state} />

      {/* Timeline axis and one-second window boundaries */}
      <line
        x1={PLOT.x}
        y1={PLOT.bottom}
        x2={PLOT.x + PLOT.w}
        y2={PLOT.bottom}
        className="stroke-border-strong"
      />
      {Array.from({ length: TIMELINE_TICKS }, (_, i) => firstTick + i)
        .filter((t) => t % WINDOW_TICKS === 0)
        .map((t) => (
          <g key={t}>
            <line
              x1={x(t)}
              y1={PLOT.y}
              x2={x(t)}
              y2={PLOT.bottom + 6}
              strokeDasharray="3 4"
              className={
                state.config.algorithm === "fixed-window" ? "stroke-warn" : "stroke-border"
              }
            />
            <text
              x={x(t)}
              y={PLOT.bottom + 20}
              textAnchor="middle"
              className="fill-fg-subtle text-[10px]"
            >
              {(t / WINDOW_TICKS).toFixed(0)} s
            </text>
          </g>
        ))}
      {rolling && state.tick > 0 && (
        <rect
          x={x(Math.max(firstTick, state.tick - WINDOW_TICKS + 1)) - 2}
          y={PLOT.y - 4}
          width={Math.min(WINDOW_TICKS, state.tick) * COL}
          height={PLOT.bottom - PLOT.y + 4}
          rx={4}
          className="fill-accent/8 stroke-accent/50"
          strokeDasharray="4 3"
        />
      )}

      {state.timeline.map((t) => {
        const cx = x(t.at) + COL / 2;
        return (
          <g key={t.at}>
            {Array.from({ length: t.accepted }, (_, i) => (
              <circle
                key={`a${i}`}
                cx={cx}
                cy={PLOT.bottom - 6 - i * DOT}
                r={3.2}
                className="fill-accent"
              />
            ))}
            {Array.from({ length: t.rejected }, (_, i) => {
              const cy = PLOT.bottom - 6 - (t.accepted + i) * DOT;
              return (
                <path
                  key={`r${i}`}
                  d={`M${cx - 3} ${cy - 3} L${cx + 3} ${cy + 3} M${cx + 3} ${cy - 3} L${cx - 3} ${cy + 3}`}
                  className="stroke-fail"
                  strokeWidth={1.6}
                />
              );
            })}
          </g>
        );
      })}

      <g className="text-[11px]">
        <circle cx={PLOT.x + 4} cy={H - 10} r={3.2} className="fill-accent" />
        <text x={PLOT.x + 14} y={H - 6} className="fill-fg-subtle">
          accepted
        </text>
        <path
          d={`M${PLOT.x + 88} ${H - 13} l6 6 m0 -6 l-6 6`}
          className="stroke-fail"
          strokeWidth={1.6}
        />
        <text x={PLOT.x + 100} y={H - 6} className="fill-fg-subtle">
          rejected (429)
        </text>
        <text x={W - 24} y={H - 6} textAnchor="end" className="fill-fg-subtle">
          each column = 100 ms
        </text>
      </g>
    </svg>
  );
}

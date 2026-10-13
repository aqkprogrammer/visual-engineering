import {
  HISTORY_STEPS,
  MAX_INSTANCES,
  type AutoscalingState,
} from "@/lib/simulation/models/autoscaling";

const W = 760;
const H = 400;
const CHART = { x: 64, y: 30, w: 670, h: 250 };
const MAX_LOAD = 3000;

export function AutoscalingScene({ state }: { state: AutoscalingState }) {
  const history = state.history;
  const first = history[0]?.at ?? 0;
  const x = (t: number) => CHART.x + ((t - first) / Math.max(1, HISTORY_STEPS - 1)) * CHART.w;
  const y = (v: number) => CHART.y + CHART.h - (Math.min(v, MAX_LOAD) / MAX_LOAD) * CHART.h;
  const load = history.map((h) => `${x(h.at).toFixed(1)},${y(h.load).toFixed(1)}`).join(" ");
  // Capacity changes in steps: draw it as a staircase.
  const capacity = history
    .flatMap((h, i) => {
      const prev = history[i - 1];
      return prev
        ? [
            `${x(h.at).toFixed(1)},${y(prev.capacity).toFixed(1)}`,
            `${x(h.at).toFixed(1)},${y(h.capacity).toFixed(1)}`,
          ]
        : [`${x(h.at).toFixed(1)},${y(h.capacity).toFixed(1)}`];
    })
    .join(" ");
  const target = state.config.target;
  const m = state.metrics;

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="absolute inset-0 h-full w-full font-mono" aria-hidden>
      {[0, 1000, 2000, 3000].map((v) => (
        <g key={v}>
          <line x1={CHART.x} x2={CHART.x + CHART.w} y1={y(v)} y2={y(v)} className="stroke-border" />
          <text
            x={CHART.x - 8}
            y={y(v) + 4}
            textAnchor="end"
            className="fill-fg-subtle text-[10px]"
          >
            {v.toLocaleString("en-US")}
          </text>
        </g>
      ))}
      <text x={CHART.x} y={CHART.y - 12} className="fill-fg-muted text-[11px]">
        requests per second
      </text>

      {history.length > 1 && (
        <>
          <polyline points={capacity} fill="none" className="stroke-accent" strokeWidth={2} />
          <polyline
            points={load}
            fill="none"
            className="stroke-warn"
            strokeWidth={2}
            strokeDasharray="6 3"
          />
        </>
      )}
      {/* Overload: demand above capacity. */}
      {history.map((h) =>
        h.load > h.capacity ? (
          <rect
            key={h.at}
            x={x(h.at) - 2}
            y={y(h.load)}
            width={4}
            height={Math.max(0, y(h.capacity) - y(h.load))}
            className="fill-fail opacity-60"
          />
        ) : null,
      )}

      <g>
        <line
          x1={CHART.x}
          x2={CHART.x + 24}
          y1={CHART.y + CHART.h + 26}
          y2={CHART.y + CHART.h + 26}
          className="stroke-warn"
          strokeWidth={2}
          strokeDasharray="6 3"
        />
        <text x={CHART.x + 30} y={CHART.y + CHART.h + 30} className="fill-fg-muted text-[11px]">
          demand
        </text>
        <line
          x1={CHART.x + 100}
          x2={CHART.x + 124}
          y1={CHART.y + CHART.h + 26}
          y2={CHART.y + CHART.h + 26}
          className="stroke-accent"
          strokeWidth={2}
        />
        <text x={CHART.x + 130} y={CHART.y + CHART.h + 30} className="fill-fg-muted text-[11px]">
          serving capacity
        </text>
        <rect
          x={CHART.x + 262}
          y={CHART.y + CHART.h + 20}
          width={10}
          height={12}
          className="fill-fail opacity-60"
        />
        <text x={CHART.x + 278} y={CHART.y + CHART.h + 30} className="fill-fg-muted text-[11px]">
          requests failing
        </text>
        <text
          x={CHART.x + CHART.w}
          y={CHART.y + CHART.h + 30}
          textAnchor="end"
          className="fill-fg-subtle text-[11px]"
        >
          target {Math.round(target * 100)}% CPU
        </text>
      </g>

      {/* Fleet */}
      <text x={CHART.x} y={H - 34} className="fill-fg-muted text-[11px]">
        instances: {state.inService} serving
        {state.launching.length > 0 && `, ${state.launching.length} starting`}
        {m && ` · ${Math.round(m.utilisation * 100)}% CPU`}
      </text>
      {Array.from({ length: MAX_INSTANCES }, (_, i) => {
        const serving = i < state.inService;
        const starting = !serving && i < state.inService + state.launching.length;
        return (
          <rect
            key={i}
            x={CHART.x + i * 22}
            y={H - 24}
            width={16}
            height={16}
            rx={3}
            className={
              serving
                ? "fill-accent"
                : starting
                  ? "fill-none stroke-accent"
                  : "fill-none stroke-border"
            }
            strokeDasharray={starting ? "3 2" : undefined}
          />
        );
      })}
    </svg>
  );
}

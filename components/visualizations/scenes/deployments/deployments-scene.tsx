import {
  ALARM_THRESHOLD,
  DEPLOY_AT,
  STRATEGY_LABEL,
  type DeployState,
} from "@/lib/simulation/models/deployments";
import { cn } from "@/lib/utils/cn";

const W = 760;
const H = 400;
const CHART = { x: 60, y: 250, w: 680, h: 110 };
/** The chart shows minutes 0–40 and error rates up to 20%. */
const SPAN = 40;
const MAX_ERROR = 0.2;

const PHASE_LABEL: Record<DeployState["phase"], string> = {
  waiting: "waiting to deploy",
  deploying: "deploying v2",
  complete: "rollout complete",
  "rolling-back": "rolling back",
  "rolled-back": "rolled back to v1",
};

function Fleet({
  x,
  y,
  label,
  count,
  version,
  down,
}: {
  x: number;
  y: number;
  label: string;
  count: number;
  version: "v1" | "v2";
  down: boolean;
}) {
  return (
    <g>
      <text x={x} y={y - 8} className="fill-fg-muted text-[11px]">
        {label} · {count} instance{count === 1 ? "" : "s"}
      </text>
      {Array.from({ length: 10 }, (_, i) => {
        const filled = i < count;
        return (
          <rect
            key={i}
            x={x + i * 26}
            y={y}
            width={20}
            height={20}
            rx={4}
            className={cn(
              !filled && "fill-none stroke-border",
              filled && down && "fill-none stroke-fail",
              filled && !down && (version === "v1" ? "fill-accent" : "fill-data"),
            )}
            strokeDasharray={filled && down ? "3 2" : undefined}
          />
        );
      })}
    </g>
  );
}

export function DeploymentsScene({ state }: { state: DeployState }) {
  const m = state.metrics;
  const down = m?.downtime ?? false;
  const v2 = state.v2Share;
  const x = (t: number) => CHART.x + (Math.min(t, SPAN) / SPAN) * CHART.w;
  const y = (e: number) => CHART.y + CHART.h - (Math.min(e, MAX_ERROR) / MAX_ERROR) * CHART.h;
  const points = state.history.map((h) => `${x(h.at).toFixed(1)},${y(h.errorRate).toFixed(1)}`);
  const blueGreen = state.config.strategy === "blue-green";

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="absolute inset-0 h-full w-full font-mono" aria-hidden>
      <text x={20} y={28} className="fill-fg text-[13px]">
        {STRATEGY_LABEL[state.config.strategy]} · {PHASE_LABEL[state.phase]}
      </text>
      <text x={W - 20} y={28} textAnchor="end" className="fill-fg-subtle text-[11px]">
        {state.config.buggy ? "v2 has a bug" : "v2 is healthy"}
      </text>

      {/* Traffic split */}
      <text x={20} y={62} className="fill-fg-muted text-[11px]">
        traffic
      </text>
      <rect x={80} y={50} width={660} height={18} rx={4} className="fill-surface" />
      {!down && (
        <>
          <rect x={80} y={50} width={660 * (1 - v2)} height={18} rx={4} className="fill-accent" />
          <rect
            x={80 + 660 * (1 - v2)}
            y={50}
            width={660 * v2}
            height={18}
            rx={4}
            className="fill-data"
          />
        </>
      )}
      <text x={86} y={63} className="fill-accent-fg text-[11px]">
        {!down && v2 < 0.92 ? `v1 ${Math.round((1 - v2) * 100)}%` : ""}
      </text>
      <text x={734} y={63} textAnchor="end" className="fill-bg text-[11px]">
        {!down && v2 > 0.08 ? `v2 ${Math.round(v2 * 100)}%` : ""}
      </text>
      {down && (
        <text x={410} y={63} textAnchor="middle" className="fill-fail text-[11px]">
          nothing serving — instances restarting
        </text>
      )}

      {/* Fleets */}
      <Fleet
        x={80}
        y={110}
        label={blueGreen ? "blue (v1)" : "v1"}
        count={state.instances.v1}
        version="v1"
        down={down}
      />
      <Fleet
        x={80}
        y={175}
        label={blueGreen ? "green (v2)" : "v2"}
        count={state.instances.v2}
        version="v2"
        down={down}
      />

      {/* Error-rate timeline */}
      <text x={CHART.x} y={CHART.y - 10} className="fill-fg-muted text-[11px]">
        error rate over time
      </text>
      <rect
        x={CHART.x}
        y={CHART.y}
        width={CHART.w}
        height={CHART.h}
        className="fill-none stroke-border"
      />
      <line
        x1={CHART.x}
        x2={CHART.x + CHART.w}
        y1={y(ALARM_THRESHOLD)}
        y2={y(ALARM_THRESHOLD)}
        className="stroke-warn"
        strokeDasharray="4 4"
      />
      <text
        x={CHART.x + CHART.w - 4}
        y={y(ALARM_THRESHOLD) - 4}
        textAnchor="end"
        className="fill-warn text-[10px]"
      >
        alarm {ALARM_THRESHOLD * 100}%
      </text>
      <line
        x1={x(DEPLOY_AT)}
        x2={x(DEPLOY_AT)}
        y1={CHART.y}
        y2={CHART.y + CHART.h}
        className="stroke-fg-subtle"
        strokeDasharray="2 3"
      />
      <text x={x(DEPLOY_AT) + 4} y={CHART.y + 12} className="fill-fg-subtle text-[10px]">
        deploy starts
      </text>
      {points.length > 1 && (
        <polyline points={points.join(" ")} fill="none" className="stroke-fail" strokeWidth={2} />
      )}
      <text x={CHART.x - 6} y={CHART.y + 4} textAnchor="end" className="fill-fg-subtle text-[10px]">
        {MAX_ERROR * 100}%+
      </text>
      <text
        x={CHART.x - 6}
        y={CHART.y + CHART.h}
        textAnchor="end"
        className="fill-fg-subtle text-[10px]"
      >
        0%
      </text>
      <text x={CHART.x} y={CHART.y + CHART.h + 16} className="fill-fg-subtle text-[10px]">
        0 min
      </text>
      <text
        x={CHART.x + CHART.w}
        y={CHART.y + CHART.h + 16}
        textAnchor="end"
        className="fill-fg-subtle text-[10px]"
      >
        {SPAN} min
      </text>
    </svg>
  );
}

import {
  ORIGIN_REGION,
  REGION_LABEL,
  REGIONS,
  REQUESTS_PER_REGION,
  type CdnState,
  type Region,
} from "@/lib/simulation/models/cdn";
import { cn } from "@/lib/utils/cn";

const W = 760;
const H = 360;
const COL: Record<Region, number> = { americas: 140, europe: 380, asia: 620 };
const BOX = { w: 190, h: 70 };
const perSecond = (n: number) => {
  const r = Math.round(n);
  return `${r} request${r === 1 ? "" : "s"}/s`;
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
  tone?: "accent" | "warn" | "fail";
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
          tone === "accent" ? "fill-accent-soft stroke-accent" : "fill-surface-2",
          tone === "warn" && "stroke-warn",
          tone === "fail" && "stroke-fail",
          !tone && "stroke-border-strong",
        )}
      />
      <text x={x} y={y - 14} textAnchor="middle" className="fill-fg text-[12px] font-medium">
        {title}
      </text>
      {lines.map((line, i) => (
        <text
          key={i}
          x={x}
          y={y + 4 + i * 14}
          textAnchor="middle"
          className="fill-fg-subtle text-[10px]"
        >
          {line}
        </text>
      ))}
    </g>
  );
}

export function CdnScene({ state }: { state: CdnState }) {
  const m = state.metrics;
  const shield = state.config.cdn && state.config.shield;
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="absolute inset-0 h-full w-full font-mono" aria-hidden>
      {/* Origin row. */}
      <Box
        x={COL[ORIGIN_REGION]}
        y={300}
        title="origin"
        lines={[m ? perSecond(m.originRequests) : "—", "answers in 50 ms"]}
        tone={m && m.originRequests > 100 ? "fail" : undefined}
      />
      {shield && (
        <Box
          x={COL.europe}
          y={300}
          title="origin shield"
          lines={["shared cache", "beside the origin"]}
        />
      )}

      {REGIONS.map((region) => {
        const r = m?.regions[region];
        const hit = r ? r.hits / r.requests : 0;
        const latency = r?.latencyMs ?? 0;
        const staleShare = r ? r.stale / r.requests : 0;
        const x = COL[region];
        return (
          <g key={region}>
            <Box
              x={x}
              y={60}
              title={`users · ${REGION_LABEL[region]}`}
              lines={[
                `${REQUESTS_PER_REGION} requests/s`,
                r ? `wait ${Math.round(latency)} ms` : "—",
              ]}
              tone={latency > 120 ? "warn" : undefined}
            />
            {state.config.cdn ? (
              <Box
                x={x}
                y={180}
                title={`edge · ${REGION_LABEL[region]}`}
                lines={[
                  r ? `${(hit * 100).toFixed(1)}% served from cache` : "—",
                  staleShare > 0.005
                    ? `${Math.round(staleShare * 100)}% old versions`
                    : "up to date",
                ]}
                tone={staleShare > 0.005 ? "warn" : "accent"}
              />
            ) : (
              <text x={x} y={184} textAnchor="middle" className="fill-fg-subtle text-[11px]">
                no CDN: straight to the origin
              </text>
            )}
            <line
              x1={x}
              y1={95}
              x2={x}
              y2={state.config.cdn ? 145 : 165}
              className="stroke-border-strong"
              strokeWidth={1.5}
            />
            {/* Edge (or users) to origin or shield. */}
            <line
              x1={x}
              y1={state.config.cdn ? 215 : 200}
              x2={shield && region !== ORIGIN_REGION ? COL.europe : COL[ORIGIN_REGION]}
              y2={265}
              strokeDasharray={state.config.cdn ? "4 4" : undefined}
              strokeWidth={state.config.cdn ? 1 : 2.5}
              className={state.config.cdn ? "stroke-fg-subtle" : "stroke-fail"}
            />
          </g>
        );
      })}
      {shield && (
        <line
          x1={COL.europe - BOX.w / 2}
          y1={300}
          x2={COL[ORIGIN_REGION] + BOX.w / 2}
          y2={300}
          className="stroke-fg-subtle"
          strokeDasharray="4 4"
        />
      )}
    </svg>
  );
}

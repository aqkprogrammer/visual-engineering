import {
  BUCKETS,
  REQUESTS_PER_STEP,
  serviceName,
  type ServiceCallsState,
  type ServiceHealth,
} from "@/lib/simulation/models/service-calls";
import { cn } from "@/lib/utils/cn";

const W = 760;
const H = 400;
const HIST = { x: 60, y: 270, w: 660, h: 90 };

const BUCKET_LABEL = ["≤25", "≤50", "≤100", "≤200", "≤300", "≤500", ">500"];

function healthClass(h: ServiceHealth) {
  return h === "down" ? "stroke-fail" : h === "slow" ? "stroke-warn" : "stroke-border-strong";
}

function healthText(h: ServiceHealth) {
  return h === "down" ? "down" : h === "slow" ? "slow" : "";
}

export function ServiceCallsScene({ state }: { state: ServiceCallsState }) {
  const { config, health } = state;
  const n = health.length;
  const monolith = config.architecture === "monolith";
  const fanOut = config.topology === "fan-out";
  const m = state.metrics;

  // Layout for the services row (chain) or column (fan-out).
  const boxW = fanOut ? 150 : Math.min(110, (560 - (n - 1) * 8) / n);
  const boxH = fanOut ? Math.min(34, 200 / n - 4) : 46;
  const pos = (i: number) =>
    fanOut ? { x: 520, y: 30 + i * (boxH + 4) } : { x: 170 + i * (boxW + 8), y: 110 };

  const maxBucket = Math.max(1, ...(m?.buckets ?? [1]));

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="absolute inset-0 h-full w-full font-mono" aria-hidden>
      {/* Front end */}
      <rect
        x={20}
        y={110}
        width={120}
        height={46}
        rx={8}
        className="fill-surface-2 stroke-border-strong"
      />
      <text x={80} y={130} textAnchor="middle" className="fill-fg text-[12px]">
        {monolith ? "web request" : "front end"}
      </text>
      <text x={80} y={146} textAnchor="middle" className="fill-fg-subtle text-[10px]">
        {REQUESTS_PER_STEP} requests/s
      </text>

      {monolith && (
        <>
          <rect
            x={155}
            y={70}
            width={585}
            height={130}
            rx={12}
            className="fill-none stroke-accent"
            strokeDasharray="6 4"
          />
          <text x={165} y={88} className="fill-accent text-[11px]">
            one process: in-process calls, shared fate
          </text>
        </>
      )}

      {health.map((h, i) => {
        const p = pos(i);
        const from = fanOut || i === 0 ? { x: 140, y: 133 } : { x: pos(i - 1).x + boxW, y: 133 };
        const optional = i === n - 1;
        return (
          <g key={i}>
            {!monolith && (
              <line
                x1={from.x}
                y1={fanOut ? 133 : from.y}
                x2={p.x}
                y2={p.y + boxH / 2}
                className={h === "down" ? "stroke-fail" : "stroke-accent"}
                strokeWidth={1.5}
                strokeDasharray={h === "down" ? "4 3" : undefined}
              />
            )}
            <rect
              x={p.x}
              y={p.y}
              width={boxW}
              height={boxH}
              rx={7}
              className={cn("fill-surface-2", healthClass(h))}
              strokeWidth={h === "healthy" ? 1 : 2}
              strokeDasharray={optional ? "5 3" : undefined}
            />
            <text
              x={p.x + 8}
              y={p.y + (fanOut ? boxH / 2 + 4 : 19)}
              className="fill-fg-muted text-[10px]"
            >
              {fanOut
                ? serviceName(i, n, config.architecture)
                : optional
                  ? "recs"
                  : `${monolith ? "mod" : "svc"} ${i + 1}`}
            </text>
            {healthText(h) && (
              <text
                x={p.x + boxW - 6}
                y={p.y + (fanOut ? boxH / 2 + 4 : 36)}
                textAnchor="end"
                className={cn("text-[10px]", h === "down" ? "fill-fail" : "fill-warn")}
              >
                {healthText(h)}
              </text>
            )}
          </g>
        );
      })}
      {!fanOut && (
        <text x={170} y={182} className="fill-fg-subtle text-[10px]">
          {monolith ? "modules call each other in memory" : "each call waits for the next: a chain"}
        </text>
      )}
      {fanOut && !monolith && (
        <text x={300} y={250} className="fill-fg-subtle text-[10px]">
          called in parallel: the slowest answer decides
        </text>
      )}

      {/* Latency histogram for this second's successful requests */}
      <text x={HIST.x} y={HIST.y - 12} className="fill-fg-muted text-[11px]">
        response times this second (ms)
        {m ? ` · median ${m.p50} · slowest 1% ${m.p99}` : ""}
      </text>
      {BUCKETS.map((_, i) => {
        const count = m?.buckets[i] ?? 0;
        const bw = HIST.w / BUCKETS.length - 8;
        const bx = HIST.x + i * (HIST.w / BUCKETS.length);
        const bh = (count / maxBucket) * HIST.h;
        return (
          <g key={i}>
            <rect
              x={bx}
              y={HIST.y + HIST.h - bh}
              width={bw}
              height={bh}
              rx={3}
              className={i >= 4 ? "fill-warn" : "fill-accent"}
            />
            <text
              x={bx + bw / 2}
              y={HIST.y + HIST.h + 14}
              textAnchor="middle"
              className="fill-fg-subtle text-[10px]"
            >
              {BUCKET_LABEL[i]}
            </text>
            {count > 0 && (
              <text
                x={bx + bw / 2}
                y={HIST.y + HIST.h - bh - 4}
                textAnchor="middle"
                className="fill-fg-muted text-[10px]"
              >
                {count}
              </text>
            )}
          </g>
        );
      })}
    </svg>
  );
}

import {
  BOTTLENECK_THRESHOLD,
  type SandboxState,
  type Tier,
} from "@/lib/simulation/models/sandbox";
import { cn } from "@/lib/utils/cn";

const W = 760;
const H = 400;

const rate = (n: number) =>
  n >= 10_000 ? `${Math.round(n / 1000)}k/s` : `${Math.round(n).toLocaleString("en-US")}/s`;

function tone(u: number | undefined) {
  if (u === undefined) return "ok";
  if (u >= 1) return "fail";
  if (u >= BOTTLENECK_THRESHOLD) return "warn";
  return "ok";
}

/** A utilisation bar with its percentage written next to it, so colour is never the only cue. */
function Bar({ x, y, width, u }: { x: number; y: number; width: number; u: number | undefined }) {
  const t = tone(u);
  const shown = u === undefined ? 0 : Number.isFinite(u) ? u : 9.99;
  return (
    <g>
      <rect x={x} y={y} width={width} height={6} rx={3} className="fill-surface" />
      <rect
        x={x}
        y={y}
        width={width * Math.min(1, shown)}
        height={6}
        rx={3}
        className={cn(
          "transition-[width] duration-[var(--frame-ms)]",
          t === "fail" ? "fill-fail" : t === "warn" ? "fill-warn" : "fill-accent",
        )}
      />
      <text
        x={x + width + 6}
        y={y + 6}
        className={cn(
          "text-[11px]",
          t === "fail" ? "fill-fail" : t === "warn" ? "fill-warn" : "fill-fg-subtle",
        )}
      >
        {u === undefined ? "" : Number.isFinite(u) ? `${Math.round(u * 100)}%` : "down"}
      </text>
    </g>
  );
}

function Box({
  x,
  y,
  w,
  h,
  title,
  lines,
  bottleneck,
  dimmed,
}: {
  x: number;
  y: number;
  w: number;
  h: number;
  title: string;
  lines: string[];
  bottleneck?: boolean;
  dimmed?: boolean;
}) {
  return (
    <g className={dimmed ? "opacity-40" : undefined}>
      <rect
        x={x}
        y={y}
        width={w}
        height={h}
        rx={9}
        className={cn("fill-surface-2", bottleneck ? "stroke-warn" : "stroke-border-strong")}
        strokeWidth={bottleneck ? 2.5 : 1}
        strokeDasharray={dimmed ? "4 4" : undefined}
      />
      {bottleneck && (
        <text x={x + w / 2} y={y + h + 15} textAnchor="middle" className="fill-warn text-[11px]">
          ▲ bottleneck
        </text>
      )}
      <text x={x + 10} y={y + 19} className="fill-fg text-[13px]">
        {title}
      </text>
      {lines.map((line, i) => (
        <text key={line} x={x + 10} y={y + 36 + i * 15} className="fill-fg-subtle text-[11px]">
          {line}
        </text>
      ))}
    </g>
  );
}

function Edge({
  from,
  to,
  label,
  failing,
  idle,
}: {
  from: [number, number];
  to: [number, number];
  label?: string;
  failing?: boolean;
  idle?: boolean;
}) {
  const [x1, y1] = from;
  const [x2, y2] = to;
  const mx = (x1 + x2) / 2;
  return (
    <g>
      <path
        d={`M ${x1} ${y1} C ${mx} ${y1}, ${mx} ${y2}, ${x2} ${y2}`}
        fill="none"
        className={idle ? "stroke-border" : failing ? "stroke-fail" : "stroke-accent"}
        strokeWidth={idle ? 1 : 1.75}
        strokeDasharray={idle ? "3 4" : undefined}
      />
      {label && (
        <text
          x={mx}
          y={(y1 + y2) / 2 - 6}
          textAnchor="middle"
          className={cn("text-[11px]", failing ? "fill-fail" : "fill-fg-muted")}
        >
          {label}
        </text>
      )}
    </g>
  );
}

export function SandboxScene({ state }: { state: SandboxState }) {
  const a = state.architecture;
  const m = state.metrics;
  const u = (tier: Tier) => m?.utilisation[tier];
  const isBottleneck = (tier: Tier) => m?.bottleneck === tier;
  const alive = a.appServers - state.failedServers;

  // App server column: one small box per server.
  const appTop = 70;
  const appHeight = 270;
  const slot = Math.min(34, appHeight / a.appServers);
  const appX = 300;
  const appMid = appTop + appHeight / 2;

  const cacheBox = { x: 470, y: 40, w: 120, h: 72 };
  const queueBox = { x: 470, y: 270, w: 120, h: 86 };
  const primaryBox = { x: 625, y: 165, w: 125, h: 86 };
  const replicaBox = { x: 625, y: 34, w: 125, h: 86 };

  const readsToDb = m ? m.reads - m.cacheHits : 0;
  const readTarget: [number, number] =
    a.readReplicas > 0
      ? [replicaBox.x, replicaBox.y + replicaBox.h / 2]
      : [primaryBox.x, primaryBox.y + 24];
  const readSource: [number, number] = a.cache
    ? [cacheBox.x + cacheBox.w, cacheBox.y + cacheBox.h / 2]
    : [appX + 130, appMid - 20];

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="absolute inset-0 h-full w-full font-mono" aria-hidden>
      {/* Edges first, so boxes sit on top. */}
      <Edge from={[110, 205]} to={[150, 205]} />
      <Edge
        from={[240, 205]}
        to={[appX, appMid]}
        label={m ? rate(m.appServed) : undefined}
        failing={(m?.appRejected ?? 0) > 0}
      />
      {a.cache && (
        <Edge
          from={[appX + 130, appMid - 20]}
          to={[cacheBox.x, cacheBox.y + cacheBox.h / 2]}
          label={m ? `${rate(m.reads)} reads` : undefined}
        />
      )}
      <Edge
        from={readSource}
        to={readTarget}
        label={m ? `${rate(readsToDb)} ${a.cache ? "misses" : "reads"}` : undefined}
        failing={(m?.readsFailed ?? 0) > 0}
        idle={m !== null && readsToDb < 0.5}
      />
      {a.asyncWrites ? (
        <>
          <Edge
            from={[appX + 130, appMid + 20]}
            to={[queueBox.x, queueBox.y + queueBox.h / 2]}
            label={m ? `${rate(m.writes)} writes` : undefined}
          />
          <Edge
            from={[queueBox.x + queueBox.w, queueBox.y + queueBox.h / 2]}
            to={[primaryBox.x, primaryBox.y + primaryBox.h - 20]}
            label={m ? rate(m.drained) : undefined}
            idle={m !== null && m.drained < 0.5}
          />
        </>
      ) : (
        <Edge
          from={[appX + 130, appMid + 20]}
          to={[primaryBox.x, primaryBox.y + primaryBox.h - 20]}
          label={m ? `${rate(m.writes)} writes` : undefined}
          failing={(m?.writesFailed ?? 0) > 0}
        />
      )}

      <Box x={10} y={170} w={100} h={70} title="clients" lines={[m ? rate(m.offered) : "idle"]} />
      <Box x={150} y={170} w={90} h={70} title="balancer" lines={["round robin"]} />
      {m && m.appRejected > 0 && (
        <text x={270} y={250} textAnchor="middle" className="fill-fail text-[11px]">
          ✕ {rate(m.appRejected)} rejected
        </text>
      )}

      {/* App servers */}
      <g>
        <rect
          x={appX - 10}
          y={appTop - 30}
          width={150}
          height={appHeight + 58}
          rx={11}
          className={cn("fill-none", isBottleneck("app") ? "stroke-warn" : "stroke-border")}
          strokeWidth={isBottleneck("app") ? 2.5 : 1}
        />
        {isBottleneck("app") && (
          <text x={appX + 65} y={appTop - 37} textAnchor="middle" className="fill-warn text-[11px]">
            ▲ bottleneck
          </text>
        )}
        <text x={appX} y={appTop - 12} className="fill-fg text-[13px]">
          app servers
        </text>
        {Array.from({ length: a.appServers }, (_, i) => {
          const down = i >= alive;
          return (
            <g key={i}>
              <rect
                x={appX}
                y={appTop + i * slot}
                width={130}
                height={slot - 6}
                rx={5}
                className={down ? "fill-none stroke-fail" : "fill-surface-2 stroke-border-strong"}
                strokeDasharray={down ? "4 3" : undefined}
              />
              <text
                x={appX + 8}
                y={appTop + i * slot + (slot - 6) / 2 + 4}
                className={cn("text-[11px]", down ? "fill-fail" : "fill-fg-muted")}
              >
                {down ? `app-${i + 1} ✕ down` : `app-${i + 1}`}
              </text>
            </g>
          );
        })}
        <Bar x={appX} y={appTop + appHeight + 8} width={100} u={u("app")} />
      </g>

      {/* Cache */}
      {a.cache ? (
        <g>
          <Box
            {...cacheBox}
            title="cache"
            lines={[`hit ratio ${Math.round((m?.hitRatio ?? a.cacheHitRatio) * 100)}%`]}
          />
        </g>
      ) : (
        <Box {...cacheBox} title="no cache" lines={["every read hits", "the database"]} dimmed />
      )}

      {/* Write queue */}
      {a.asyncWrites ? (
        <g>
          <Box
            {...queueBox}
            title="write queue"
            lines={[
              `${Math.round(m?.backlog ?? 0).toLocaleString("en-US")} waiting`,
              `${a.workers} worker${a.workers === 1 ? "" : "s"}`,
            ]}
            bottleneck={isBottleneck("workers")}
          />
          <Bar x={queueBox.x + 10} y={queueBox.y + queueBox.h - 14} width={70} u={u("workers")} />
        </g>
      ) : (
        <Box
          {...queueBox}
          title="no queue"
          lines={["writes go straight", "to the primary"]}
          dimmed
        />
      )}

      {/* Database */}
      {a.readReplicas > 0 ? (
        <g>
          <Box
            {...replicaBox}
            title={`replicas ×${a.readReplicas}`}
            lines={[m ? `${rate(m.replicaLoad)} of ${rate(m.replicaCapacity)}` : "reads only"]}
            bottleneck={isBottleneck("replicas")}
          />
          <Bar
            x={replicaBox.x + 10}
            y={replicaBox.y + replicaBox.h - 16}
            width={70}
            u={u("replicas")}
          />
        </g>
      ) : (
        <Box {...replicaBox} title="no replicas" lines={["reads go to", "the primary"]} dimmed />
      )}
      <Box
        {...primaryBox}
        title={state.databaseDegraded ? "primary (slow)" : "primary"}
        lines={[m ? `${rate(m.primaryLoad)} of ${rate(m.primaryCapacity)}` : "reads + writes"]}
        bottleneck={isBottleneck("primary")}
      />
      <Bar x={primaryBox.x + 10} y={primaryBox.y + primaryBox.h - 16} width={70} u={u("primary")} />
    </svg>
  );
}

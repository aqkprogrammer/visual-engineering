import {
  TRANSIT_TICKS,
  type LbState,
  type Request,
  type Server,
} from "@/lib/simulation/models/load-balancer";
import { cn } from "@/lib/utils/cn";

const W = 760;
const H = 400;
const CLIENT = { x: 16, w: 112, cy: 200, h: 64 };
const LB = { x: 236, w: 112, cy: 200, h: 84 };
const SERVER = { x: 516, w: 228 };
const TOP = 24;
const BOTTOM = 376;

type Point = { x: number; y: number };

function serverLayout(count: number) {
  const slot = (BOTTOM - TOP) / Math.max(count, 1);
  const h = Math.min(60, slot - 10);
  return (index: number) => ({ cy: TOP + slot * (index + 0.5), h });
}

function bezier(p0: Point, p1: Point, p2: Point, p3: Point, t: number): Point {
  const u = 1 - t;
  return {
    x: u ** 3 * p0.x + 3 * u ** 2 * t * p1.x + 3 * u * t ** 2 * p2.x + t ** 3 * p3.x,
    y: u ** 3 * p0.y + 3 * u ** 2 * t * p1.y + 3 * u * t ** 2 * p2.y + t ** 3 * p3.y,
  };
}

function edge(cy: number) {
  const from = { x: LB.x + LB.w, y: LB.cy };
  const to = { x: SERVER.x, y: cy };
  const c1 = { x: from.x + 80, y: from.y };
  const c2 = { x: to.x - 80, y: to.y };
  return {
    from,
    to,
    c1,
    c2,
    d: `M${from.x} ${from.y} C${c1.x} ${c1.y} ${c2.x} ${c2.y} ${to.x} ${to.y}`,
  };
}

function packetPosition(
  request: Request,
  serverCy: (id: string) => number | undefined,
): Point | null {
  if (request.stage === "incoming") return { x: (CLIENT.x + CLIENT.w + LB.x) / 2, y: CLIENT.cy };
  const cy = serverCy(request.server);
  if (cy === undefined) return null;
  const e = edge(cy);
  const t = (TRANSIT_TICKS - request.hopLeft) / TRANSIT_TICKS;
  return bezier(e.from, e.c1, e.c2, e.to, t);
}

type Status = { text: string; tone: "ok" | "warn" | "fail" | "muted" };

export function serverStatus(server: Server): Status {
  if (server.draining) return { text: "⇣ draining", tone: "muted" };
  if (!server.up && server.inRotation) return { text: "✕ down · still in rotation", tone: "fail" };
  if (!server.up) return { text: "✕ down · removed", tone: "fail" };
  if (!server.inRotation) return { text: "… awaiting health checks", tone: "warn" };
  return { text: "✓ in rotation", tone: "ok" };
}

const TONE_FILL = {
  ok: "fill-ok",
  warn: "fill-warn",
  fail: "fill-fail",
  muted: "fill-fg-subtle",
} as const;

export function LoadBalancerScene({ state }: { state: LbState }) {
  const layout = serverLayout(state.servers.length);
  const cyById = new Map(state.servers.map((s, i) => [s.id, layout(i).cy]));
  const probing =
    state.config.healthChecks && state.tick > 0 && state.tick % state.params.checkInterval === 0;
  const workers = state.params.workersPerServer;

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="absolute inset-0 h-full w-full font-mono" aria-hidden>
      {/* Wires */}
      <line
        x1={CLIENT.x + CLIENT.w}
        y1={CLIENT.cy}
        x2={LB.x}
        y2={LB.cy}
        className="stroke-border-strong"
        strokeWidth={1.5}
      />
      {state.servers.map((server, i) => {
        const cy = layout(i).cy;
        const dead = !server.up;
        return (
          <path
            key={server.id}
            d={edge(cy).d}
            fill="none"
            strokeWidth={1.5}
            className={cn(dead || !server.inRotation ? "stroke-border" : "stroke-border-strong")}
            strokeDasharray={server.inRotation && !server.draining ? undefined : "3 5"}
          />
        );
      })}
      {probing &&
        state.servers.map((server, i) => (
          <path
            key={`probe-${server.id}`}
            d={edge(layout(i).cy).d}
            fill="none"
            strokeWidth={2}
            strokeDasharray="1 7"
            strokeLinecap="round"
            className={server.up ? "stroke-ok" : "stroke-fail"}
          />
        ))}

      {/* Clients */}
      <rect
        x={CLIENT.x}
        y={CLIENT.cy - CLIENT.h / 2}
        width={CLIENT.w}
        height={CLIENT.h}
        rx={8}
        className="fill-surface-2 stroke-border-strong"
      />
      <text
        x={CLIENT.x + CLIENT.w / 2}
        y={CLIENT.cy - 4}
        textAnchor="middle"
        className="fill-fg text-[13px]"
      >
        clients
      </text>
      <text
        x={CLIENT.x + CLIENT.w / 2}
        y={CLIENT.cy + 14}
        textAnchor="middle"
        className="fill-fg-subtle text-[11px]"
      >
        {state.config.traffic} traffic
      </text>

      {/* Load balancer */}
      <rect
        x={LB.x}
        y={LB.cy - LB.h / 2}
        width={LB.w}
        height={LB.h}
        rx={10}
        className="fill-surface-2 stroke-accent"
        strokeWidth={1.75}
      />
      <text
        x={LB.x + LB.w / 2}
        y={LB.cy - 14}
        textAnchor="middle"
        className="fill-fg text-[13px] font-medium"
      >
        load balancer
      </text>
      <text
        x={LB.x + LB.w / 2}
        y={LB.cy + 6}
        textAnchor="middle"
        className="fill-fg-muted text-[11px]"
      >
        {state.config.algorithm === "round-robin" ? "round robin" : "least connections"}
      </text>
      <text
        x={LB.x + LB.w / 2}
        y={LB.cy + 24}
        textAnchor="middle"
        className="fill-fg-subtle text-[11px]"
      >
        checks {state.config.healthChecks ? "on" : "off"}
      </text>
      {(state.failedNow.lb ?? 0) > 0 && (
        <text
          x={LB.x + LB.w / 2}
          y={LB.cy + LB.h / 2 + 18}
          textAnchor="middle"
          className="fill-fail text-[12px]"
        >
          ✕ {state.failedNow.lb} × 503
        </text>
      )}

      {/* Servers */}
      {state.servers.map((server, i) => {
        const { cy, h } = layout(i);
        const status = serverStatus(server);
        const y = cy - h / 2;
        const compact = h < 50;
        const failed = state.failedNow[server.id] ?? 0;
        return (
          <g key={server.id}>
            <rect
              x={SERVER.x}
              y={y}
              width={SERVER.w}
              height={h}
              rx={8}
              strokeWidth={server.up ? 1 : 1.5}
              strokeDasharray={server.up && !server.draining ? undefined : "5 4"}
              className={cn(
                server.up ? "fill-surface-2" : "fill-surface",
                status.tone === "fail"
                  ? "stroke-fail"
                  : status.tone === "warn"
                    ? "stroke-warn"
                    : "stroke-border-strong",
              )}
            />
            <text x={SERVER.x + 12} y={cy + (compact ? 4 : -6)} className="fill-fg text-[13px]">
              {server.id}
              {compact && (
                <tspan className={TONE_FILL[status.tone]}> {status.text.split(" ")[0]}</tspan>
              )}
            </text>
            {!compact && (
              <text
                x={SERVER.x + 12}
                y={cy + 13}
                className={cn("text-[11px]", TONE_FILL[status.tone])}
              >
                {status.text}
              </text>
            )}
            {/* Worker slots: filled = busy */}
            {Array.from({ length: workers }, (_, w) => (
              <rect
                key={w}
                x={SERVER.x + SERVER.w - 12 - (workers - w) * 13}
                y={cy - (compact ? 5 : 15)}
                width={10}
                height={10}
                rx={2}
                className={
                  w < server.processing.length ? "fill-accent" : "fill-none stroke-border-strong"
                }
              />
            ))}
            {server.queue.length > 0 && (
              <text x={SERVER.x + 86} y={cy + (compact ? 4 : -6)} className="fill-warn text-[11px]">
                +{server.queue.length} queued
              </text>
            )}
            {failed > 0 && (
              <text
                x={SERVER.x - 8}
                y={cy - h / 2 - 4}
                textAnchor="end"
                className="fill-fail text-[12px]"
              >
                ✕ {failed}
              </text>
            )}
          </g>
        );
      })}

      {/* Requests in flight */}
      {state.network.map((request) => {
        const p = packetPosition(request, (id) => cyById.get(id));
        if (!p) return null;
        const heavy = request.cost >= 18;
        return (
          <circle
            key={request.id}
            cx={0}
            cy={0}
            r={heavy ? 6.5 : 4}
            className={heavy ? "fill-data" : "fill-accent"}
            style={{
              transform: `translate(${p.x}px, ${p.y}px)`,
              transition: "transform var(--frame-ms) linear",
            }}
          />
        );
      })}

      {/* Legend */}
      <g className="text-[11px]">
        <circle cx={24} cy={H - 22} r={4} className="fill-accent" />
        <text x={34} y={H - 18} className="fill-fg-subtle">
          light request
        </text>
        <circle cx={142} cy={H - 22} r={6.5} className="fill-data" />
        <text x={154} y={H - 18} className="fill-fg-subtle">
          heavy request
        </text>
        <rect x={262} y={H - 27} width={10} height={10} rx={2} className="fill-accent" />
        <text x={278} y={H - 18} className="fill-fg-subtle">
          busy worker
        </text>
      </g>
    </svg>
  );
}

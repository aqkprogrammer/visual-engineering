import {
  DEMAND,
  INSTANCE_CAPACITY,
  zoneLabel,
  type Region,
  type ZonesState,
} from "@/lib/simulation/models/zones";
import { cn } from "@/lib/utils/cn";

const W = 760;
const H = 400;
const SQUARE = 16;
const GAP = 5;

const rate = (n: number) => `${Math.round(n).toLocaleString("en-US")}/s`;

function RegionBox({
  region,
  x,
  y,
  w,
  h,
  share,
  failoverIn,
}: {
  region: Region;
  x: number;
  y: number;
  w: number;
  h: number;
  share: number;
  failoverIn: number | null;
}) {
  const zoneW = (w - 24 - (region.zones.length - 1) * 10) / region.zones.length;
  const serving = region.healthy
    ? region.zones.reduce((n, z) => n + (z.healthy ? z.base + z.extra : 0), 0)
    : 0;
  const load = DEMAND * share;
  const overloaded = load > serving * INSTANCE_CAPACITY;

  return (
    <g>
      <rect
        x={x}
        y={y}
        width={w}
        height={h}
        rx={12}
        className={cn("fill-none", region.healthy ? "stroke-border-strong" : "stroke-fail")}
        strokeDasharray={region.healthy ? undefined : "6 4"}
        strokeWidth={1.5}
      />
      <text x={x + 12} y={y + 20} className="fill-fg text-[13px]">
        Region {region.id}
        {!region.healthy && " — down"}
      </text>
      <text
        x={x + w - 12}
        y={y + 20}
        textAnchor="end"
        className={cn("text-[11px]", overloaded ? "fill-fail" : "fill-fg-subtle")}
      >
        {share > 0 ? `${Math.round(share * 100)}% of users · ${rate(load)}` : "no users"}
        {overloaded && " · overloaded"}
      </text>
      {failoverIn !== null && (
        <text x={x + 12} y={y + h - 10} className="fill-warn text-[11px]">
          DNS moving users elsewhere in {failoverIn} min
        </text>
      )}

      {region.zones.map((z, i) => {
        const zx = x + 12 + i * (zoneW + 10);
        const zy = y + 30;
        const zh = h - 50;
        const up = z.healthy && region.healthy;
        const perRow = Math.max(1, Math.floor((zoneW - 16) / (SQUARE + GAP)));
        const cells = [
          ...Array.from({ length: z.base + z.extra }, () => (up ? "serving" : "down")),
          ...z.launching.map(() => "launching"),
        ];
        return (
          <g key={z.id}>
            <rect
              x={zx}
              y={zy}
              width={zoneW}
              height={zh}
              rx={8}
              className={cn(up ? "fill-surface-2 stroke-border" : "fill-none stroke-fail")}
              strokeDasharray={up ? undefined : "4 3"}
            />
            <text
              x={zx + 8}
              y={zy + 16}
              className={cn("text-[11px]", up ? "fill-fg-muted" : "fill-fail")}
            >
              {zoneLabel(z.id)}
              {!up && " ✕"}
            </text>
            {cells.map((kind, n) => {
              const cx = zx + 8 + (n % perRow) * (SQUARE + GAP);
              const cy = zy + 26 + Math.floor(n / perRow) * (SQUARE + GAP);
              return (
                <rect
                  key={n}
                  x={cx}
                  y={cy}
                  width={SQUARE}
                  height={SQUARE}
                  rx={3}
                  className={cn(
                    kind === "serving" && "fill-accent",
                    kind === "down" && "fill-none stroke-fail",
                    kind === "launching" && "fill-none stroke-accent",
                  )}
                  strokeDasharray={kind === "launching" ? "3 2" : undefined}
                />
              );
            })}
          </g>
        );
      })}
    </g>
  );
}

export function ZonesScene({ state }: { state: ZonesState }) {
  const shares =
    state.metrics?.shares ??
    Object.fromEntries(state.regions.map((r) => [r.id, 1 / state.regions.length]));
  const two = state.regions.length === 2;
  const box = { x: 150, w: 595 };
  const boxes = two
    ? [
        { y: 16, h: 178 },
        { y: 206, h: 178 },
      ]
    : [{ y: 60, h: 280 }];

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="absolute inset-0 h-full w-full font-mono" aria-hidden>
      <rect
        x={14}
        y={170}
        width={100}
        height={60}
        rx={9}
        className="fill-surface-2 stroke-border-strong"
      />
      <text x={64} y={195} textAnchor="middle" className="fill-fg text-[13px]">
        users
      </text>
      <text x={64} y={214} textAnchor="middle" className="fill-fg-subtle text-[11px]">
        {rate(DEMAND)}
      </text>

      {state.regions.map((r, i) => {
        const b = boxes[i]!;
        const share = shares[r.id] ?? 0;
        const failoverIn =
          state.failover?.from === r.id
            ? Math.max(0, state.failover.completeAt - state.tick)
            : null;
        const ty = b.y + b.h / 2;
        return (
          <g key={r.id}>
            <path
              d={`M 114 200 C 132 200, 132 ${ty}, ${box.x} ${ty}`}
              fill="none"
              className={
                share === 0 ? "stroke-border" : r.healthy ? "stroke-accent" : "stroke-fail"
              }
              strokeWidth={share === 0 ? 1 : 1.75}
              strokeDasharray={share === 0 ? "3 4" : undefined}
            />
            <RegionBox
              region={r}
              x={box.x}
              y={b.y}
              w={box.w}
              h={b.h}
              share={share}
              failoverIn={failoverIn}
            />
          </g>
        );
      })}

      {!state.controlPlaneHealthy && (
        <text x={W - 16} y={H - 6} textAnchor="end" className="fill-warn text-[11px]">
          control plane impaired: no new instances
        </text>
      )}
    </svg>
  );
}

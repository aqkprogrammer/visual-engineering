import { PARTY_LABEL, type DnsState, type Party } from "@/lib/simulation/models/dns";
import { cn } from "@/lib/utils/cn";

const W = 760;
const H = 380;
const BOX = { w: 168, h: 50 };

const POS: Record<Party, { x: number; y: number; sub: string }> = {
  browser: { x: 100, y: 80, sub: "wants shop.example.com" },
  stub: { x: 100, y: 260, sub: "on your device" },
  resolver: { x: 370, y: 170, sub: "ISP, company or public" },
  root: { x: 640, y: 60, sub: "13 named authorities" },
  tld: { x: 640, y: 170, sub: "knows who runs example.com" },
  auth: { x: 640, y: 280, sub: "holds the zone's records" },
};

const KIND_CLASS = {
  query: "stroke-accent",
  referral: "stroke-warn",
  answer: "stroke-ok",
} as const;
const KIND_TEXT = { query: "fill-accent", referral: "fill-warn", answer: "fill-ok" } as const;

function edgePoint(from: Party, to: Party) {
  const a = POS[from];
  const b = POS[to];
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const scale = Math.min(
    BOX.w / 2 / Math.max(Math.abs(dx), 1),
    BOX.h / 2 / Math.max(Math.abs(dy), 1),
  );
  return { x: a.x + dx * scale * 1.04, y: a.y + dy * scale * 1.04 };
}

export function DnsScene({ state }: { state: DnsState }) {
  const involved = new Set(state.involved);
  const m = state.message;
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="absolute inset-0 h-full w-full font-mono" aria-hidden>
      <defs>
        {(["query", "referral", "answer"] as const).map((k) => (
          <marker
            key={k}
            id={`dns-${k}`}
            viewBox="0 0 10 10"
            refX="9"
            refY="5"
            markerWidth="7"
            markerHeight="7"
            orient="auto-start-reverse"
          >
            <path d="M0,0 L10,5 L0,10 z" className={KIND_TEXT[k]} />
          </marker>
        ))}
      </defs>
      <text x={W - 20} y={H - 12} textAnchor="end" className="fill-fg-subtle text-[11px]">
        {state.elapsedMs} ms elapsed (illustrative)
      </text>

      {(Object.keys(POS) as Party[]).map((party) => {
        const p = POS[party];
        const active = m && (m.from === party || m.to === party);
        return (
          <g key={party} opacity={involved.has(party) ? 1 : 0.4}>
            <rect
              x={p.x - BOX.w / 2}
              y={p.y - BOX.h / 2}
              width={BOX.w}
              height={BOX.h}
              rx={9}
              strokeWidth={active ? 2 : 1}
              strokeDasharray={involved.has(party) ? undefined : "4 4"}
              className={cn("fill-surface-2", active ? "stroke-fg" : "stroke-border-strong")}
            />
            <text
              x={p.x}
              y={p.y - 3}
              textAnchor="middle"
              className="fill-fg text-[12px] font-medium"
            >
              {PARTY_LABEL[party]}
            </text>
            <text x={p.x} y={p.y + 14} textAnchor="middle" className="fill-fg-subtle text-[10px]">
              {p.sub}
            </text>
          </g>
        );
      })}

      {m &&
        (() => {
          const from = edgePoint(m.from, m.to);
          const to = edgePoint(m.to, m.from);
          const width = `${m.kind}: ${m.label}`.length * 6.4 + 20;
          // On near-horizontal arrows a centred label would cover both boxes, so lift it above them.
          const horizontal = Math.abs(to.y - from.y) < 30;
          const mid = {
            x: Math.min(Math.max((from.x + to.x) / 2, width / 2 + 8), W - width / 2 - 8),
            y: horizontal ? Math.min(from.y, to.y) - BOX.h / 2 + 2 : (from.y + to.y) / 2,
          };
          return (
            <g>
              <line
                x1={from.x}
                y1={from.y}
                x2={to.x}
                y2={to.y}
                strokeWidth={2.25}
                strokeDasharray={m.kind === "query" ? "6 4" : undefined}
                markerEnd={`url(#dns-${m.kind})`}
                className={KIND_CLASS[m.kind]}
              />
              <rect
                x={mid.x - width / 2}
                y={mid.y - 24}
                width={width}
                height={20}
                rx={10}
                className="fill-bg stroke-border"
              />
              <text
                x={mid.x}
                y={mid.y - 10}
                textAnchor="middle"
                className={cn("text-[11px]", KIND_TEXT[m.kind])}
              >
                {m.kind}: {m.label}
              </text>
            </g>
          );
        })()}

      <g className="text-[11px]">
        {(["query", "referral", "answer"] as const).map((k, i) => (
          <g key={k} transform={`translate(${20 + i * 100} ${H - 16})`}>
            <line
              x1={0}
              y1={-4}
              x2={24}
              y2={-4}
              strokeWidth={2}
              strokeDasharray={k === "query" ? "6 4" : undefined}
              className={KIND_CLASS[k]}
            />
            <text x={30} y={0} className="fill-fg-subtle">
              {k}
            </text>
          </g>
        ))}
      </g>
    </svg>
  );
}

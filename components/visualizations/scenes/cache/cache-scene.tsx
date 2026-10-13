import {
  HIT_MS,
  KEYS,
  MISS_MS,
  victim,
  type CacheState,
  type Outcome,
} from "@/lib/simulation/models/cache";
import { cn } from "@/lib/utils/cn";

const W = 760;
const H = 380;
const CACHE = { x: 164, y: 70, w: 432, h: 150 };
const DB = { x: 628, y: 40, w: 116, h: 232 };
const SLOT_W = 64;
const SLOT_GAP = 6;
const HISTORY = 40;

const OUTCOME_LABEL: Record<Outcome, string> = {
  hit: `HIT · ${HIT_MS} ms`,
  "stale-hit": `STALE HIT · ${HIT_MS} ms`,
  miss: `MISS → database · ${MISS_MS} ms`,
  expired: `EXPIRED → database · ${MISS_MS} ms`,
};

const OUTCOME_TONE: Record<Outcome, string> = {
  hit: "fill-ok",
  "stale-hit": "fill-fail",
  miss: "fill-warn",
  expired: "fill-warn",
};

function HistoryCell({
  x,
  y,
  outcome,
  label,
}: {
  x: number;
  y: number;
  outcome: Outcome;
  label: string;
}) {
  const size = 14;
  const filled = outcome === "hit" || outcome === "stale-hit";
  return (
    <g transform={`translate(${x} ${y})`}>
      <rect
        width={size}
        height={size}
        rx={outcome === "stale-hit" ? 7 : 2}
        className={cn(
          filled ? (outcome === "hit" ? "fill-ok" : "fill-fail") : "fill-none",
          !filled && (outcome === "expired" ? "stroke-warn" : "stroke-fg-subtle"),
        )}
        strokeWidth={filled ? 0 : 1.25}
        strokeDasharray={outcome === "expired" ? "2 2" : undefined}
      />
      <text
        x={size / 2}
        y={10.5}
        textAnchor="middle"
        className={cn("text-[9px]", filled ? "fill-bg" : "fill-fg-muted")}
      >
        {label}
      </text>
    </g>
  );
}

export function CacheScene({ state }: { state: CacheState }) {
  const { config, entries, current, db } = state;
  const next = entries.length >= config.capacity ? victim(entries, config.policy) : undefined;
  const slotsX =
    CACHE.x + (CACHE.w - (config.capacity * SLOT_W + (config.capacity - 1) * SLOT_GAP)) / 2;
  const fromDb = current && (current.outcome === "miss" || current.outcome === "expired");
  const history = state.history.slice(-HISTORY);

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="absolute inset-0 h-full w-full font-mono" aria-hidden>
      {/* App */}
      <rect
        x={16}
        y={115}
        width={112}
        height={60}
        rx={8}
        className="fill-surface-2 stroke-border-strong"
      />
      <text x={72} y={140} textAnchor="middle" className="fill-fg text-[13px]">
        app
      </text>
      <text x={72} y={158} textAnchor="middle" className="fill-fg-muted text-[12px]">
        {current ? `GET ${current.key}` : "idle"}
      </text>
      <line x1={128} y1={145} x2={CACHE.x} y2={145} className="stroke-accent" strokeWidth={1.75} />

      {/* Cache */}
      <rect
        x={CACHE.x}
        y={CACHE.y}
        width={CACHE.w}
        height={CACHE.h}
        rx={10}
        className="fill-surface stroke-accent"
        strokeWidth={1.5}
      />
      <text x={CACHE.x + 14} y={CACHE.y + 22} className="fill-fg text-[13px] font-medium">
        cache
      </text>
      <text
        x={CACHE.x + CACHE.w - 14}
        y={CACHE.y + 22}
        textAnchor="end"
        className="fill-fg-muted text-[11px]"
      >
        {config.policy.toUpperCase()} · {entries.length}/{config.capacity} slots
        {config.ttl > 0 ? ` · TTL ${config.ttl}` : ""}
      </text>
      {Array.from({ length: config.capacity }, (_, i) => {
        const entry = entries[i];
        const x = slotsX + i * (SLOT_W + SLOT_GAP);
        const y = CACHE.y + 40;
        const isCurrent = entry && current?.key === entry.key;
        const stale = entry && entry.version < db[entry.key];
        return (
          <g key={i}>
            <rect
              x={x}
              y={y}
              width={SLOT_W}
              height={84}
              rx={7}
              strokeWidth={isCurrent ? 2 : 1}
              strokeDasharray={entry ? undefined : "4 4"}
              className={cn(
                entry ? "fill-surface-2" : "fill-none",
                isCurrent
                  ? current?.outcome === "stale-hit"
                    ? "stroke-fail"
                    : "stroke-ok"
                  : "stroke-border-strong",
              )}
            />
            {entry ? (
              <>
                <text
                  x={x + SLOT_W / 2}
                  y={y + 30}
                  textAnchor="middle"
                  className="fill-fg text-[22px] font-medium"
                >
                  {entry.key}
                </text>
                <text
                  x={x + SLOT_W / 2}
                  y={y + 48}
                  textAnchor="middle"
                  className={cn("text-[11px]", stale ? "fill-fail" : "fill-fg-muted")}
                >
                  v{entry.version}
                  {stale ? " stale" : ""}
                </text>
                <text
                  x={x + SLOT_W / 2}
                  y={y + 64}
                  textAnchor="middle"
                  className="fill-fg-subtle text-[10px]"
                >
                  used {entry.uses}×
                </text>
                {next === entry && (
                  <text
                    x={x + SLOT_W / 2}
                    y={y + 78}
                    textAnchor="middle"
                    className="fill-warn text-[10px]"
                  >
                    evicts next
                  </text>
                )}
              </>
            ) : (
              <text
                x={x + SLOT_W / 2}
                y={y + 46}
                textAnchor="middle"
                className="fill-fg-subtle text-[11px]"
              >
                empty
              </text>
            )}
          </g>
        );
      })}
      {current && (
        <text
          x={CACHE.x + CACHE.w / 2}
          y={CACHE.y + CACHE.h + 24}
          textAnchor="middle"
          className={cn("text-[13px] font-medium", OUTCOME_TONE[current.outcome])}
        >
          GET {current.key}: {OUTCOME_LABEL[current.outcome]}
          {current.evicted ? ` · evicted ${current.evicted}` : ""}
        </text>
      )}

      {/* Database */}
      <line
        x1={CACHE.x + CACHE.w}
        y1={145}
        x2={DB.x}
        y2={145}
        strokeWidth={fromDb ? 2 : 1.25}
        strokeDasharray={fromDb ? undefined : "4 4"}
        className={fromDb ? "stroke-warn" : "stroke-border-strong"}
      />
      <rect
        x={DB.x}
        y={DB.y}
        width={DB.w}
        height={DB.h}
        rx={10}
        className="fill-surface-2 stroke-border-strong"
      />
      <text
        x={DB.x + DB.w / 2}
        y={DB.y + 22}
        textAnchor="middle"
        className="fill-fg text-[13px] font-medium"
      >
        database
      </text>
      {KEYS.map((key, i) => {
        const y = DB.y + 46 + i * 23;
        const active = fromDb && current?.key === key;
        return (
          <text
            key={key}
            x={DB.x + DB.w / 2}
            y={y}
            textAnchor="middle"
            className={cn("text-[12px]", active ? "fill-warn font-medium" : "fill-fg-muted")}
          >
            {key} · v{db[key]}
          </text>
        );
      })}

      {/* History */}
      <text x={16} y={286} className="fill-fg-subtle text-[11px]">
        Last {HISTORY} requests (oldest → newest)
      </text>
      {history.map((h, i) => (
        <HistoryCell key={`${h.at}`} x={16 + i * 18.2} y={296} outcome={h.outcome} label={h.key} />
      ))}
      <g className="text-[10px]">
        <HistoryCell x={16} y={340} outcome="hit" label="" />
        <text x={36} y={351} className="fill-fg-subtle">
          hit
        </text>
        <HistoryCell x={70} y={340} outcome="miss" label="" />
        <text x={90} y={351} className="fill-fg-subtle">
          miss
        </text>
        <HistoryCell x={130} y={340} outcome="stale-hit" label="" />
        <text x={150} y={351} className="fill-fg-subtle">
          stale hit
        </text>
        <HistoryCell x={214} y={340} outcome="expired" label="" />
        <text x={234} y={351} className="fill-fg-subtle">
          expired
        </text>
      </g>
    </svg>
  );
}

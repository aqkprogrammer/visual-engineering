import { TLS_MESSAGES, type TlsState } from "@/lib/simulation/models/tls-handshake";
import { cn } from "@/lib/utils/cn";

const W = 760;
const H = 420;
const CLIENT_X = 150;
const SERVER_X = 610;
const FIRST_Y = 104;
const ROW = 36;

export type TlsLens = "participants" | "observer";

function Lock({ x, y }: { x: number; y: number }) {
  return (
    <g transform={`translate(${x} ${y})`}>
      <path
        d="M2.5 5 V3.5 a3 3 0 0 1 6 0 V5"
        fill="none"
        className="stroke-current"
        strokeWidth={1.4}
      />
      <rect x={0.5} y={5} width={10} height={7.5} rx={1.5} className="fill-current" />
    </g>
  );
}

export function TlsScene({
  state,
  lens,
  onSelect,
}: {
  state: TlsState;
  lens: TlsLens;
  /** Jump to the step that introduces a message (pointer convenience; the step list is the accessible path). */
  onSelect?: (messageId: string) => void;
}) {
  const sent = TLS_MESSAGES.filter((m) => state.sent.includes(m.id));
  const lastY = FIRST_Y + (TLS_MESSAGES.length - 1) * ROW + 18;

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="absolute inset-0 h-full w-full font-mono" aria-hidden>
      {/* Participants and lifelines */}
      {[
        { x: CLIENT_X, title: "browser", sub: "client" },
        { x: SERVER_X, title: "shop.example.com", sub: "server" },
      ].map((p) => (
        <g key={p.title}>
          <rect
            x={p.x - 82}
            y={20}
            width={164}
            height={50}
            rx={8}
            className="fill-surface-2 stroke-border-strong"
          />
          <text x={p.x} y={42} textAnchor="middle" className="fill-fg text-[13px]">
            {p.title}
          </text>
          <text x={p.x} y={60} textAnchor="middle" className="fill-fg-subtle text-[11px]">
            {p.sub}
          </text>
          <line
            x1={p.x}
            y1={70}
            x2={p.x}
            y2={lastY + 16}
            className="stroke-border-strong"
            strokeDasharray="4 4"
          />
        </g>
      ))}

      {/* Round-trip bracket */}
      {state.roundTrips > 0 && (
        <g className="text-[11px]">
          <path
            d={`M40 ${FIRST_Y - 6} H32 V${FIRST_Y + 5 * ROW + 24} H40`}
            fill="none"
            className="stroke-accent"
            strokeWidth={1.5}
          />
          <text
            x={22}
            y={FIRST_Y + 2.5 * ROW + 10}
            textAnchor="middle"
            className="fill-accent"
            transform={`rotate(-90 22 ${FIRST_Y + 2.5 * ROW + 10})`}
          >
            1 round trip
          </text>
        </g>
      )}

      {sent.map((message, i) => {
        const y = FIRST_Y + i * ROW;
        const fromX = message.from === "client" ? CLIENT_X : SERVER_X;
        const toX = message.from === "client" ? SERVER_X : CLIENT_X;
        const current = state.current === message.id;
        const encrypted = message.protection !== "plaintext";
        const label = lens === "observer" && encrypted ? "encrypted record" : message.name;
        const tone =
          message.protection === "application-keys"
            ? "text-ok"
            : encrypted
              ? "text-accent"
              : "text-fg-subtle";
        const dir = toX > fromX ? 1 : -1;
        return (
          <g
            key={message.id}
            onClick={onSelect ? () => onSelect(message.id) : undefined}
            className={cn(onSelect && "cursor-pointer", tone)}
            opacity={current || state.current === null ? 1 : 0.55}
          >
            <line
              x1={fromX}
              y1={y}
              x2={toX - dir * 8}
              y2={y + 18}
              className="stroke-current"
              strokeWidth={current ? 2.5 : 1.5}
              strokeDasharray={encrypted ? undefined : "6 4"}
            />
            <path
              d={`M${toX} ${y + 18.8} l${-dir * 10} -7.5 v10 z`}
              className="fill-current"
              transform={`rotate(${dir * 7} ${toX} ${y + 18.8})`}
            />
            <rect
              x={(CLIENT_X + SERVER_X) / 2 - 100}
              y={y - 4}
              width={200}
              height={20}
              rx={10}
              className={cn(current ? "fill-bg stroke-current" : "fill-bg stroke-border")}
            />
            {encrypted && <Lock x={(CLIENT_X + SERVER_X) / 2 - 88} y={y} />}
            <text
              x={(CLIENT_X + SERVER_X) / 2 + (encrypted ? 6 : 0)}
              y={y + 10}
              textAnchor="middle"
              className={cn("text-[12px]", current ? "fill-fg font-medium" : "fill-fg-muted")}
            >
              {label}
            </text>
          </g>
        );
      })}

      {/* Legend */}
      <g className="text-[11px]">
        <line
          x1={24}
          y1={H - 20}
          x2={52}
          y2={H - 20}
          className="stroke-fg-subtle"
          strokeWidth={1.5}
          strokeDasharray="6 4"
        />
        <text x={58} y={H - 16} className="fill-fg-subtle">
          plaintext
        </text>
        <line
          x1={140}
          y1={H - 20}
          x2={168}
          y2={H - 20}
          className="stroke-accent"
          strokeWidth={1.5}
        />
        <text x={174} y={H - 16} className="fill-fg-subtle">
          handshake keys
        </text>
        <line x1={290} y1={H - 20} x2={318} y2={H - 20} className="stroke-ok" strokeWidth={1.5} />
        <text x={324} y={H - 16} className="fill-fg-subtle">
          application keys
        </text>
      </g>
    </svg>
  );
}

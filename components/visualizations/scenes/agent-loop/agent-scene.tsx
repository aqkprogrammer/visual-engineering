import { TOOLS, type Actor, type AgentState } from "@/lib/simulation/models/agent-loop";
import { cn } from "@/lib/utils/cn";

const W = 760;
const H = 300;
const BOX = { w: 150, h: 64 };

const NODES: Record<Actor, { x: number; y: number; label: string }> = {
  user: { x: 95, y: 150, label: "user" },
  app: { x: 330, y: 150, label: "your app" },
  model: { x: 620, y: 60, label: "language model" },
  server: { x: 620, y: 240, label: "MCP server: orders" },
  reviewer: { x: 330, y: 40, label: "human reviewer" },
};

/** Where the line from one box's centre towards another crosses the first box's border. */
function anchor(node: { x: number; y: number }, towards: { x: number; y: number }) {
  const dx = towards.x - node.x;
  const dy = towards.y - node.y;
  const scale = Math.min(
    BOX.w / 2 / Math.max(Math.abs(dx), 1e-6),
    BOX.h / 2 / Math.max(Math.abs(dy), 1e-6),
  );
  return { x: node.x + dx * scale, y: node.y + dy * scale };
}

export function AgentScene({ state }: { state: AgentState }) {
  const current = state.messages.at(-1)!;
  const showReviewer = state.params.approval;
  const actors = (Object.keys(NODES) as Actor[]).filter((a) => a !== "reviewer" || showReviewer);
  const from = NODES[current.from];
  const to = NODES[current.to];
  const a = anchor(from, to);
  const b = anchor(to, from);
  const mid = { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 };
  const tone = current.isError
    ? "stroke-fail fill-fail"
    : current.untrusted && state.params.scenario === "injection"
      ? "stroke-warn fill-warn"
      : "stroke-accent fill-accent";

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="absolute inset-0 h-full w-full font-mono" aria-hidden>
      <defs>
        <marker
          id="agent-arrow"
          viewBox="0 0 10 10"
          refX="9"
          refY="5"
          markerWidth="7"
          markerHeight="7"
          orient="auto-start-reverse"
        >
          <path d="M0,0 L10,5 L0,10 z" className={tone.split(" ")[1]} />
        </marker>
      </defs>
      {/* Static connections. */}
      {(
        [
          ["user", "app"],
          ["app", "model"],
          ["app", "server"],
          ...(showReviewer ? [["app", "reviewer"]] : []),
        ] as [Actor, Actor][]
      ).map(([p, q]) => {
        const s = anchor(NODES[p], NODES[q]);
        const e = anchor(NODES[q], NODES[p]);
        return (
          <line
            key={`${p}-${q}`}
            x1={s.x}
            y1={s.y}
            x2={e.x}
            y2={e.y}
            className="stroke-border"
            strokeDasharray="3 4"
          />
        );
      })}
      {actors.map((actor) => {
        const node = NODES[actor];
        const active = actor === current.from || actor === current.to;
        return (
          <g key={actor}>
            <rect
              x={node.x - BOX.w / 2}
              y={node.y - BOX.h / 2}
              width={BOX.w}
              height={BOX.h}
              rx={9}
              strokeWidth={active ? 2 : 1}
              className={cn(
                active ? "fill-accent-soft stroke-accent" : "fill-surface-2 stroke-border-strong",
              )}
            />
            <text
              x={node.x}
              y={node.y - (actor === "server" || actor === "app" ? 12 : 2)}
              textAnchor="middle"
              className="fill-fg text-[12px] font-medium"
            >
              {node.label}
            </text>
            {actor === "app" && (
              <text
                x={node.x}
                y={node.y + 8}
                textAnchor="middle"
                className={cn(
                  "text-[10px]",
                  state.modelCalls >= state.params.maxSteps ? "fill-warn" : "fill-fg-subtle",
                )}
              >
                model calls {state.modelCalls} / {state.params.maxSteps}
              </text>
            )}
            {actor === "app" && (
              <text
                x={node.x}
                y={node.y + 22}
                textAnchor="middle"
                className="fill-fg-subtle text-[10px]"
              >
                agent loop · MCP client
              </text>
            )}
            {actor === "server" && (
              <text
                x={node.x}
                y={node.y + 6}
                textAnchor="middle"
                className="fill-fg-subtle text-[10px]"
              >
                {TOOLS.length} tools
              </text>
            )}
            {actor === "server" && (
              <text
                x={node.x}
                y={node.y + 20}
                textAnchor="middle"
                className="fill-fg-subtle text-[10px]"
              >
                {TOOLS.filter((t) => t.sideEffect).length} can change data*
              </text>
            )}
          </g>
        );
      })}
      {/* The current message. */}
      <line
        x1={a.x}
        y1={a.y}
        x2={b.x}
        y2={b.y}
        strokeWidth={2.25}
        markerEnd="url(#agent-arrow)"
        className={tone.split(" ")[0]}
      />
      <rect
        x={mid.x - 78}
        y={mid.y - 11}
        width={156}
        height={20}
        rx={5}
        className="fill-bg stroke-border"
      />
      <text
        x={mid.x}
        y={mid.y + 3}
        textAnchor="middle"
        className={cn("text-[11px]", current.isError ? "fill-fail" : "fill-fg")}
      >
        {current.label}
      </text>
      <text x={20} y={H - 12} className="fill-fg-subtle text-[10px]">
        * changes something: issuing a refund moves money
      </text>
    </svg>
  );
}

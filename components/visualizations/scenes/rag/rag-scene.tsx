import { type RagState, type Stage, type Verdict } from "@/lib/simulation/models/rag";
import { cn } from "@/lib/utils/cn";

const W = 760;
const H = 300;
const BOX = { w: 132, h: 58 };

type Node = { stage: Stage; label: string; x: number; y: number; detail: (s: RagState) => string };

const SHORT_VERDICT: Record<Verdict, string> = {
  correct: "correct",
  conflicting: "sources conflict",
  outdated: "outdated — wrong",
  "not-found": "not found",
};

const NODES: Node[] = [
  {
    stage: "documents",
    label: "documents",
    x: 100,
    y: 70,
    detail: (s) => `${s.corpus.length} docs`,
  },
  {
    stage: "chunking",
    label: "chunking",
    x: 280,
    y: 70,
    detail: (s) => `${s.chunks.length} chunks`,
  },
  { stage: "indexing", label: "embed + index", x: 460, y: 70, detail: () => "vector index" },
  { stage: "question", label: "question", x: 100, y: 200, detail: () => "embedded" },
  {
    stage: "retrieval",
    label: "retrieve",
    x: 260,
    y: 200,
    detail: (s) => `${s.retrieved.length} scored`,
  },
  {
    stage: "reranking",
    label: "rerank",
    x: 410,
    y: 200,
    detail: (s) => (s.reranked ? `${s.reranked.length} kept` : "off"),
  },
  {
    stage: "context",
    label: "build context",
    x: 560,
    y: 200,
    detail: (s) => `top ${s.params.topK} · ${s.contextWords} words`,
  },
  {
    stage: "generation",
    label: "LLM answer",
    x: 680,
    y: 110,
    detail: (s) => (s.answer ? SHORT_VERDICT[s.answer.verdict] : "pending"),
  },
];

const ORDER: Stage[] = [
  "documents",
  "chunking",
  "indexing",
  "question",
  "retrieval",
  "reranking",
  "context",
  "generation",
];
const EDGES: [Stage, Stage][] = [
  ["documents", "chunking"],
  ["chunking", "indexing"],
  ["question", "retrieval"],
  ["indexing", "retrieval"],
  ["retrieval", "reranking"],
  ["reranking", "context"],
  ["context", "generation"],
];

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

const VERDICT_TONE = {
  correct: "fill-ok",
  conflicting: "fill-warn",
  outdated: "fill-fail",
  "not-found": "fill-warn",
} as const;

export function RagScene({ state }: { state: RagState }) {
  const reached = ORDER.indexOf(state.stage);
  const byStage = new Map(NODES.map((n) => [n.stage, n]));
  const skipped = (stage: Stage) => stage === "reranking" && !state.reranked;

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="absolute inset-0 h-full w-full font-mono" aria-hidden>
      <text x={20} y={22} className="fill-fg-subtle text-[11px]">
        indexing (done ahead of time)
      </text>
      <text x={20} y={156} className="fill-fg-subtle text-[11px]">
        answering a question
      </text>
      {EDGES.map(([a, b]) => {
        const from = anchor(byStage.get(a)!, byStage.get(b)!);
        const to = anchor(byStage.get(b)!, byStage.get(a)!);
        const done = ORDER.indexOf(b) <= reached;
        return (
          <line
            key={`${a}-${b}`}
            x1={from.x}
            y1={from.y}
            x2={to.x}
            y2={to.y}
            strokeWidth={done ? 2 : 1}
            strokeDasharray={skipped(b) ? "4 4" : undefined}
            className={done ? "stroke-accent" : "stroke-border-strong"}
          />
        );
      })}
      {NODES.map((node) => {
        const index = ORDER.indexOf(node.stage);
        const active = node.stage === state.stage;
        const done = index <= reached;
        const verdict = node.stage === "generation" && state.answer ? state.answer.verdict : null;
        return (
          <g key={node.stage} opacity={skipped(node.stage) ? 0.45 : 1}>
            <rect
              x={node.x - BOX.w / 2}
              y={node.y - BOX.h / 2}
              width={BOX.w}
              height={BOX.h}
              rx={9}
              strokeWidth={active ? 2.25 : 1}
              strokeDasharray={skipped(node.stage) ? "4 4" : undefined}
              className={cn(
                done ? "fill-accent-soft" : "fill-surface-2",
                active ? "stroke-accent" : "stroke-border-strong",
              )}
            />
            <text
              x={node.x}
              y={node.y - 4}
              textAnchor="middle"
              className="fill-fg text-[12px] font-medium"
            >
              {node.label}
            </text>
            <text
              x={node.x}
              y={node.y + 14}
              textAnchor="middle"
              className={cn("text-[10px]", verdict ? VERDICT_TONE[verdict] : "fill-fg-subtle")}
            >
              {done ? node.detail(state) : "…"}
            </text>
          </g>
        );
      })}
    </svg>
  );
}

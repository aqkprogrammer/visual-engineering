"use client";

import { FlaskConical } from "lucide-react";
import { useId, useState } from "react";
import {
  angleBetween,
  ITEMS,
  norm,
  rank,
  type Item,
  type Metric,
} from "@/lib/simulation/models/embeddings";
import { cn } from "@/lib/utils/cn";
import { SegmentedControl } from "../../player/controls";

const W = 760;
const H = 420;
// One scale for both axes, so the angles you see are the real angles between vectors.
const SCALE = 226;
const ORIGIN = { x: 266, y: 392 };
const px = (v: readonly [number, number]) => ({
  x: ORIGIN.x + v[0] * SCALE,
  y: ORIGIN.y - v[1] * SCALE,
});

const GROUP_CLASS = { animal: "fill-accent", vehicle: "fill-data", fruit: "fill-warn" } as const;
const GROUP_LABEL = { animal: "animal", vehicle: "vehicle", fruit: "fruit" } as const;

export const EMBEDDING_ASSUMPTIONS = [
  "Twelve hand-placed vectors in two made-up dimensions, chosen so related words point in similar directions.",
  "Real embedding models learn hundreds to thousands of dimensions from data; individual dimensions rarely mean anything on their own.",
  "“animals” is deliberately longer than the other vectors, to show how the dot product rewards length.",
  "Search here compares the query against every vector exactly; large systems use approximate nearest-neighbour indexes.",
];

const METRIC_LABEL: Record<Metric, string> = {
  cosine: "cosine similarity",
  dot: "dot product",
  euclidean: "Euclidean distance",
};

const format = (metric: Metric, value: number) =>
  metric === "euclidean" ? value.toFixed(2) : value.toFixed(3);

export function EmbeddingExplorer() {
  const id = useId();
  const [queryWord, setQueryWord] = useState("cat");
  const [metric, setMetric] = useState<Metric>("cosine");
  const [k, setK] = useState(3);
  const query = ITEMS.find((i) => i.word === queryWord)!;
  const ranked = rank(query, metric);
  const top = new Map(ranked.slice(0, k).map((r) => [r.item.word, r.rank]));
  const q = px(query.vector);

  const summary = `Query “${query.word}”. Top ${k} by ${METRIC_LABEL[metric]}: ${ranked
    .slice(0, k)
    .map((r) => `${r.item.word} (${format(metric, r.score)})`)
    .join(", ")}.`;

  return (
    <section
      aria-labelledby={`${id}-title`}
      className="not-prose relative my-10 overflow-hidden rounded-xl border border-border bg-bg"
    >
      <header className="flex flex-wrap items-center justify-between gap-3 border-b border-border px-4 py-3">
        <h3 id={`${id}-title`} className="text-sm font-semibold">
          Embedding similarity explorer
        </h3>
        <span className="inline-flex items-center gap-1.5 rounded-full border border-data/60 px-2.5 py-0.5 font-mono text-[11px] text-fg-muted">
          <FlaskConical aria-hidden className="size-3.5" />
          Teaching model
        </span>
      </header>

      <div className="relative bg-blueprint" style={{ aspectRatio: `${W} / ${H}` }}>
        <svg
          viewBox={`0 0 ${W} ${H}`}
          className="absolute inset-0 h-full w-full font-mono"
          aria-hidden
        >
          <line x1={20} y1={ORIGIN.y} x2={W - 20} y2={ORIGIN.y} className="stroke-border-strong" />
          <line
            x1={ORIGIN.x}
            y1={ORIGIN.y}
            x2={ORIGIN.x}
            y2={20}
            className="stroke-border-strong"
          />
          <text x={W - 24} y={ORIGIN.y - 8} textAnchor="end" className="fill-fg-subtle text-[11px]">
            dimension 1
          </text>
          <text x={ORIGIN.x + 8} y={30} className="fill-fg-subtle text-[11px]">
            dimension 2
          </text>

          {metric === "cosine" && ranked[0] && <AngleArc from={query} to={ranked[0].item} />}

          {ITEMS.map((item) => {
            const p = px(item.vector);
            const isQuery = item.word === query.word;
            const rankHere = top.get(item.word);
            return (
              <g
                key={item.word}
                onClick={() => setQueryWord(item.word)}
                className="cursor-pointer"
                opacity={isQuery || rankHere || metric === "euclidean" ? 1 : 0.55}
              >
                {metric !== "euclidean" && (
                  <line
                    x1={ORIGIN.x}
                    y1={ORIGIN.y}
                    x2={p.x}
                    y2={p.y}
                    strokeWidth={isQuery ? 2.5 : rankHere ? 1.75 : 1}
                    className={
                      isQuery ? "stroke-fg" : rankHere ? "stroke-ok" : "stroke-border-strong"
                    }
                  />
                )}
                {metric === "euclidean" && rankHere && (
                  <line
                    x1={q.x}
                    y1={q.y}
                    x2={p.x}
                    y2={p.y}
                    strokeDasharray="4 4"
                    strokeWidth={1.5}
                    className="stroke-ok"
                  />
                )}
                <circle
                  cx={p.x}
                  cy={p.y}
                  r={isQuery ? 7 : 5}
                  className={cn(GROUP_CLASS[item.group], isQuery && "stroke-fg")}
                  strokeWidth={2}
                />
                <text
                  x={p.x + (item.vector[0] < 0 ? -10 : 10)}
                  y={p.y - 8}
                  textAnchor={item.vector[0] < 0 ? "end" : "start"}
                  className={cn("text-[12px]", isQuery ? "fill-fg font-medium" : "fill-fg-muted")}
                >
                  {item.word}
                  {rankHere ? ` #${rankHere}` : ""}
                </text>
              </g>
            );
          })}

          <g className="text-[11px]">
            {(["animal", "vehicle", "fruit"] as const).map((group, i) => (
              <g key={group} transform={`translate(${24 + i * 96} 24)`}>
                <circle cx={4} cy={-4} r={5} className={GROUP_CLASS[group]} />
                <text x={14} y={0} className="fill-fg-subtle">
                  {GROUP_LABEL[group]}
                </text>
              </g>
            ))}
          </g>
        </svg>
      </div>

      <p aria-live="polite" className="border-t border-border px-4 py-3 text-sm">
        {summary}
      </p>

      <div
        data-native-keys
        className="flex flex-wrap gap-x-6 gap-y-4 border-t border-border px-4 py-4"
      >
        <label className="flex flex-col gap-1.5 text-xs font-medium text-fg-muted">
          Query word
          <select
            value={queryWord}
            onChange={(e) => setQueryWord(e.target.value)}
            className="rounded-md border border-border bg-bg px-2 py-1.5 font-mono text-sm text-fg"
          >
            {(["animal", "vehicle", "fruit"] as const).map((group) => (
              <optgroup key={group} label={GROUP_LABEL[group]}>
                {ITEMS.filter((i) => i.group === group).map((i) => (
                  <option key={i.word} value={i.word}>
                    {i.word}
                  </option>
                ))}
              </optgroup>
            ))}
          </select>
        </label>
        <SegmentedControl<Metric>
          label="Measure"
          value={metric}
          options={[
            { value: "cosine", label: "Cosine" },
            { value: "dot", label: "Dot product" },
            { value: "euclidean", label: "Euclidean" },
          ]}
          onChange={setMetric}
        />
        <SegmentedControl
          label="Top k"
          value={String(k)}
          options={[1, 3, 5].map((n) => ({ value: String(n), label: String(n) }))}
          onChange={(value) => setK(Number(value))}
        />
      </div>

      {/* Focusable so keyboard users can scroll the table on narrow screens. */}
      <div
        tabIndex={0}
        role="region"
        aria-label="Ranking table"
        className="relative overflow-x-auto border-t border-border px-4 py-3"
      >
        <table className="w-full min-w-[28rem] text-sm">
          <caption className="mb-2 text-left text-xs font-medium text-fg-muted">
            Every other word ranked by {METRIC_LABEL[metric]} to “{query.word}”
            {metric === "euclidean" ? " (smaller is closer)" : " (larger is closer)"}
          </caption>
          <thead>
            <tr className="text-left text-xs text-fg-subtle">
              <th scope="col" className="py-1 pr-3 font-normal">
                Rank
              </th>
              <th scope="col" className="py-1 pr-3 font-normal">
                Word
              </th>
              <th scope="col" className="py-1 pr-3 font-normal">
                Group
              </th>
              <th scope="col" className="py-1 pr-3 font-normal">
                Score
              </th>
              <th scope="col" className="py-1 pr-3 font-normal">
                Angle
              </th>
              <th scope="col" className="py-1 font-normal">
                Length
              </th>
            </tr>
          </thead>
          <tbody className="font-mono text-xs">
            {ranked.map((r) => (
              <tr
                key={r.item.word}
                className={cn("border-t border-border", r.rank <= k && "bg-accent-soft")}
              >
                <td className="py-1 pr-3">{r.rank}</td>
                <th scope="row" className="py-1 pr-3 text-left font-normal">
                  {r.item.word}
                </th>
                <td className="py-1 pr-3">{GROUP_LABEL[r.item.group]}</td>
                <td className="py-1 pr-3">{format(metric, r.score)}</td>
                <td className="py-1 pr-3">
                  {angleBetween(query.vector, r.item.vector).toFixed(0)}°
                </td>
                <td className="py-1">{norm(r.item.vector).toFixed(2)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <details className="border-t border-border px-4 py-3 text-sm">
        <summary className="cursor-pointer font-mono text-[11px] tracking-wide text-fg-subtle uppercase">
          Assumptions
        </summary>
        <ul className="mt-2 list-disc space-y-1.5 pl-4 text-fg-muted">
          {EMBEDDING_ASSUMPTIONS.map((a) => (
            <li key={a}>{a}</li>
          ))}
        </ul>
      </details>
    </section>
  );
}

function AngleArc({ from, to }: { from: Item; to: Item }) {
  const r = 70;
  const a1 = Math.atan2(from.vector[1], from.vector[0]);
  const a2 = Math.atan2(to.vector[1], to.vector[0]);
  const start = { x: ORIGIN.x + r * Math.cos(a1), y: ORIGIN.y - r * Math.sin(a1) };
  const end = { x: ORIGIN.x + r * Math.cos(a2), y: ORIGIN.y - r * Math.sin(a2) };
  const sweep = a2 > a1 ? 0 : 1;
  const mid = (a1 + a2) / 2;
  return (
    <g>
      <path
        d={`M${start.x} ${start.y} A${r} ${r} 0 0 ${sweep} ${end.x} ${end.y}`}
        fill="none"
        className="stroke-ok"
        strokeWidth={1.5}
      />
      <text
        x={ORIGIN.x + (r + 14) * Math.cos(mid)}
        y={ORIGIN.y - (r + 14) * Math.sin(mid)}
        className="fill-ok text-[11px]"
      >
        {angleBetween(from.vector, to.vector).toFixed(0)}°
      </text>
    </g>
  );
}

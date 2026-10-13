"use client";

import { CircleAlert, CircleCheck, TriangleAlert } from "lucide-react";
import { useMemo, useState } from "react";
import {
  DEFAULT_RAG_PARAMS,
  QUESTIONS,
  ragFrames,
  ragSteps,
  terms,
  VERDICT_LABEL,
  type QuestionId,
  type RagParams,
  type RagState,
  type Scored,
} from "@/lib/simulation/models/rag";
import { cn } from "@/lib/utils/cn";
import { SegmentedControl, Stat, Toggle } from "../../player/controls";
import { SimulationPlayer } from "../../player/simulation-player";
import { usePlayback } from "../../player/use-playback";
import { RagScene } from "./rag-scene";

export const RAG_ASSUMPTIONS = [
  "A four-document, fictional company handbook. One document is an outdated policy that was never deleted.",
  "Retrieval scores word overlap, standing in for embedding similarity, so every score can be explained.",
  "The reranker re-scores with a stricter phrase match and drops documents marked as superseded — a stand-in for a cross-encoder plus a metadata filter.",
  "No language model is called: the answer is chosen from pre-written responses according to which facts reached the context.",
];

function ScoreTable({
  rows,
  caption,
  context,
}: {
  rows: Scored[];
  caption: string;
  context: Set<string>;
}) {
  return (
    <div className="relative overflow-x-auto" tabIndex={0} role="region" aria-label={caption}>
      <table className="w-full min-w-[34rem] text-xs">
        <caption className="mb-2 text-left text-xs font-medium text-fg-muted">{caption}</caption>
        <thead>
          <tr className="text-left text-fg-subtle">
            <th scope="col" className="py-1 pr-3 font-normal">
              Score
            </th>
            <th scope="col" className="py-1 pr-3 font-normal">
              Source
            </th>
            <th scope="col" className="py-1 font-normal">
              Chunk
            </th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr
              key={r.id}
              className={cn(
                "border-t border-border align-top",
                context.has(r.id) && "bg-accent-soft",
              )}
            >
              <td className="py-1 pr-3 font-mono">{r.score.toFixed(2)}</td>
              <td className={cn("py-1 pr-3", !r.current && "text-fail")}>
                {r.docTitle}
                {context.has(r.id) && <span className="sr-only"> (in context)</span>}
              </td>
              <td className="py-1">{r.text}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function StageDetail({ state }: { state: RagState }) {
  const inContext = new Set(state.context.map((c) => c.id));
  switch (state.stage) {
    case "documents":
      return (
        <ul className="space-y-2 text-sm">
          {state.corpus.map((d) => (
            <li key={d.id}>
              <span className={cn("font-medium", !d.current && "text-fail")}>{d.title}</span>
              <span className="block text-fg-muted">{d.text}</span>
            </li>
          ))}
        </ul>
      );
    case "chunking":
      return (
        <ol className="space-y-1.5 text-sm">
          {state.chunks.map((c) => (
            <li key={c.id} className="flex gap-2">
              <span className="w-28 shrink-0 font-mono text-xs text-fg-subtle">{c.id}</span>
              <span>{c.text}</span>
            </li>
          ))}
        </ol>
      );
    case "indexing":
    case "question":
      return (
        <div className="space-y-3 text-sm">
          {state.stage === "question" && (
            <p>
              Query terms:{" "}
              <span className="font-mono">{[...terms(state.question)].join(", ")}</span>
            </p>
          )}
          <ol className="space-y-1.5">
            {state.chunks.map((c) => (
              <li key={c.id} className="flex gap-2">
                <span className="w-28 shrink-0 font-mono text-xs text-fg-subtle">{c.id}</span>
                <span className="font-mono text-xs">{[...terms(c.text)].join(" · ")}</span>
              </li>
            ))}
          </ol>
        </div>
      );
    case "retrieval":
      return (
        <ScoreTable
          rows={state.retrieved}
          caption="Retrieved chunks, best first (highlighted rows go into the context)"
          context={inContext}
        />
      );
    case "reranking":
      return (
        <ScoreTable
          rows={state.reranked ?? []}
          caption="After reranking (superseded documents removed)"
          context={inContext}
        />
      );
    case "context":
      return (
        <pre className="overflow-x-auto rounded-lg border border-border bg-surface p-3 font-mono text-xs leading-relaxed whitespace-pre-wrap">
          {state.prompt}
        </pre>
      );
    case "generation": {
      const verdict = state.answer!.verdict;
      const Icon =
        verdict === "correct" ? CircleCheck : verdict === "outdated" ? CircleAlert : TriangleAlert;
      return (
        <div className="space-y-3">
          <blockquote className="rounded-lg border border-border bg-surface p-4 text-sm">
            {state.answer!.text}
          </blockquote>
          <p
            className={cn(
              "inline-flex items-center gap-1.5 text-sm font-medium",
              verdict === "correct"
                ? "text-ok"
                : verdict === "outdated"
                  ? "text-fail"
                  : "text-warn",
            )}
          >
            <Icon aria-hidden className="size-4" />
            {VERDICT_LABEL[verdict]}
          </p>
          <p className="text-xs text-fg-subtle">
            Pre-written response selected from the facts present in the context — no model was
            called.
          </p>
        </div>
      );
    }
  }
}

export function RagWalkthrough() {
  const [params, setParams] = useState<RagParams>(DEFAULT_RAG_PARAMS);
  const frames = useMemo(() => ragFrames(params), [params]);
  const steps = useMemo(() => ragSteps(params), [params]);
  const playback = usePlayback({ frameCount: frames.length, frameMs: 2500 });
  const state = frames[Math.min(playback.frame, frames.length - 1)]!.state;
  const update = (patch: Partial<RagParams>) => {
    setParams((p) => ({ ...p, ...patch }));
    playback.pause();
    playback.seek(0);
  };

  return (
    <SimulationPlayer
      kind="walkthrough"
      title="RAG pipeline"
      description="A retrieval-augmented generation pipeline over a small fictional handbook, from documents and chunking through retrieval, optional reranking and context construction to a generated answer. Changing the settings changes what is retrieved and whether the answer is right."
      frames={frames}
      playback={playback}
      aspectRatio="760 / 300"
      scene={(f) => <RagScene state={f.state} />}
      positionLabel={(f) => `Step ${f.index + 1} of ${frames.length}`}
      eventTime={(at) => `#${at + 1}`}
      assumptions={RAG_ASSUMPTIONS}
      stepTitles={steps.map((s) => s.title)}
      stats={(f) => (
        <dl className="grid grid-cols-2 gap-x-4 gap-y-2 sm:grid-cols-4">
          <Stat label="Chunks indexed" value={f.state.chunks.length} />
          <Stat label="Chunks in context" value={f.state.context.length} />
          <Stat label="Context size" value={`${f.state.contextWords} words`} />
          <Stat
            label="Outdated chunks in context"
            value={f.state.context.filter((c) => !c.current).length}
            tone={f.state.context.some((c) => !c.current) ? "fail" : "ok"}
          />
        </dl>
      )}
      controls={
        <div className="space-y-5">
          <div className="flex flex-wrap gap-x-6 gap-y-4">
            <label className="flex flex-col gap-1.5 text-xs font-medium text-fg-muted">
              Question
              <select
                value={params.question}
                onChange={(e) => update({ question: e.target.value as QuestionId })}
                className="rounded-md border border-border bg-bg px-2 py-1.5 text-sm text-fg"
              >
                {QUESTIONS.map((q) => (
                  <option key={q.id} value={q.id}>
                    {q.text}
                  </option>
                ))}
              </select>
            </label>
            <SegmentedControl<RagParams["chunking"]>
              label="Chunking"
              value={params.chunking}
              options={[
                { value: "sentence", label: "Sentences" },
                { value: "document", label: "Whole documents" },
              ]}
              onChange={(chunking) => update({ chunking })}
            />
            <SegmentedControl
              label="Top k"
              value={String(params.topK)}
              options={[1, 2, 3, 4].map((n) => ({ value: String(n), label: String(n) }))}
              onChange={(k) => update({ topK: Number(k) })}
            />
            <Toggle
              label="Reranker"
              description="re-score and drop superseded docs"
              checked={params.rerank}
              onChange={(rerank) => update({ rerank })}
            />
            <Toggle
              label="Outdated 2023 policy in the corpus"
              checked={params.includeSuperseded}
              onChange={(includeSuperseded) => update({ includeSuperseded })}
            />
          </div>
          <section aria-label="Stage detail" className="rounded-lg border border-border p-4">
            <h4 className="mb-3 font-mono text-[11px] tracking-wide text-fg-subtle uppercase">
              {steps[playback.frame]?.title}
            </h4>
            <StageDetail state={state} />
          </section>
        </div>
      }
    />
  );
}

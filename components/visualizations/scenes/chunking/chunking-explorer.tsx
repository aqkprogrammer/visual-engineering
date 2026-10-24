"use client";

import { CircleCheck, CircleAlert, CircleX, Scissors } from "lucide-react";
import { useId, useMemo, useState } from "react";
import {
  CHUNK_QUESTIONS,
  DEFAULT_CHUNKING_PARAMS,
  evidenceRanges,
  layout,
  OVERLAPS,
  runChunking,
  SIZES,
  type ChunkingParams,
  type Strategy,
  type Verdict,
} from "@/lib/simulation/models/chunking";
import { cn } from "@/lib/utils/cn";
import { SegmentedControl, Stat, Toggle } from "../../player/controls";
import { ExplorerFrame } from "../../player/explorer-frame";

export const CHUNKING_ASSUMPTIONS = [
  "A short, fictional on-call runbook. Chunk sizes and overlap are counted in words; real splitters count characters or tokens and use much larger sizes, typically hundreds of tokens.",
  "Retrieval scores each chunk by the share of the question's significant words it contains — the same stand-in for embedding similarity as the RAG demo — so you can see why a chunk matched.",
  "A question counts as answerable when every word of its evidence is in the retrieved chunks. A real model also has to read them correctly.",
  "“Add section headings” prefixes each chunk with its heading before it is scored and sent, a simple version of adding context to chunks.",
];

const STRATEGIES: { value: Strategy; label: string }[] = [
  { value: "fixed", label: "Fixed size" },
  { value: "sentence", label: "Sentences" },
  { value: "structure", label: "Structure-aware" },
];

const VERDICT_TEXT: Record<Verdict, string> = {
  answerable: "Answerable: all the evidence was retrieved",
  partial: "Partly answerable: some of the evidence is missing",
  missed: "Not answerable: none of the evidence was retrieved",
};

function VerdictIcon({ verdict }: { verdict: Verdict }) {
  const className = "mt-0.5 size-4 shrink-0";
  if (verdict === "answerable")
    return <CircleCheck aria-hidden className={cn(className, "text-ok")} />;
  if (verdict === "partial")
    return <CircleAlert aria-hidden className={cn(className, "text-warn")} />;
  return <CircleX aria-hidden className={cn(className, "text-fail")} />;
}

const pct = (n: number) => `${Math.round(n * 100)}%`;

export function ChunkingExplorer() {
  const [params, setParams] = useState<ChunkingParams>(DEFAULT_CHUNKING_PARAMS);
  const [questionId, setQuestionId] = useState(CHUNK_QUESTIONS[0]!.id);
  const questionName = useId();
  const set = (change: Partial<ChunkingParams>) => setParams((p) => ({ ...p, ...change }));

  const result = useMemo(() => runChunking(params), [params]);
  const { words, units } = useMemo(() => layout(), []);
  const answer = result.questions.find((q) => q.question.id === questionId)!;
  const evidence = evidenceRanges(answer.question);
  const isEvidence = (w: number) => evidence.some((r) => w >= r.start && w < r.end);
  const isHeading = (w: number) =>
    units.some((u) => u.kind === "heading" && w >= u.start && w < u.end);
  /** Runs of words that share the same highlighting, so marks and headings render as wholes. */
  const segments = (start: number, end: number) => {
    const runs: { start: number; end: number; evidence: boolean; heading: boolean }[] = [];
    for (let w = start; w < end; w++) {
      const evidence = isEvidence(w);
      const heading = isHeading(w);
      const last = runs.at(-1);
      if (last && last.evidence === evidence && last.heading === heading && last.end === w)
        last.end = w + 1;
      else runs.push({ start: w, end: w + 1, evidence, heading });
    }
    return runs;
  };
  const retrieved = new Set(answer.retrieved.map((c) => c.index));

  return (
    <ExplorerFrame title="Chunking explorer" assumptions={CHUNKING_ASSUMPTIONS}>
      <div className="grid gap-6 px-4 py-4 lg:grid-cols-[17rem_1fr]">
        <div className="space-y-4">
          <SegmentedControl<Strategy>
            label="Strategy"
            value={params.strategy}
            options={STRATEGIES}
            onChange={(strategy) => set({ strategy })}
          />
          <SegmentedControl
            label="Chunk size (words)"
            value={String(params.size)}
            options={SIZES.map((n) => ({ value: String(n), label: String(n) }))}
            onChange={(size) => set({ size: Number(size) })}
          />
          <SegmentedControl
            label="Overlap (words)"
            value={String(params.overlap)}
            options={OVERLAPS.map((n) => ({ value: String(n), label: String(n) }))}
            onChange={(overlap) => set({ overlap: Number(overlap) })}
          />
          <Toggle
            label="Add section headings"
            description="prefix each chunk with its heading"
            checked={params.headings}
            onChange={(headings) => set({ headings })}
          />
          <SegmentedControl
            label="Chunks retrieved per question"
            value={String(params.topK)}
            options={[1, 2, 3].map((n) => ({ value: String(n), label: String(n) }))}
            onChange={(topK) => set({ topK: Number(topK) })}
          />

          <fieldset className="space-y-1.5">
            <legend className="mb-1.5 text-xs font-medium text-fg-muted">Question</legend>
            {result.questions.map((q) => (
              <label
                key={q.question.id}
                className="flex cursor-pointer items-start gap-2 rounded-md px-2 py-1.5 text-sm hover:bg-surface has-[:checked]:bg-accent-soft"
              >
                <input
                  type="radio"
                  name={questionName}
                  value={q.question.id}
                  checked={q.question.id === questionId}
                  onChange={() => setQuestionId(q.question.id)}
                  className="mt-1 accent-[var(--accent)]"
                />
                <span>
                  {q.question.text}
                  <span className="sr-only">: {VERDICT_TEXT[q.verdict]}</span>
                </span>
                <span className="ml-auto pt-0.5">
                  <VerdictIcon verdict={q.verdict} />
                </span>
              </label>
            ))}
          </fieldset>
        </div>

        <div className="min-w-0 space-y-4">
          <dl className="grid grid-cols-2 gap-x-4 gap-y-2 sm:grid-cols-4">
            <Stat label="Chunks" value={result.chunks.length} />
            <Stat
              label="Words indexed"
              value={`${result.indexedWords} of ${result.documentWords}`}
              tone={result.indexedWords > result.documentWords * 1.5 ? "warn" : undefined}
            />
            <Stat
              label="Cut mid-sentence"
              value={result.cutSentences}
              tone={result.cutSentences > 0 ? "warn" : "ok"}
            />
            <Stat
              label="Words sent for this question"
              value={`${answer.sentWords} (${pct(answer.relevantShare)} evidence)`}
            />
          </dl>

          <div
            className="space-y-1.5 rounded-lg border border-border px-3 py-2.5"
            aria-live="polite"
          >
            <p className="flex gap-2 text-sm font-medium">
              <VerdictIcon verdict={answer.verdict} />
              {VERDICT_TEXT[answer.verdict]} ({pct(answer.coverage)} of it)
            </p>
            <p className="text-sm text-fg-muted">{answer.question.why}</p>
          </div>

          <ol aria-label="Chunks" className="grid gap-2 sm:grid-cols-2">
            {result.chunks.map((chunk) => {
              const hit = retrieved.has(chunk.index);
              const rank = answer.retrieved.findIndex((c) => c.index === chunk.index) + 1;
              return (
                <li
                  key={chunk.index}
                  className={cn(
                    "rounded-md border px-3 py-2 text-sm",
                    hit ? "border-accent bg-accent-soft" : "border-border bg-surface",
                  )}
                >
                  <p className="mb-1 flex flex-wrap items-center gap-x-2 font-mono text-[11px] text-fg-subtle">
                    <span>chunk {chunk.index + 1}</span>
                    <span>{chunk.end - chunk.start} words</span>
                    {chunk.cutsSentence && (
                      <span className="inline-flex items-center gap-1 text-fg-muted">
                        <Scissors aria-hidden className="size-3 text-warn" /> cuts a sentence
                      </span>
                    )}
                    {hit && <span className="text-accent">retrieved #{rank}</span>}
                  </p>
                  <p className="leading-relaxed">
                    {params.headings && (
                      <span className="mb-0.5 block font-mono text-[11px] text-fg-muted">
                        prefixed:{" "}
                        {chunk.indexed.slice(0, chunk.indexed.length - chunk.text.length - 2)}
                      </span>
                    )}
                    {segments(chunk.start, chunk.end).map((seg) => {
                      const text = words.slice(seg.start, seg.end).join(" ");
                      if (seg.heading) {
                        return (
                          <strong key={seg.start} className="block font-semibold">
                            {seg.evidence ? (
                              <mark className="bg-data/25 text-fg">{text}</mark>
                            ) : (
                              text
                            )}
                          </strong>
                        );
                      }
                      return (
                        <span key={seg.start}>
                          {seg.evidence ? (
                            <mark className="rounded-sm bg-data/25 text-fg">{text}</mark>
                          ) : (
                            text
                          )}{" "}
                        </span>
                      );
                    })}
                  </p>
                </li>
              );
            })}
          </ol>
          <p className="text-xs text-fg-subtle">
            Highlighted words are the evidence for the selected question. Words in more than one
            chunk are stored, and paid for, more than once.
          </p>
        </div>
      </div>
    </ExplorerFrame>
  );
}

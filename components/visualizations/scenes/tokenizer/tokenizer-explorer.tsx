"use client";

import { useId, useMemo, useState } from "react";
import { CORPUS, END, tokenize, train } from "@/lib/simulation/models/tokenizer";
import { cn } from "@/lib/utils/cn";
import { ExplorerFrame } from "../../player/explorer-frame";

export const TOKENIZER_ASSUMPTIONS = [
  "A toy byte-pair encoding (BPE) tokenizer trained on four words from the original BPE paper's example (low, lower, newest, widest).",
  "“_” marks the end of a word, as in that paper. Ties between equally frequent pairs are broken alphabetically.",
  "Real LLM tokenizers run BPE over raw bytes, learn tens or hundreds of thousands of merges from huge corpora, and use completely different ids.",
  "Characters never seen in training have no id here; byte-level tokenizers never have this problem because every byte is in the base vocabulary.",
];

const MAX_MERGES = 10;
const TOKEN_TONES = [
  "bg-accent-soft border-accent/50",
  "bg-data/15 border-data/50",
  "bg-warn/15 border-warn/50",
  "bg-ok/15 border-ok/50",
];

export function TokenizerExplorer() {
  const inputId = useId();
  const [text, setText] = useState("lowest newer widest");
  const [mergeCount, setMergeCount] = useState(MAX_MERGES);
  const allMerges = useMemo(() => train(CORPUS, MAX_MERGES), []);
  const merges = allMerges.slice(0, mergeCount);
  const tokens = tokenize(text, merges);
  const words = text.trim() ? text.trim().split(/\s+/).length : 0;
  const unknown = tokens.filter((t) => t.id === null).length;

  return (
    <ExplorerFrame title="Byte-pair encoding explorer" assumptions={TOKENIZER_ASSUMPTIONS}>
      <div className="grid gap-6 px-4 py-4 lg:grid-cols-[1fr_16rem]">
        <div className="space-y-4">
          <div>
            <label htmlFor={inputId} className="text-xs font-medium text-fg-muted">
              Text to tokenize
            </label>
            <input
              id={inputId}
              value={text}
              onChange={(e) => setText(e.target.value.slice(0, 80))}
              className="mt-1.5 w-full rounded-md border border-border bg-bg px-3 py-2 font-mono text-sm"
            />
          </div>
          <label className="block text-xs font-medium text-fg-muted">
            Merges learned: {mergeCount} of {MAX_MERGES}
            <input
              type="range"
              min={0}
              max={MAX_MERGES}
              value={mergeCount}
              onChange={(e) => setMergeCount(Number(e.target.value))}
              aria-valuetext={`${mergeCount} merges learned`}
              className="mt-2 block w-full accent-[var(--accent)]"
            />
          </label>

          <div aria-live="polite">
            <p className="mb-2 text-xs font-medium text-fg-muted">
              {tokens.length} tokens · {words} words · {text.replace(/\s/g, "").length} characters
              {unknown > 0 ? ` · ${unknown} unknown` : ""}
            </p>
            <ol className="flex flex-wrap gap-1.5" aria-label="Tokens">
              {tokens.map((t, i) => (
                <li
                  key={i}
                  className={cn(
                    "rounded-md border px-2 py-1 font-mono text-sm",
                    t.id === null
                      ? "border-dashed border-fail/70 text-fail"
                      : TOKEN_TONES[t.word % TOKEN_TONES.length],
                  )}
                >
                  {t.text === END ? <span aria-label="end of word">{END}</span> : t.text}
                  <span className="ml-1.5 text-[10px] text-fg-subtle">
                    {t.id === null ? "?" : `#${t.id}`}
                  </span>
                </li>
              ))}
            </ol>
          </div>
        </div>

        <div>
          <p className="mb-2 text-xs font-medium text-fg-muted">Merges, in the order learned</p>
          <ol className="space-y-1 font-mono text-xs">
            {allMerges.map((m, i) => (
              <li
                key={m.merged}
                className={cn(
                  "flex justify-between gap-2 rounded px-1.5 py-0.5",
                  i >= mergeCount && "text-fg-subtle line-through",
                )}
              >
                <span>
                  {i + 1}. {m.pair[0]} + {m.pair[1]} → {m.merged}
                </span>
                <span className="text-fg-subtle">×{m.frequency}</span>
              </li>
            ))}
          </ol>
          <p className="mt-3 text-xs text-fg-subtle">
            Training corpus:{" "}
            {Object.entries(CORPUS)
              .map(([w, f]) => `${w} ×${f}`)
              .join(", ")}
          </p>
        </div>
      </div>
    </ExplorerFrame>
  );
}

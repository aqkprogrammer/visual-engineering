"use client";

import { Check } from "lucide-react";
import { useId, useMemo, useState } from "react";
import {
  ARTICLES,
  BM25,
  compareSearch,
  recallAt,
  reciprocalRank,
  RRF_K,
  SEARCH_QUERIES,
  type FusedHit,
  type Hit,
  type KeywordHit,
  type VectorHit,
} from "@/lib/simulation/models/hybrid-search";
import { cn } from "@/lib/utils/cn";
import { ExplorerFrame } from "../../player/explorer-frame";

export const HYBRID_SEARCH_ASSUMPTIONS = [
  `Keyword search is real BM25 with Elasticsearch's default parameters (k1 = ${BM25.k1}, b = ${BM25.b}) over lower-cased words, with no stemming or stop-word removal — like Elasticsearch's standard analyzer.`,
  "Vector search is a stand-in for an embedding model: a small hand-written lexicon maps words and phrases to nine named concepts, and texts are compared by cosine similarity. Real models learn hundreds of unnamed dimensions and cover far more vocabulary.",
  `Hybrid search fuses the two rankings with reciprocal rank fusion, k = ${RRF_K}, the value Cormack, Clarke and Büttcher used. It looks only at ranks, so the two methods' very different scores never need to be compared.`,
  "Ten fictional help-centre articles. Which articles are relevant to each example question is decided by hand.",
];

const TOP = 5;
const title = (id: string) => ARTICLES.find((a) => a.id === id)!.title;
const fixed = (n: number, digits = 2) => n.toFixed(digits);

function ResultList<H extends Hit>({
  name,
  hits,
  detail,
  relevant,
}: {
  name: string;
  hits: H[];
  detail: (hit: H) => string;
  relevant: string[] | null;
}) {
  const top = hits.slice(0, TOP);
  return (
    <section aria-label={`${name} results`} className="min-w-0 space-y-2">
      <h4 className="text-sm font-semibold">{name}</h4>
      {relevant && (
        <p className="font-mono text-[11px] text-fg-subtle">
          recall@3 {fixed(recallAt(hits, relevant, 3))} · reciprocal rank{" "}
          {fixed(reciprocalRank(hits, relevant))}
        </p>
      )}
      {top.length === 0 ? (
        <p className="text-sm text-fg-muted">No article matched.</p>
      ) : (
        <ol className="space-y-1.5">
          {top.map((hit) => {
            const isRelevant = relevant?.includes(hit.id) ?? false;
            return (
              <li
                key={hit.id}
                className={cn(
                  "rounded-md border px-2.5 py-1.5 text-sm",
                  isRelevant ? "border-ok/60 bg-ok/10" : "border-border bg-surface",
                )}
              >
                <span className="flex items-start gap-1.5">
                  <span className="font-mono text-xs text-fg-subtle">{hit.rank}.</span>
                  <span className="min-w-0 flex-1">{title(hit.id)}</span>
                  {isRelevant && (
                    <>
                      <Check aria-hidden className="mt-0.5 size-3.5 shrink-0 text-ok" />
                      <span className="sr-only">(relevant)</span>
                    </>
                  )}
                </span>
                <span className="block font-mono text-[11px] text-fg-subtle">{detail(hit)}</span>
              </li>
            );
          })}
        </ol>
      )}
    </section>
  );
}

export function HybridSearchExplorer() {
  const inputId = useId();
  const presetName = useId();
  const [query, setQuery] = useState(SEARCH_QUERIES[0]!.text);
  const preset = SEARCH_QUERIES.find((q) => q.text === query.trim()) ?? null;
  const results = useMemo(() => compareSearch(query), [query]);
  const relevant = preset?.relevant ?? null;

  return (
    <ExplorerFrame
      title="Keyword, vector and hybrid search"
      assumptions={HYBRID_SEARCH_ASSUMPTIONS}
    >
      <div className="space-y-5 px-4 py-4">
        <fieldset>
          <legend className="mb-1.5 text-xs font-medium text-fg-muted">Example questions</legend>
          <div className="flex flex-wrap gap-2">
            {SEARCH_QUERIES.map((q) => (
              <label
                key={q.id}
                className="cursor-pointer rounded-md border border-border px-2.5 py-1 text-sm hover:bg-surface has-[:checked]:border-accent has-[:checked]:bg-accent-soft has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-accent"
              >
                <input
                  type="radio"
                  name={presetName}
                  value={q.id}
                  checked={preset?.id === q.id}
                  onChange={() => setQuery(q.text)}
                  className="sr-only"
                />
                {q.text}
              </label>
            ))}
          </div>
        </fieldset>
        <div>
          <label htmlFor={inputId} className="text-xs font-medium text-fg-muted">
            Search query
          </label>
          <input
            id={inputId}
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value.slice(0, 80))}
            className="mt-1.5 w-full rounded-md border border-border bg-bg px-3 py-2 text-sm"
          />
        </div>

        <p className="text-sm text-fg-muted" aria-live="polite">
          {preset
            ? preset.lesson
            : "Your own query: results are live, but relevance is only judged for the example questions."}
        </p>

        <div className="grid gap-5 md:grid-cols-3">
          <ResultList<KeywordHit>
            name="Keyword (BM25)"
            hits={results.keyword}
            relevant={relevant}
            detail={(h) =>
              `${fixed(h.score)} = ${h.terms.map((t) => `${t.term} ${fixed(t.score)}`).join(" + ")}`
            }
          />
          <ResultList<VectorHit>
            name="Vector (toy embedding)"
            hits={results.vector}
            relevant={relevant}
            detail={(h) =>
              `cosine ${fixed(h.score)} · ${[...new Set(h.matched)].slice(0, 4).join(", ")}`
            }
          />
          <ResultList<FusedHit>
            name="Hybrid (rank fusion)"
            hits={results.hybrid}
            relevant={relevant}
            detail={(h) =>
              [
                h.keywordRank !== undefined ? `1/(${RRF_K}+${h.keywordRank})` : null,
                h.vectorRank !== undefined ? `1/(${RRF_K}+${h.vectorRank})` : null,
              ]
                .filter(Boolean)
                .join(" + ") + ` = ${h.score.toFixed(4)}`
            }
          />
        </div>
        <p className="text-xs text-fg-subtle">
          Green articles are relevant to the example question. Recall@3 is the share of relevant
          articles in the top three; reciprocal rank is 1 ÷ the position of the first relevant one.
        </p>
      </div>
    </ExplorerFrame>
  );
}

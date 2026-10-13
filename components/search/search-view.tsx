"use client";

import {
  BookOpen,
  MessageSquareText,
  PlayCircle,
  Route,
  Search as SearchIcon,
  Siren,
  Text,
} from "lucide-react";
import Link from "next/link";
import { useId, useMemo, useSyncExternalStore } from "react";
import {
  highlight,
  prepare,
  search,
  type SearchDoc,
  type SearchKind,
  type SearchResult,
} from "@/lib/search/search";

const KIND_LABEL: Record<SearchKind, string> = {
  lesson: "Lesson",
  path: "Learning path",
  demo: "Playground",
  incident: "Incident lab",
  question: "Interview question",
  term: "Glossary",
};

const KIND_ICON: Record<SearchKind, typeof BookOpen> = {
  lesson: BookOpen,
  path: Route,
  demo: PlayCircle,
  incident: Siren,
  question: MessageSquareText,
  term: Text,
};

const SUGGESTIONS = ["load balancer", "cache invalidation", "idempotency", "kubernetes", "RAG"];

// The query lives in the URL (?q=) so results can be shared and survive reloads and Back.
const queryListeners = new Set<() => void>();

function subscribeQuery(listener: () => void) {
  queryListeners.add(listener);
  window.addEventListener("popstate", listener);
  return () => {
    queryListeners.delete(listener);
    window.removeEventListener("popstate", listener);
  };
}

function readQuery(): string {
  return new URLSearchParams(window.location.search).get("q") ?? "";
}

function writeQuery(query: string) {
  const url = new URL(window.location.href);
  if (query) url.searchParams.set("q", query);
  else url.searchParams.delete("q");
  window.history.replaceState(window.history.state, "", url);
  for (const listener of queryListeners) listener();
}

export function SearchView({ docs }: { docs: SearchDoc[] }) {
  const query = useSyncExternalStore(subscribeQuery, readQuery, () => "");
  const prepared = useMemo(() => prepare(docs), [docs]);
  const results = useMemo(() => search(prepared, query), [prepared, query]);
  const inputId = useId();
  const trimmed = query.trim();

  return (
    <div className="space-y-8">
      <form role="search" onSubmit={(event) => event.preventDefault()} className="relative">
        <label htmlFor={inputId} className="sr-only">
          Search lessons, paths, demos, incidents, interview questions and glossary
        </label>
        <SearchIcon
          aria-hidden
          className="pointer-events-none absolute top-1/2 left-3.5 size-5 -translate-y-1/2 text-fg-subtle"
        />
        <input
          id={inputId}
          type="search"
          value={query}
          onChange={(event) => writeQuery(event.target.value)}
          placeholder="Search, e.g. “dead-letter queue”"
          autoComplete="off"
          spellCheck={false}
          enterKeyHint="search"
          className="w-full rounded-lg border border-border-strong bg-bg py-3 pr-4 pl-11 text-base placeholder:text-fg-subtle focus:border-accent"
        />
      </form>

      <p aria-live="polite" className="text-sm text-fg-muted">
        {trimmed === ""
          ? `${docs.length} lessons, paths, demos, incidents, questions and terms to search.`
          : results.length === 0
            ? `No results for “${trimmed}”.`
            : `${results.length} result${results.length === 1 ? "" : "s"} for “${trimmed}”.`}
      </p>

      {trimmed === "" ? (
        <div className="space-y-3">
          <p className="text-sm font-medium">Try searching for</p>
          <ul className="flex flex-wrap gap-2">
            {SUGGESTIONS.map((suggestion) => (
              <li key={suggestion}>
                <button
                  type="button"
                  onClick={() => writeQuery(suggestion)}
                  className="rounded-full border border-border-strong px-3 py-1 text-sm hover:bg-surface"
                >
                  {suggestion}
                </button>
              </li>
            ))}
          </ul>
        </div>
      ) : results.length === 0 ? (
        <p className="text-sm text-fg-muted">
          Check the spelling, try fewer words, or{" "}
          <Link href="/explore" className="text-accent underline underline-offset-2">
            browse all topics
          </Link>
          .
        </p>
      ) : (
        <ol className="space-y-3">
          {results.map((result) => (
            <ResultItem key={result.doc.href} result={result} query={trimmed} />
          ))}
        </ol>
      )}
    </div>
  );
}

function ResultItem({ result, query }: { result: SearchResult; query: string }) {
  const { doc } = result;
  const Icon = KIND_ICON[doc.kind];
  return (
    <li>
      <Link
        href={doc.href}
        className="group block rounded-lg border border-border px-5 py-4 transition-colors hover:border-border-strong hover:bg-surface"
      >
        <span className="flex items-center gap-2 font-mono text-xs text-fg-subtle">
          <Icon aria-hidden className="size-3.5" />
          {doc.context ? `${KIND_LABEL[doc.kind]} · ${doc.context}` : KIND_LABEL[doc.kind]}
        </span>
        <span className="mt-1.5 block font-medium group-hover:text-accent">
          {highlight(doc.title, query).map((segment, index) =>
            segment.match ? (
              <mark key={index} className="rounded-sm bg-accent-soft px-0.5 text-fg">
                {segment.text}
              </mark>
            ) : (
              <span key={index}>{segment.text}</span>
            ),
          )}
        </span>
        <span className="mt-1 line-clamp-2 block text-sm text-fg-muted">{doc.summary}</span>
      </Link>
    </li>
  );
}

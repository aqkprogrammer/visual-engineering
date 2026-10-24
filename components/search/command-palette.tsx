"use client";

import { CornerDownLeft, Search } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useId, useLayoutEffect, useMemo, useRef, useState } from "react";
import { prepare, search, type SearchDoc, type SearchKind } from "@/lib/search/search";
import { getBasePath } from "@/lib/site";
import { cn } from "@/lib/utils/cn";

const KIND_LABEL: Record<SearchKind, string> = {
  lesson: "Lesson",
  path: "Learning path",
  demo: "Playground",
  incident: "Incident lab",
  question: "Interview question",
  term: "Glossary",
};
const LIMIT = 8;

let indexPromise: Promise<SearchDoc[]> | null = null;
/** The search index, fetched once per page load and shared by every opening of the palette. */
function loadIndex(): Promise<SearchDoc[]> {
  indexPromise ??= fetch(`${getBasePath()}/search-index.json`).then((r) => {
    if (!r.ok) throw new Error(`HTTP ${r.status}`);
    return r.json() as Promise<SearchDoc[]>;
  });
  indexPromise.catch(() => (indexPromise = null));
  return indexPromise;
}

/** A modal quick-search: type, move with the arrow keys, press Enter to go. */
export default function CommandPalette({
  onClose,
  takeEarlyInput,
  docs: initialDocs,
}: {
  onClose(): void;
  /** Hands over anything typed before the palette was ready, and stops collecting it. */
  takeEarlyInput?(): string;
  /** For tests; on the site the index is fetched. */
  docs?: SearchDoc[];
}) {
  const router = useRouter();
  const dialog = useRef<HTMLDialogElement>(null);
  const input = useRef<HTMLInputElement>(null);
  const id = useId();
  const [docs, setDocs] = useState<SearchDoc[] | null>(initialDocs ?? null);
  const [failed, setFailed] = useState(false);
  const [query, setQuery] = useState("");
  const [active, setActive] = useState(0);

  // Before the browser handles another event: open the dialog and move focus into it.
  useLayoutEffect(() => {
    const el = dialog.current;
    if (el && !el.open) el.showModal();
    input.current?.focus();
    // From here on keys reach the input. Anything typed earlier was held by the trigger: take it
    // now, in the same task as the focus, so nothing can arrive in between.
    const typed = takeEarlyInput?.();
    // Syncing input that arrived outside React before this component committed.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (typed) setQuery(typed);
    // Runs once, when the palette opens.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (initialDocs) return;
    let cancelled = false;
    loadIndex()
      .then((d) => !cancelled && setDocs(d))
      .catch(() => !cancelled && setFailed(true));
    return () => {
      cancelled = true;
    };
    // Opening happens once; later prop changes must not reopen or refetch.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const prepared = useMemo(() => (docs ? prepare(docs) : []), [docs]);
  const results = useMemo(
    () => (query.trim() ? search(prepared, query, LIMIT) : []),
    [prepared, query],
  );

  const go = (href: string) => {
    onClose();
    router.push(href);
  };

  const onKeyDown = (event: React.KeyboardEvent) => {
    if (event.key === "ArrowDown" && results.length > 0) {
      event.preventDefault();
      setActive((a) => (a + 1) % results.length);
    } else if (event.key === "ArrowUp" && results.length > 0) {
      event.preventDefault();
      setActive((a) => (a - 1 + results.length) % results.length);
    } else if (event.key === "Enter") {
      event.preventDefault();
      const target = results[active];
      if (target) go(target.doc.href);
      else if (query.trim()) go(`/search/?q=${encodeURIComponent(query.trim())}`);
    }
  };

  const status = failed
    ? "The search index couldn't be loaded."
    : !docs
      ? "Loading…"
      : !query.trim()
        ? "Type to search lessons, demos, paths, incidents, interview questions and terms."
        : results.length === 0
          ? "No matches. Press Enter to search everything."
          : `${results.length} result${results.length === 1 ? "" : "s"}. Use the arrow keys and Enter.`;

  return (
    <dialog
      ref={dialog}
      aria-labelledby={`${id}-title`}
      onClose={onClose}
      onClick={(event) => {
        if (event.target === dialog.current) dialog.current?.close();
      }}
      className="m-auto mt-[12vh] w-[min(36rem,calc(100vw-2rem))] rounded-xl border border-border-strong bg-bg p-0 text-fg shadow-2xl backdrop:bg-black/40"
    >
      <h2 id={`${id}-title`} className="sr-only">
        Quick search
      </h2>
      <div className="flex items-center gap-2 border-b border-border px-4">
        <Search aria-hidden className="size-4 shrink-0 text-fg-subtle" />
        <input
          ref={input}
          type="text"
          role="combobox"
          aria-expanded={results.length > 0}
          aria-controls={`${id}-list`}
          aria-activedescendant={results[active] ? `${id}-option-${active}` : undefined}
          aria-autocomplete="list"
          aria-label="Search"
          placeholder="Search Visual Engineering…"
          value={query}
          onChange={(event) => {
            setQuery(event.target.value.slice(0, 100));
            setActive(0);
          }}
          onKeyDown={onKeyDown}
          className="h-12 w-full bg-transparent text-base outline-none placeholder:text-fg-subtle"
        />
        <kbd className="rounded border border-border px-1.5 py-0.5 font-mono text-[10px] text-fg-subtle">
          Esc
        </kbd>
      </div>
      <ul
        id={`${id}-list`}
        role="listbox"
        aria-label="Results"
        className="max-h-[50vh] overflow-y-auto p-2"
      >
        {results.map((result, i) => (
          <li
            key={result.doc.href}
            id={`${id}-option-${i}`}
            role="option"
            aria-selected={i === active}
            onMouseMove={() => setActive(i)}
            onClick={() => go(result.doc.href)}
            className={cn(
              "flex cursor-pointer items-center gap-3 rounded-md px-3 py-2",
              i === active && "bg-accent-soft",
            )}
          >
            <span className="min-w-0 flex-1">
              <span className="block truncate text-sm font-medium">{result.doc.title}</span>
              <span className="block truncate font-mono text-[11px] text-fg-subtle">
                {result.doc.context
                  ? `${KIND_LABEL[result.doc.kind]} · ${result.doc.context}`
                  : KIND_LABEL[result.doc.kind]}
              </span>
            </span>
            {i === active && (
              <CornerDownLeft aria-hidden className="size-3.5 shrink-0 text-fg-subtle" />
            )}
          </li>
        ))}
      </ul>
      <p role="status" className="border-t border-border px-4 py-2 text-xs text-fg-muted">
        {status}
      </p>
    </dialog>
  );
}

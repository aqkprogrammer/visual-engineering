import { ArrowRight, Route, Siren } from "lucide-react";
import Link from "next/link";
import type { PathPosition } from "@/lib/content/catalog";
import type { GlossaryTerm, Incident } from "@/lib/content/schema";

/** Where this lesson sits in each learning path that includes it, and what comes next. */
export function LessonPaths({ positions }: { positions: PathPosition[] }) {
  if (positions.length === 0) return null;
  return (
    <section aria-labelledby="learning-paths" className="space-y-4">
      <h2 id="learning-paths" className="text-xl font-semibold">
        Learning paths
      </h2>
      <ul className="grid gap-3">
        {positions.map(({ path, index, next }) => (
          <li
            key={path.slug}
            className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-border px-5 py-4"
          >
            <div className="min-w-0">
              <Link
                href={`/paths/${path.slug}`}
                className="inline-flex items-center gap-1.5 font-medium hover:text-accent"
              >
                <Route aria-hidden className="size-4 text-fg-subtle" />
                {path.title}
              </Link>
              <p className="font-mono text-xs text-fg-subtle">
                Step {index + 1} of {path.steps.length}
              </p>
            </div>
            {next ? (
              <Link
                href={`/${next.id}`}
                className="inline-flex items-center gap-1.5 text-sm text-accent hover:underline"
              >
                Next: {next.title}
                <ArrowRight aria-hidden className="size-3.5" />
              </Link>
            ) : (
              <span className="text-sm text-fg-subtle">Last lesson in this path</span>
            )}
          </li>
        ))}
      </ul>
    </section>
  );
}

/** Glossary terms this lesson explains, linking to their short definitions. */
export function KeyTerms({ terms }: { terms: GlossaryTerm[] }) {
  if (terms.length === 0) return null;
  return (
    <section aria-labelledby="key-terms" className="space-y-4">
      <h2 id="key-terms" className="text-xl font-semibold">
        Key terms
      </h2>
      <ul className="flex flex-wrap gap-2">
        {terms.map((term) => (
          <li key={term.id}>
            <Link
              href={`/glossary/#${term.id}`}
              className="inline-block rounded-full border border-border-strong px-3 py-1 text-sm hover:bg-surface"
            >
              {term.term}
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}

/** Incident-lab scenarios whose root cause this lesson explains. */
export function LessonIncidents({ incidents }: { incidents: Incident[] }) {
  if (incidents.length === 0) return null;
  return (
    <section aria-labelledby="debug-it" className="space-y-4">
      <h2 id="debug-it" className="text-xl font-semibold">
        Debug it
      </h2>
      <ul className="grid gap-3">
        {incidents.map((incident) => (
          <li key={incident.slug}>
            <Link
              href={`/incidents/${incident.slug}`}
              className="group block rounded-lg border border-border px-5 py-4 transition-colors hover:border-border-strong hover:bg-surface"
            >
              <span className="inline-flex items-center gap-1.5 font-mono text-xs text-fg-subtle">
                <Siren aria-hidden className="size-3.5" /> Incident lab
              </span>
              <span className="mt-1 block font-medium group-hover:text-accent">
                {incident.title}
              </span>
              <span className="mt-1 block text-sm text-fg-muted">{incident.summary}</span>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}

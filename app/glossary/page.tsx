import { ArrowRight } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { getGlossary, getLessonsByRef } from "@/lib/content/catalog";
import type { GlossaryTerm } from "@/lib/content/schema";
import { alternatesFor } from "@/lib/seo";

export const metadata: Metadata = {
  title: "Glossary",
  description:
    "Plain-language definitions of the engineering terms used across Visual Engineering, from backpressure to vector search, each linked to the lesson that explains it.",
  alternates: alternatesFor("/glossary"),
};

function initial(term: GlossaryTerm): string {
  const first = term.term[0]?.toUpperCase() ?? "#";
  return /[A-Z]/.test(first) ? first : "#";
}

export default function GlossaryPage() {
  const terms = getGlossary();
  const byId = new Map(terms.map((t) => [t.id, t]));
  const groups = new Map<string, GlossaryTerm[]>();
  for (const term of terms) {
    const letter = initial(term);
    groups.set(letter, [...(groups.get(letter) ?? []), term]);
  }

  return (
    <div className="mx-auto max-w-3xl px-4 pt-12 sm:px-6">
      <header className="space-y-4">
        <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">Glossary</h1>
        <p className="text-lg text-fg-muted">
          {terms.length} terms in plain language. Each one links to the lesson that explains it in
          depth, with a simulation you can play with.
        </p>
      </header>

      <nav aria-label="Glossary letters" className="mt-8">
        <ul className="flex flex-wrap gap-1">
          {[...groups.keys()].map((letter) => (
            <li key={letter}>
              <a
                href={`#letter-${letter}`}
                className="inline-flex size-9 items-center justify-center rounded-md border border-border font-mono text-sm hover:border-border-strong hover:bg-surface"
              >
                {letter}
              </a>
            </li>
          ))}
        </ul>
      </nav>

      <div className="mt-10 space-y-12">
        {[...groups.entries()].map(([letter, group]) => (
          <section key={letter} aria-labelledby={`letter-${letter}`}>
            <h2
              id={`letter-${letter}`}
              className="scroll-mt-20 border-b border-border pb-2 font-mono text-lg text-fg-subtle"
            >
              {letter}
            </h2>
            <dl className="divide-y divide-border">
              {group.map((term) => {
                const [lesson] = term.lesson ? getLessonsByRef([term.lesson]) : [];
                const related = term.related.flatMap((id) => byId.get(id) ?? []);
                return (
                  <div
                    key={term.id}
                    id={term.id}
                    className="scroll-mt-20 space-y-2 py-5 target:rounded-lg target:bg-accent-soft target:px-4"
                  >
                    <dt className="font-semibold">
                      {term.term}
                      {term.aliases.length > 0 && (
                        <span className="ml-2 text-sm font-normal text-fg-subtle">
                          also: {term.aliases.join(", ")}
                        </span>
                      )}
                    </dt>
                    <dd className="text-fg-muted">{term.definition}</dd>
                    {(lesson || related.length > 0) && (
                      <dd className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm">
                        {lesson && (
                          <Link
                            href={`/${lesson.id}`}
                            className="inline-flex items-center gap-1 text-accent hover:underline"
                          >
                            Learn it: {lesson.title}
                            <ArrowRight aria-hidden className="size-3.5" />
                          </Link>
                        )}
                        {related.length > 0 && (
                          <span className="text-fg-subtle">
                            See also{" "}
                            {related.map((r, index) => (
                              <span key={r.id}>
                                {index > 0 && ", "}
                                <a
                                  href={`#${r.id}`}
                                  className="text-fg-muted underline underline-offset-2 hover:text-fg"
                                >
                                  {r.term}
                                </a>
                              </span>
                            ))}
                          </span>
                        )}
                      </dd>
                    )}
                  </div>
                );
              })}
            </dl>
          </section>
        ))}
      </div>
    </div>
  );
}

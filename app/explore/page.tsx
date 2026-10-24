import type { Metadata } from "next";
import { alternatesFor } from "@/lib/seo";
import Link from "next/link";
import { LessonListItem } from "@/components/lessons/lesson-meta";
import { getDomainLessons, getDomains } from "@/lib/content/catalog";

export const metadata: Metadata = {
  title: "Explore all topics",
  description:
    "Browse every domain in Visual Engineering — system design, software architecture, AI engineering, containers, cloud, networking and computer science.",
  alternates: alternatesFor("/explore"),
};

export default function ExplorePage() {
  const domains = getDomains();
  return (
    <div className="mx-auto max-w-6xl px-4 pt-12 sm:px-6">
      <header className="max-w-2xl space-y-4">
        <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">Explore</h1>
        <p className="text-lg text-fg-muted">
          Seven domains, organised from fundamentals to production practice. Published lessons are
          listed under each domain; everything else is on the roadmap and marked as planned.
        </p>
        <p className="text-sm">
          <Link href="/map" className="text-accent underline underline-offset-2">
            See how the lessons connect on the knowledge map
          </Link>
        </p>
      </header>

      <div className="mt-12 divide-y divide-border border-y border-border">
        {domains.map((domain) => {
          const lessons = getDomainLessons(domain.id);
          const planned = domain.modules.reduce((n, m) => n + m.plannedTopics.length, 0);
          return (
            <section
              key={domain.id}
              aria-labelledby={`domain-${domain.id}`}
              className="grid gap-6 py-10 lg:grid-cols-[18rem_1fr]"
            >
              <div className="space-y-2">
                <h2 id={`domain-${domain.id}`} className="text-xl font-semibold">
                  <Link href={`/${domain.id}`} className="hover:text-accent">
                    {domain.title}
                  </Link>
                </h2>
                <p className="text-sm text-fg-muted">{domain.tagline}</p>
                <p className="font-mono text-xs text-fg-subtle">
                  {lessons.length} published · {planned} planned · {domain.modules.length} modules
                </p>
              </div>
              {lessons.length > 0 ? (
                <ul className="grid gap-3">
                  {lessons.map((lesson) => (
                    <LessonListItem key={lesson.id} lesson={lesson} />
                  ))}
                </ul>
              ) : (
                <p className="self-center text-sm text-fg-subtle">
                  No lessons published yet.{" "}
                  <Link href={`/${domain.id}`} className="text-accent underline underline-offset-2">
                    See what&rsquo;s planned
                  </Link>
                  .
                </p>
              )}
            </section>
          );
        })}
      </div>
    </div>
  );
}

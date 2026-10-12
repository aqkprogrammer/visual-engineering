import { ArrowRight, ArrowUpRight } from "lucide-react";
import Link from "next/link";
import { LessonListItem } from "@/components/lessons/lesson-meta";
import { LoadBalancerDiagram } from "@/components/visualizations/static/load-balancer-diagram";
import { getDomainLessons, getDomains, getLessons } from "@/lib/content/catalog";
import { site } from "@/lib/site";

const METHOD = [
  ["Intuition", "An everyday analogy, clearly marked as one."],
  ["Visual", "A diagram of the moving parts and how they connect."],
  ["Simulation", "Play it, step through it, change it, break it."],
  ["Technical", "The real terminology, protocols and internals."],
  ["Production", "Failure modes, trade-offs and how it runs at scale."],
  ["Check", "Interview questions and a knowledge check."],
] as const;

export default function HomePage() {
  const domains = getDomains();
  const lessons = getLessons();
  const firstLesson = lessons[0];

  return (
    <div className="mx-auto max-w-6xl px-4 sm:px-6">
      <section
        aria-labelledby="hero"
        className="grid items-center gap-10 pt-14 pb-16 lg:grid-cols-[1fr_1.1fr] lg:pt-20"
      >
        <div className="space-y-6">
          <p className="font-mono text-xs tracking-wide text-fg-subtle uppercase">
            Open-source engineering lessons
          </p>
          <h1
            id="hero"
            className="text-4xl leading-[1.08] font-semibold tracking-tight text-balance sm:text-5xl"
          >
            Watch it work. Change it. Break it.
          </h1>
          <p className="max-w-xl text-lg text-fg-muted">
            Interactive, visual explanations of system design, AI engineering, infrastructure,
            networking and computer science — for beginners who want intuition and engineers who
            want the trade-offs.
          </p>
          <div className="flex flex-wrap gap-3">
            {firstLesson && (
              <Link
                href={`/${firstLesson.id}`}
                className="inline-flex items-center gap-2 rounded-md bg-accent px-4 py-2.5 text-sm font-medium text-accent-fg hover:opacity-90"
              >
                Read the first lesson
                <ArrowRight aria-hidden className="size-4" />
              </Link>
            )}
            <Link
              href="/explore"
              className="inline-flex items-center gap-2 rounded-md border border-border-strong px-4 py-2.5 text-sm font-medium hover:bg-surface"
            >
              Explore topics
            </Link>
          </div>
        </div>
        <LoadBalancerDiagram caption={false} id="hero-lb" />
      </section>

      <section aria-labelledby="method" className="border-t border-border py-14">
        <h2 id="method" className="text-2xl font-semibold tracking-tight">
          How every lesson teaches
        </h2>
        <ol className="mt-8 grid gap-x-8 gap-y-6 sm:grid-cols-2 lg:grid-cols-3">
          {METHOD.map(([title, text], index) => (
            <li key={title} className="flex gap-4">
              <span aria-hidden className="font-mono text-sm text-fg-subtle">
                {String(index + 1).padStart(2, "0")}
              </span>
              <span>
                <span className="block font-medium">{title}</span>
                <span className="mt-1 block text-sm text-fg-muted">{text}</span>
              </span>
            </li>
          ))}
        </ol>
      </section>

      <section aria-labelledby="domains" className="border-t border-border py-14">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <h2 id="domains" className="text-2xl font-semibold tracking-tight">
            Domains
          </h2>
          <Link href="/explore" className="text-sm text-accent hover:underline">
            Browse everything
          </Link>
        </div>
        <ul className="mt-8 grid gap-px overflow-hidden rounded-xl border border-border bg-border sm:grid-cols-2 lg:grid-cols-3">
          {domains.map((domain) => {
            const count = getDomainLessons(domain.id).length;
            return (
              <li key={domain.id} className="bg-bg">
                <Link href={`/${domain.id}`} className="group block h-full p-6 hover:bg-surface">
                  <span className="font-medium group-hover:text-accent">{domain.title}</span>
                  <span className="mt-2 block text-sm text-fg-muted">{domain.tagline}</span>
                  <span className="mt-4 block font-mono text-xs text-fg-subtle">
                    {count === 0
                      ? "Lessons in progress"
                      : `${count} lesson${count === 1 ? "" : "s"}`}
                  </span>
                </Link>
              </li>
            );
          })}
        </ul>
      </section>

      {lessons.length > 0 && (
        <section aria-labelledby="lessons" className="border-t border-border py-14">
          <h2 id="lessons" className="text-2xl font-semibold tracking-tight">
            Lessons
          </h2>
          <ul className="mt-8 grid gap-3 lg:grid-cols-2">
            {lessons.slice(0, 6).map((lesson) => (
              <LessonListItem key={lesson.id} lesson={lesson} />
            ))}
          </ul>
        </section>
      )}

      <section aria-labelledby="open-source" className="border-t border-border py-14">
        <div className="max-w-2xl space-y-4">
          <h2 id="open-source" className="text-2xl font-semibold tracking-tight">
            Open source, free, no account
          </h2>
          <p className="text-fg-muted">
            Every lesson, diagram and simulation lives in a public repository. Lessons are typed,
            schema-validated files reviewed like code, so corrections and new topics arrive through
            ordinary pull requests.
          </p>
          <a
            href={site.repoUrl}
            className="inline-flex items-center gap-1.5 text-accent hover:underline"
          >
            View the repository on GitHub
            <ArrowUpRight aria-hidden className="size-4" />
          </a>
        </div>
      </section>
    </div>
  );
}

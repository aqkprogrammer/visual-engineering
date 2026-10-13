import { Check } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Breadcrumbs } from "@/components/layout/breadcrumbs";
import { DifficultyBadge } from "@/components/lessons/lesson-meta";
import { CompletionBadge } from "@/components/progress/completion-badge";
import { PathContinue, PathProgress } from "@/components/progress/path-progress";
import { getDomain, getLearningPath, getLearningPaths, getLesson } from "@/lib/content/catalog";
import { alternatesFor } from "@/lib/seo";

export const dynamicParams = false;

export function generateStaticParams() {
  return getLearningPaths().map((p) => ({ slug: p.slug }));
}

export async function generateMetadata({ params }: PageProps<"/paths/[slug]">): Promise<Metadata> {
  const { slug } = await params;
  const path = getLearningPath(slug);
  if (!path) return {};
  return {
    title: `${path.title} · Learning path`,
    description: path.summary,
    alternates: alternatesFor(`/paths/${path.slug}`),
  };
}

export default async function PathPage({ params }: PageProps<"/paths/[slug]">) {
  const { slug } = await params;
  const path = getLearningPath(slug);
  if (!path) notFound();

  const steps = path.steps.flatMap((step) => {
    const [domain = "", lessonSlug = ""] = step.lesson.split("/");
    const lesson = getLesson(domain, lessonSlug);
    return lesson ? [{ ...step, lesson }] : [];
  });
  const minutes = steps.reduce((sum, s) => sum + s.lesson.readingMinutes, 0);

  return (
    <div className="mx-auto max-w-3xl px-4 pt-8 sm:px-6">
      <header className="space-y-5 border-b border-border pb-8">
        <Breadcrumbs items={[{ label: "Learning paths", href: "/paths" }, { label: path.title }]} />
        <div className="space-y-3">
          <p className="font-mono text-xs tracking-wide text-fg-subtle uppercase">Learning path</p>
          <h1 className="text-3xl leading-tight font-semibold tracking-tight text-balance sm:text-4xl">
            {path.title}
          </h1>
          <p className="text-lg text-fg-muted">{path.summary}</p>
        </div>
        <p className="font-mono text-xs text-fg-subtle">
          {steps.length} lessons · about {minutes} min of reading, plus time in the simulations
        </p>
        <PathProgress lessonIds={steps.map((s) => s.lesson.id)} />
        <PathContinue steps={steps.map((s) => ({ id: s.lesson.id, title: s.lesson.title }))} />
      </header>

      <div className="mt-10 grid gap-10 sm:grid-cols-2">
        <section aria-labelledby="audience" className="space-y-2">
          <h2 id="audience" className="font-semibold">
            Who it’s for
          </h2>
          <p className="text-sm text-fg-muted">{path.audience}</p>
        </section>
        <section aria-labelledby="outcomes" className="space-y-2">
          <h2 id="outcomes" className="font-semibold">
            By the end you can
          </h2>
          <ul className="space-y-1.5 text-sm text-fg-muted">
            {path.outcomes.map((outcome) => (
              <li key={outcome} className="flex gap-2">
                <Check aria-hidden className="mt-0.5 size-4 shrink-0 text-ok" />
                {outcome}
              </li>
            ))}
          </ul>
        </section>
      </div>

      <section aria-labelledby="steps" className="mt-12">
        <h2 id="steps" className="text-xl font-semibold">
          The lessons
        </h2>
        <ol className="mt-6 space-y-4">
          {steps.map((step, index) => (
            <li key={step.lesson.id} className="flex gap-4">
              <span
                aria-hidden
                className="flex size-8 shrink-0 items-center justify-center rounded-full border border-border-strong font-mono text-sm text-fg-muted"
              >
                {index + 1}
              </span>
              <div className="relative min-w-0 flex-1 rounded-lg border border-border px-5 py-4 transition-colors hover:border-border-strong hover:bg-surface">
                <p className="font-mono text-xs text-fg-subtle">
                  {getDomain(step.lesson.domain)?.title}
                </p>
                <h3 className="mt-1 font-medium">
                  <Link
                    href={`/${step.lesson.id}`}
                    className="after:absolute after:inset-0 after:rounded-lg hover:text-accent"
                  >
                    {step.lesson.title}
                  </Link>
                </h3>
                <p className="mt-1 text-sm text-fg-muted">{step.why}</p>
                <p className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-fg-subtle">
                  <DifficultyBadge difficulty={step.lesson.difficulty} />
                  <span>{step.lesson.readingMinutes} min read</span>
                  <CompletionBadge lessonId={step.lesson.id} />
                </p>
              </div>
            </li>
          ))}
        </ol>
      </section>
    </div>
  );
}

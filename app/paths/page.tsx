import type { Metadata } from "next";
import Link from "next/link";
import { PathProgress } from "@/components/progress/path-progress";
import { ProgressSummary } from "@/components/progress/progress-summary";
import { getLearningPaths, getLessons, getPathLessons } from "@/lib/content/catalog";
import { alternatesFor } from "@/lib/seo";

export const metadata: Metadata = {
  title: "Learning paths",
  description:
    "Guided sequences of lessons — how a web request is served, system design foundations, shipping with containers and AI engineering — with progress saved in your browser.",
  alternates: alternatesFor("/paths"),
};

export default function PathsPage() {
  const paths = getLearningPaths();
  return (
    <div className="mx-auto max-w-6xl px-4 pt-12 sm:px-6">
      <header className="max-w-2xl space-y-4">
        <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">Learning paths</h1>
        <p className="text-lg text-fg-muted">
          Lessons in a deliberate order, each building on the last. Every step says why it comes
          where it does, and lessons you mark as complete are ticked off as you go.
        </p>
      </header>

      <div className="mt-12 grid gap-10 lg:grid-cols-[1fr_20rem] lg:items-start">
        <ul className="grid gap-4 md:grid-cols-2">
          {paths.map((path) => {
            const lessons = getPathLessons(path);
            const minutes = lessons.reduce((sum, l) => sum + l.readingMinutes, 0);
            return (
              <li key={path.slug}>
                <article className="relative flex h-full flex-col gap-4 rounded-xl border border-border p-6 transition-colors hover:border-border-strong hover:bg-surface">
                  <div className="space-y-2">
                    <h2 className="font-semibold">
                      <Link
                        href={`/paths/${path.slug}`}
                        className="after:absolute after:inset-0 after:rounded-xl hover:text-accent"
                      >
                        {path.title}
                      </Link>
                    </h2>
                    <p className="text-sm text-fg-muted">{path.summary}</p>
                  </div>
                  <p className="font-mono text-xs text-fg-subtle">
                    {lessons.length} lessons · about {minutes} min of reading
                  </p>
                  <div className="mt-auto">
                    <PathProgress lessonIds={lessons.map((l) => l.id)} />
                  </div>
                </article>
              </li>
            );
          })}
        </ul>
        <ProgressSummary lessonIds={getLessons().map((l) => l.id)} />
      </div>
    </div>
  );
}

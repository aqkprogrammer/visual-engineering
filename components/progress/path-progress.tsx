"use client";

import { ArrowRight } from "lucide-react";
import Link from "next/link";
import { completedCount, nextIncomplete } from "@/lib/progress/progress";
import { useHydrated, useProgress } from "./progress-store";

/** "2 of 5 lessons completed" with a bar. The text carries the meaning; the bar is decoration. */
export function PathProgress({ lessonIds }: { lessonIds: string[] }) {
  const progress = useProgress();
  const hydrated = useHydrated();
  const done = completedCount(progress, lessonIds);
  const total = lessonIds.length;

  return (
    <div className="space-y-1.5">
      <p className="font-mono text-xs text-fg-subtle">
        {hydrated ? `${done} of ${total} lessons completed` : `${total} lessons`}
      </p>
      <div aria-hidden className="h-1.5 overflow-hidden rounded-full bg-surface-2">
        <div
          className="h-full rounded-full bg-accent transition-[width] duration-300"
          style={{ width: `${(done / total) * 100}%` }}
        />
      </div>
    </div>
  );
}

type StepLink = { id: string; title: string };

/** Start / continue / review call to action for a learning path. */
export function PathContinue({ steps }: { steps: StepLink[] }) {
  const progress = useProgress();
  const first = steps[0];
  if (!first) return null;
  const nextId = nextIncomplete(
    progress,
    steps.map((s) => s.id),
  );
  const started = steps.some((s) => progress.lessons[s.id]?.completedAt);
  const target = steps.find((s) => s.id === nextId) ?? first;
  const label = nextId === undefined ? "Review from the start" : started ? "Continue" : "Start";

  return (
    <Link
      href={`/${target.id}`}
      className="inline-flex items-center gap-2 rounded-md bg-accent px-4 py-2.5 text-sm font-medium text-accent-fg hover:opacity-90"
    >
      {label}: {target.title}
      <ArrowRight aria-hidden className="size-4" />
    </Link>
  );
}

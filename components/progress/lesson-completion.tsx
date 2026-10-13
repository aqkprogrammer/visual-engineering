"use client";

import { Check, Circle } from "lucide-react";
import { isCompleted, setCompleted } from "@/lib/progress/progress";
import { cn } from "@/lib/utils/cn";
import { updateProgress, useProgress } from "./progress-store";

/** "Mark as complete" toggle at the end of a lesson, with the best knowledge-check score. */
export function LessonCompletion({ lessonId }: { lessonId: string }) {
  const progress = useProgress();
  const done = isCompleted(progress, lessonId);
  const quiz = progress.lessons[lessonId]?.quiz;

  return (
    <section
      aria-label="Your progress"
      className="flex flex-wrap items-center justify-between gap-4 rounded-xl border border-border px-5 py-4"
    >
      <div className="space-y-1 text-sm">
        <p className="font-medium">{done ? "You’ve completed this lesson" : "Finished reading?"}</p>
        <p className="text-fg-muted">
          {quiz
            ? `Knowledge check: best ${quiz.best} of ${quiz.total}, last ${quiz.last} of ${quiz.total}. `
            : ""}
          Saved only in this browser.
        </p>
      </div>
      <button
        type="button"
        aria-pressed={done}
        onClick={() =>
          updateProgress((p) => setCompleted(p, lessonId, !isCompleted(p, lessonId), new Date()))
        }
        className={cn(
          "inline-flex items-center gap-2 rounded-md px-3.5 py-2 text-sm font-medium",
          done
            ? "border border-ok/70 text-fg hover:bg-surface"
            : "bg-accent text-accent-fg hover:opacity-90",
        )}
      >
        {done ? (
          <Check aria-hidden className="size-4 text-ok" />
        ) : (
          <Circle aria-hidden className="size-4" />
        )}
        {done ? "Completed" : "Mark as complete"}
      </button>
    </section>
  );
}

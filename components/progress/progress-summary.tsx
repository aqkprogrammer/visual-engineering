"use client";

import { useState } from "react";
import { completedCount } from "@/lib/progress/progress";
import { clearProgress, useHydrated, useProgress } from "./progress-store";

/** Overall progress with a two-step reset. Explains where the data lives. */
export function ProgressSummary({ lessonIds }: { lessonIds: string[] }) {
  const progress = useProgress();
  const hydrated = useHydrated();
  const [confirming, setConfirming] = useState(false);
  const done = completedCount(progress, lessonIds);
  const quizzes = lessonIds.filter((id) => progress.lessons[id]?.quiz).length;
  const hasProgress = Object.keys(progress.lessons).length > 0;

  return (
    <section
      aria-labelledby="your-progress"
      className="space-y-3 rounded-xl border border-border px-5 py-4"
    >
      <h2 id="your-progress" className="font-medium">
        Your progress
      </h2>
      <p className="text-sm text-fg-muted" aria-live="polite">
        {hydrated
          ? `${done} of ${lessonIds.length} lessons completed · ${quizzes} knowledge checks finished.`
          : "Loading your progress…"}
      </p>
      <p className="text-sm text-fg-muted">
        Progress is stored only in this browser — no account, nothing sent anywhere. Clearing site
        data or using another device starts fresh.
      </p>
      {hasProgress &&
        (confirming ? (
          <div className="flex flex-wrap items-center gap-3 text-sm">
            <span>Delete all progress in this browser?</span>
            <button
              type="button"
              onClick={() => {
                clearProgress();
                setConfirming(false);
              }}
              className="rounded-md border border-fail/70 px-3 py-1.5 font-medium hover:bg-surface"
            >
              Yes, reset progress
            </button>
            <button
              type="button"
              onClick={() => setConfirming(false)}
              className="rounded-md px-3 py-1.5 text-fg-muted hover:bg-surface hover:text-fg"
            >
              Cancel
            </button>
          </div>
        ) : (
          <button
            type="button"
            onClick={() => setConfirming(true)}
            className="rounded-md border border-border-strong px-3 py-1.5 text-sm hover:bg-surface"
          >
            Reset progress
          </button>
        ))}
    </section>
  );
}

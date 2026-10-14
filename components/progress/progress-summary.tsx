"use client";

import { useRef, useState } from "react";
import {
  completedCount,
  exportProgress,
  importProgress,
  MAX_IMPORT_BYTES,
  mergeProgress,
  type Progress,
} from "@/lib/progress/progress";
import { clearProgress, updateProgress, useHydrated, useProgress } from "./progress-store";

function download(progress: Progress) {
  const now = new Date();
  const blob = new Blob([exportProgress(progress, now)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `visual-engineering-progress-${now.toISOString().slice(0, 10)}.json`;
  link.click();
  URL.revokeObjectURL(url);
}

const plural = (n: number, word: string) => `${n} ${word}${n === 1 ? "" : "s"}`;

/** Overall progress with a two-step reset. Explains where the data lives. */
export function ProgressSummary({ lessonIds }: { lessonIds: string[] }) {
  const progress = useProgress();
  const hydrated = useHydrated();
  const [confirming, setConfirming] = useState(false);
  const [status, setStatus] = useState<{ tone: "ok" | "fail"; text: string } | null>(null);
  const fileInput = useRef<HTMLInputElement>(null);
  const done = completedCount(progress, lessonIds);
  const quizzes = lessonIds.filter((id) => progress.lessons[id]?.quiz).length;
  const hasProgress = Object.keys(progress.lessons).length > 0;

  async function onFile(file: File | undefined) {
    if (!file) return;
    const result =
      file.size > MAX_IMPORT_BYTES
        ? ({ ok: false, error: "That file is too large to be a progress export." } as const)
        : importProgress(await file.text());
    if (!result.ok) {
      setStatus({ tone: "fail", text: result.error });
      return;
    }
    updateProgress((current) => mergeProgress(current, result.progress));
    const count = Object.keys(result.progress.lessons).length;
    setStatus({
      tone: "ok",
      text: `Imported progress for ${plural(count, "lesson")}, combined with what was already here.`,
    });
  }

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
        Progress is stored only in this browser — no account, nothing sent anywhere. To use it in
        another browser or keep a backup, export it to a file and import it there; importing adds to
        what is already here and never removes anything.
      </p>
      {hydrated && (
        <div className="flex flex-wrap items-center gap-3 text-sm">
          {hasProgress && (
            <button
              type="button"
              onClick={() => {
                download(progress);
                setStatus(null);
              }}
              className="rounded-md border border-border-strong px-3 py-1.5 hover:bg-surface"
            >
              Export progress
            </button>
          )}
          <button
            type="button"
            onClick={() => fileInput.current?.click()}
            className="rounded-md border border-border-strong px-3 py-1.5 hover:bg-surface"
          >
            Import progress
          </button>
          <input
            ref={fileInput}
            type="file"
            accept="application/json,.json"
            aria-label="Progress file to import"
            className="sr-only"
            tabIndex={-1}
            onChange={(event) => {
              void onFile(event.target.files?.[0]);
              event.target.value = "";
            }}
          />
          <span role="status" className={status?.tone === "fail" ? "text-fail" : "text-fg-muted"}>
            {status?.text}
          </span>
        </div>
      )}
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

"use client";

import { CircleCheck } from "lucide-react";
import { isCompleted } from "@/lib/progress/progress";
import { useProgress } from "./progress-store";

/** Small "Completed" marker for lesson lists. Renders nothing until progress is known. */
export function CompletionBadge({ lessonId }: { lessonId: string }) {
  const progress = useProgress();
  if (!isCompleted(progress, lessonId)) return null;
  return (
    <span className="inline-flex items-center gap-1 text-ok">
      <CircleCheck aria-hidden className="size-3.5" />
      Completed
    </span>
  );
}

import { CalendarCheck, Clock } from "lucide-react";
import Link from "next/link";
import { CompletionBadge } from "@/components/progress/completion-badge";
import type { Difficulty, Lesson } from "@/lib/content/schema";
import { cn } from "@/lib/utils/cn";

const DIFFICULTY_LEVEL: Record<Difficulty, number> = { beginner: 1, intermediate: 2, advanced: 3 };

/** Difficulty shown as text plus a three-bar meter — not color alone. */
export function DifficultyBadge({
  difficulty,
  className,
}: {
  difficulty: Difficulty;
  className?: string;
}) {
  const level = DIFFICULTY_LEVEL[difficulty];
  return (
    <span className={cn("inline-flex items-center gap-1.5 capitalize", className)}>
      <span aria-hidden className="flex items-end gap-[2px]">
        {[1, 2, 3].map((bar) => (
          <span
            key={bar}
            className={cn("w-[3px] rounded-sm", bar <= level ? "bg-fg-muted" : "bg-border-strong")}
            style={{ height: 4 + bar * 3 }}
          />
        ))}
      </span>
      {difficulty}
    </span>
  );
}

export function formatDate(isoDate: string): string {
  return new Date(`${isoDate}T00:00:00Z`).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
    timeZone: "UTC",
  });
}

export function LessonMetaRow({ lesson }: { lesson: Lesson }) {
  return (
    <dl className="flex flex-wrap items-center gap-x-5 gap-y-2 text-sm text-fg-muted">
      <div>
        <dt className="sr-only">Difficulty</dt>
        <dd>
          <DifficultyBadge difficulty={lesson.difficulty} />
        </dd>
      </div>
      <div className="flex items-center gap-1.5">
        <dt className="sr-only">Reading time</dt>
        <Clock aria-hidden className="size-4" />
        <dd>{lesson.readingMinutes} min read</dd>
      </div>
      <div className="flex items-center gap-1.5">
        <dt className="sr-only">Last reviewed</dt>
        <CalendarCheck aria-hidden className="size-4" />
        <dd>
          Reviewed <time dateTime={lesson.lastReviewed}>{formatDate(lesson.lastReviewed)}</time>
        </dd>
      </div>
    </dl>
  );
}

/** Compact lesson row used in domain, explore and related lists. */
export function LessonListItem({ lesson }: { lesson: Lesson }) {
  return (
    <li>
      <Link
        href={`/${lesson.id}`}
        className="group block rounded-lg border border-border px-5 py-4 transition-colors hover:border-border-strong hover:bg-surface"
      >
        <span className="font-medium group-hover:text-accent">{lesson.title}</span>
        <span className="mt-1 block text-sm text-fg-muted">{lesson.description}</span>
        <span className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-fg-subtle">
          <DifficultyBadge difficulty={lesson.difficulty} />
          <span>{lesson.readingMinutes} min read</span>
          <CompletionBadge lessonId={lesson.id} />
        </span>
      </Link>
    </li>
  );
}

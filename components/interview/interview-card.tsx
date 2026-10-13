import type { ReactNode } from "react";
import type { InterviewItem } from "@/lib/content/schema";
import type { InterviewKind, InterviewLevel } from "@/lib/interview/taxonomy";
import { InlineText } from "./inline-text";

export const LEVEL_LABEL: Record<InterviewLevel, string> = {
  junior: "Junior",
  mid: "Mid-level",
  senior: "Senior",
};

export const KIND_LABEL: Record<InterviewKind, string> = {
  concept: "Concept",
  design: "Design",
  debugging: "Debugging",
  "trade-off": "Trade-off",
};

export function InterviewTags({ item }: { item: InterviewItem }) {
  return (
    <span className="flex flex-wrap gap-x-3 gap-y-1 font-mono text-xs text-fg-subtle">
      <span>{LEVEL_LABEL[item.level]}</span>
      <span>{KIND_LABEL[item.kind]}</span>
    </span>
  );
}

/*
 * Markers are CSS-generated (with empty alt text, so screen readers skip them) rather than icon
 * components: the interview page renders every rubric, and hundreds of inline SVGs made its DOM
 * several times larger.
 */
const MARKER = {
  core: "before:text-ok before:content-['✓'_/_'']",
  strong: "before:text-accent before:content-['+'_/_'']",
  redFlags: "before:text-warn before:content-['!'_/_'']",
} as const;

function RubricList({
  title,
  points,
  marker,
}: {
  title: string;
  points: string[];
  marker: keyof typeof MARKER;
}) {
  if (points.length === 0) return null;
  return (
    <div className="space-y-1.5">
      <p className="text-sm font-medium text-fg">{title}</p>
      <ul className="space-y-1">
        {points.map((point) => (
          <li
            key={point}
            className={`relative pl-6 text-sm before:absolute before:left-1 before:font-semibold ${MARKER[marker]}`}
          >
            <InlineText text={point} />
          </li>
        ))}
      </ul>
    </div>
  );
}

/** The published rubric for a question: what good answers cover, strong signals, red flags. */
export function Rubric({ rubric }: { rubric: InterviewItem["rubric"] }) {
  return (
    <div className="space-y-3">
      <RubricList title="Every good answer covers" points={rubric.core} marker="core" />
      <RubricList title="Signs of a strong answer" points={rubric.strong} marker="strong" />
      <RubricList title="Red flags" points={rubric.redFlags} marker="redFlags" />
    </div>
  );
}

/**
 * An interview question, collapsed by default so readers can try first. Opening it shows a model
 * answer and the rubric used to judge answers.
 */
export function InterviewCard({
  item,
  id,
  footer,
}: {
  item: InterviewItem;
  id?: string;
  footer?: ReactNode;
}) {
  return (
    <details
      id={id}
      className="group scroll-mt-20 rounded-lg border border-border bg-surface open:bg-transparent"
    >
      <summary className="cursor-pointer list-none px-5 py-4 marker:hidden [&::-webkit-details-marker]:hidden">
        <span className="flex items-start justify-between gap-4">
          <span className="space-y-1.5">
            <span className="block font-medium">{item.question}</span>
            <InterviewTags item={item} />
          </span>
          <span
            aria-hidden
            className="mt-0.5 shrink-0 font-mono text-xs text-fg-subtle group-open:hidden"
          >
            show answer
          </span>
          <span
            aria-hidden
            className="mt-0.5 hidden shrink-0 font-mono text-xs text-fg-subtle group-open:inline"
          >
            hide
          </span>
        </span>
      </summary>
      <div className="space-y-5 border-t border-border px-5 py-4 text-fg-muted">
        <div className="space-y-1.5">
          <p className="text-sm font-medium text-fg">A model answer</p>
          <p>
            <InlineText text={item.answer} />
          </p>
        </div>
        <Rubric rubric={item.rubric} />
        {footer}
      </div>
    </details>
  );
}

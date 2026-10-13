"use client";

import { ArrowRight, Shuffle } from "lucide-react";
import Link from "next/link";
import { useId, useState } from "react";
import type { InterviewEntry } from "@/lib/content/catalog";
import { ASSESSMENT_RULES, VERDICT_LABEL, assess } from "@/lib/interview/assess";
import { cn } from "@/lib/utils/cn";
import { InlineText } from "./inline-text";
import { InterviewTags } from "./interview-card";

type Group = "core" | "strong" | "redFlags";

const plural = (n: number, word: string) => `${n} ${word}${n === 1 ? "" : "s"}`;

const GROUPS: { key: Group; title: string; hint: string }[] = [
  { key: "core", title: "Every good answer covers", hint: "Tick each point your answer made." },
  { key: "strong", title: "Signs of a strong answer", hint: "Tick any you showed." },
  { key: "redFlags", title: "Red flags", hint: "Tick any your answer contained." },
];

/**
 * One question at a time: answer, then grade yourself against the published rubric. The answer
 * text is kept only in this component's memory — never stored or sent.
 */
export function PracticePanel({
  entry,
  onNext,
  headingRef,
}: {
  entry: InterviewEntry;
  onNext(): void;
  headingRef?: React.Ref<HTMLHeadingElement>;
}) {
  const { item, lesson } = entry;
  const [answer, setAnswer] = useState("");
  const [revealed, setRevealed] = useState(false);
  const [ticked, setTicked] = useState<Record<string, boolean>>({});
  const answerId = useId();
  const tickedIn = (group: Group) =>
    item.rubric[group].filter((_, i) => ticked[`${group}-${i}`]).length;

  const verdict = assess({
    coreTotal: item.rubric.core.length,
    coreCovered: tickedIn("core"),
    strongShown: tickedIn("strong"),
    redFlagsHit: tickedIn("redFlags"),
  });

  return (
    <section
      aria-labelledby="practice-question"
      className="space-y-5 rounded-xl border border-border-strong p-5 sm:p-6"
    >
      <div className="space-y-2">
        <p className="font-mono text-xs text-fg-subtle">Practice · {lesson.domainTitle}</p>
        <h2
          id="practice-question"
          ref={headingRef}
          tabIndex={-1}
          className="text-xl font-semibold text-balance outline-none"
        >
          {item.question}
        </h2>
        <InterviewTags item={item} />
      </div>

      <div className="space-y-1.5">
        <label htmlFor={answerId} className="text-sm font-medium">
          Your answer
        </label>
        <textarea
          id={answerId}
          value={answer}
          onChange={(event) => setAnswer(event.target.value)}
          rows={6}
          placeholder="Write or say your answer before revealing the rubric."
          className="w-full rounded-lg border border-border-strong bg-bg px-3 py-2 text-sm placeholder:text-fg-subtle focus:border-accent"
        />
        <p className="text-xs text-fg-subtle">
          Not saved or sent anywhere — it disappears when you move on.
        </p>
      </div>

      {!revealed ? (
        <div className="flex flex-wrap gap-3">
          <button
            type="button"
            onClick={() => setRevealed(true)}
            className="rounded-md bg-accent px-4 py-2 text-sm font-medium text-accent-fg hover:opacity-90"
          >
            Grade my answer
          </button>
          <button
            type="button"
            onClick={onNext}
            className="inline-flex items-center gap-1.5 rounded-md border border-border-strong px-4 py-2 text-sm hover:bg-surface"
          >
            <Shuffle aria-hidden className="size-4" /> Another question
          </button>
        </div>
      ) : (
        <div className="space-y-6">
          {GROUPS.map(({ key, title, hint }) =>
            item.rubric[key].length === 0 ? null : (
              <fieldset key={key} className="space-y-2">
                <legend className="text-sm font-medium">
                  {title} <span className="font-normal text-fg-subtle">— {hint}</span>
                </legend>
                {item.rubric[key].map((point, index) => {
                  const id = `${key}-${index}`;
                  return (
                    <label key={id} className="flex cursor-pointer items-start gap-3 text-sm">
                      <input
                        type="checkbox"
                        checked={ticked[id] ?? false}
                        onChange={(event) =>
                          setTicked((t) => ({ ...t, [id]: event.target.checked }))
                        }
                        className="mt-1 accent-[var(--accent)]"
                      />
                      <span>
                        <InlineText text={point} />
                      </span>
                    </label>
                  );
                })}
              </fieldset>
            ),
          )}

          <div className="space-y-2 rounded-lg bg-surface p-4">
            <p className="text-sm" aria-live="polite">
              Verdict:{" "}
              <strong
                className={cn(verdict === "strong" || verdict === "solid" ? "text-ok" : "text-fg")}
              >
                {VERDICT_LABEL[verdict]}
              </strong>{" "}
              <span className="text-fg-muted">
                ({tickedIn("core")} of {item.rubric.core.length} core points
                {item.rubric.strong.length > 0 &&
                  `, ${plural(tickedIn("strong"), "strong signal")}`}
                , {plural(tickedIn("redFlags"), "red flag")})
              </span>
            </p>
            <details className="text-sm text-fg-muted">
              <summary className="cursor-pointer">How the verdict is decided</summary>
              <ul className="mt-2 space-y-1">
                {ASSESSMENT_RULES.map(({ verdict: v, rule }) => (
                  <li key={v}>
                    <strong className="text-fg">{VERDICT_LABEL[v]}:</strong> {rule}
                  </li>
                ))}
              </ul>
              <p className="mt-2">The first rule that matches wins.</p>
            </details>
          </div>

          <div className="space-y-1.5">
            <p className="text-sm font-medium">A model answer</p>
            <p className="text-fg-muted">
              <InlineText text={item.answer} />
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-x-5 gap-y-3">
            <button
              type="button"
              onClick={onNext}
              className="inline-flex items-center gap-1.5 rounded-md bg-accent px-4 py-2 text-sm font-medium text-accent-fg hover:opacity-90"
            >
              <Shuffle aria-hidden className="size-4" /> Another question
            </button>
            <Link
              href={`/${lesson.id}`}
              className="inline-flex items-center gap-1.5 text-sm text-accent hover:underline"
            >
              Review the lesson: {lesson.title}
              <ArrowRight aria-hidden className="size-3.5" />
            </Link>
          </div>
        </div>
      )}
    </section>
  );
}

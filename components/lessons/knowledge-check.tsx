"use client";

import { CircleCheck, CircleX, RotateCcw } from "lucide-react";
import { useId, useState } from "react";
import { updateProgress } from "@/components/progress/progress-store";
import { displayOrder, gradeQuiz, type QuizAnswers } from "@/lib/content/quiz";
import type { QuizQuestion } from "@/lib/content/schema";
import { recordQuiz } from "@/lib/progress/progress";
import { cn } from "@/lib/utils/cn";

/**
 * Knowledge check: answer, then see why every option is right or wrong. It is practice, not an
 * exam. With a `lessonId`, a finished attempt's score is saved to progress in this browser only.
 */
export function KnowledgeCheck({
  questions,
  lessonId,
}: {
  questions: QuizQuestion[];
  lessonId?: string;
}) {
  const [selected, setSelected] = useState<QuizAnswers>({});
  const [submitted, setSubmitted] = useState<QuizAnswers>({});
  const result = gradeQuiz(questions, submitted);
  const headingId = useId();

  return (
    <section aria-labelledby={headingId} className="not-prose my-12 space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 id={headingId} className="text-xl font-semibold">
            Check your understanding
          </h2>
          <p className="mt-1 text-sm text-fg-muted">
            Pick an answer, then check it. Every option explains why it is right or wrong.
          </p>
        </div>
        <p aria-live="polite" className="font-mono text-sm text-fg-muted">
          {result.answered === 0
            ? `${questions.length} questions`
            : `${result.correct} of ${result.total} correct`}
        </p>
      </div>

      <ol className="space-y-5">
        {questions.map((question, index) => (
          <li key={question.id}>
            <Question
              number={index + 1}
              question={question}
              selected={selected[question.id]}
              submitted={submitted[question.id]}
              onSelect={(option) => setSelected((s) => ({ ...s, [question.id]: option }))}
              onSubmit={() => {
                const next = { ...submitted, [question.id]: selected[question.id] };
                setSubmitted(next);
                const attempt = gradeQuiz(questions, next);
                if (lessonId && attempt.answered === attempt.total) {
                  updateProgress((p) =>
                    recordQuiz(p, lessonId, attempt.correct, attempt.total, new Date()),
                  );
                }
              }}
              onReset={() => {
                setSubmitted((s) => ({ ...s, [question.id]: undefined }));
                setSelected((s) => ({ ...s, [question.id]: undefined }));
              }}
            />
          </li>
        ))}
      </ol>

      {result.answered > 0 && (
        <button
          type="button"
          onClick={() => {
            setSelected({});
            setSubmitted({});
          }}
          className="inline-flex items-center gap-1.5 rounded-md border border-border-strong px-3 py-1.5 text-sm hover:bg-surface"
        >
          <RotateCcw aria-hidden className="size-3.5" /> Start over
        </button>
      )}
    </section>
  );
}

function Question({
  number,
  question,
  selected,
  submitted,
  onSelect,
  onSubmit,
  onReset,
}: {
  number: number;
  question: QuizQuestion;
  selected?: string;
  submitted?: string;
  onSelect(option: string): void;
  onSubmit(): void;
  onReset(): void;
}) {
  const name = useId();
  const done = submitted !== undefined;
  const correct = done && question.options.find((o) => o.id === submitted)?.correct === true;

  return (
    <fieldset className="rounded-xl border border-border p-5">
      <legend className="sr-only">
        Question {number}: {question.prompt}
      </legend>
      <p aria-hidden className="font-medium">
        <span className="mr-2 font-mono text-sm text-fg-subtle">{number}.</span>
        {question.prompt}
      </p>

      <div className="mt-4 space-y-2">
        {displayOrder(question.id, question.options).map((option) => {
          const isChosen = submitted === option.id;
          return (
            <div
              key={option.id}
              className={cn(
                "rounded-lg border px-3 py-2.5",
                !done && "border-border has-[:checked]:border-accent has-[:checked]:bg-accent-soft",
                done && option.correct && "border-ok/70",
                done && isChosen && !option.correct && "border-fail/70",
                done && !option.correct && !isChosen && "border-border",
              )}
            >
              <label className={cn("flex items-start gap-3 text-sm", !done && "cursor-pointer")}>
                <input
                  type="radio"
                  name={name}
                  value={option.id}
                  checked={(done ? submitted : selected) === option.id}
                  disabled={done}
                  onChange={() => onSelect(option.id)}
                  className="mt-1 accent-[var(--accent)]"
                />
                <span className="flex-1">
                  {option.text}
                  {done && option.correct && (
                    <span className="ml-2 inline-flex items-center gap-1 text-xs text-ok">
                      <CircleCheck aria-hidden className="size-3.5" /> correct answer
                    </span>
                  )}
                  {done && isChosen && !option.correct && (
                    <span className="ml-2 inline-flex items-center gap-1 text-xs text-fail">
                      <CircleX aria-hidden className="size-3.5" /> your answer
                    </span>
                  )}
                </span>
              </label>
              {done && <p className="mt-1.5 ml-7 text-sm text-fg-muted">{option.explanation}</p>}
            </div>
          );
        })}
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-3">
        {done ? (
          <>
            <p
              role="status"
              className={cn(
                "inline-flex items-center gap-1.5 text-sm font-medium",
                correct ? "text-ok" : "text-fail",
              )}
            >
              {correct ? (
                <CircleCheck aria-hidden className="size-4" />
              ) : (
                <CircleX aria-hidden className="size-4" />
              )}
              {correct ? "Correct." : "Not quite — see the explanations above."}
            </p>
            <button
              type="button"
              onClick={onReset}
              className="text-sm text-accent underline underline-offset-2"
            >
              Try again
            </button>
          </>
        ) : (
          <button
            type="button"
            onClick={onSubmit}
            disabled={selected === undefined}
            className="rounded-md bg-accent px-3.5 py-1.5 text-sm font-medium text-accent-fg hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-40"
          >
            Check answer
          </button>
        )}
      </div>
    </fieldset>
  );
}

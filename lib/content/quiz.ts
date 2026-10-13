import { createRng } from "../simulation/rng";
import type { QuizQuestion } from "./schema";

export type QuizAnswers = Record<string, string | undefined>;

export type QuizResult = {
  correct: number;
  answered: number;
  total: number;
  /** Per question: undefined when unanswered. */
  byQuestion: Record<string, boolean | undefined>;
};

export function gradeQuiz(questions: QuizQuestion[], answers: QuizAnswers): QuizResult {
  const byQuestion: QuizResult["byQuestion"] = {};
  let correct = 0;
  let answered = 0;
  for (const question of questions) {
    const chosen = answers[question.id];
    if (chosen === undefined) {
      byQuestion[question.id] = undefined;
      continue;
    }
    answered += 1;
    const ok = question.options.find((o) => o.id === chosen)?.correct === true;
    byQuestion[question.id] = ok;
    if (ok) correct += 1;
  }
  return { correct, answered, total: questions.length, byQuestion };
}

/** FNV-1a string hash, used to seed a stable per-question shuffle. */
function hash(text: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < text.length; i++) {
    h ^= text.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return h >>> 0;
}

/**
 * Options in a stable shuffled order, so the correct answer's position doesn't form a pattern
 * learners can spot. Deterministic per question, so server and client render the same order.
 */
export function displayOrder<T>(questionId: string, options: readonly T[]): T[] {
  const rng = createRng(hash(questionId));
  const out = [...options];
  for (let i = out.length - 1; i > 0; i--) {
    const j = rng.int(0, i);
    [out[i], out[j]] = [out[j]!, out[i]!];
  }
  return out;
}

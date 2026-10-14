/**
 * Learning progress, kept only in the visitor's own browser. Pure functions over a small,
 * versioned record; `components/progress/progress-store.ts` handles storage and subscriptions.
 *
 * Nothing here identifies a person, and nothing is ever sent anywhere.
 */

export const PROGRESS_STORAGE_KEY = "ve:progress";
export const PROGRESS_VERSION = 1;

export type QuizRecord = { best: number; last: number; total: number; at: string };
export type LessonProgress = { completedAt?: string; quiz?: QuizRecord };
export type Progress = {
  version: typeof PROGRESS_VERSION;
  lessons: Record<string, LessonProgress>;
};

export const EMPTY_PROGRESS: Progress = Object.freeze({
  version: PROGRESS_VERSION,
  lessons: Object.freeze({}) as Record<string, LessonProgress>,
});

const LESSON_ID = /^[a-z0-9-]+\/[a-z0-9-]+$/;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isIsoDate(value: unknown): value is string {
  return typeof value === "string" && value.length <= 40 && !Number.isNaN(Date.parse(value));
}

function isCount(value: unknown): value is number {
  return typeof value === "number" && Number.isInteger(value) && value >= 0 && value <= 100;
}

/**
 * Accepts anything (stored data may be corrupt, edited by hand or from a future version) and
 * returns valid progress, keeping only well-formed entries.
 */
export function parseProgress(raw: unknown): Progress {
  if (!isRecord(raw) || raw.version !== PROGRESS_VERSION || !isRecord(raw.lessons)) {
    return EMPTY_PROGRESS;
  }
  const lessons: Record<string, LessonProgress> = {};
  for (const [id, value] of Object.entries(raw.lessons)) {
    if (!LESSON_ID.test(id) || !isRecord(value)) continue;
    const entry: LessonProgress = {};
    if (isIsoDate(value.completedAt)) entry.completedAt = value.completedAt;
    const quiz = value.quiz;
    if (
      isRecord(quiz) &&
      isCount(quiz.best) &&
      isCount(quiz.last) &&
      isCount(quiz.total) &&
      quiz.total > 0 &&
      quiz.best <= quiz.total &&
      quiz.last <= quiz.total &&
      isIsoDate(quiz.at)
    ) {
      entry.quiz = { best: quiz.best, last: quiz.last, total: quiz.total, at: quiz.at };
    }
    if (entry.completedAt || entry.quiz) lessons[id] = entry;
  }
  return { version: PROGRESS_VERSION, lessons };
}

function withLesson(progress: Progress, id: string, entry: LessonProgress): Progress {
  const lessons = { ...progress.lessons };
  if (entry.completedAt || entry.quiz) lessons[id] = entry;
  else delete lessons[id];
  return { version: PROGRESS_VERSION, lessons };
}

export function isCompleted(progress: Progress, id: string): boolean {
  return progress.lessons[id]?.completedAt !== undefined;
}

export function setCompleted(
  progress: Progress,
  id: string,
  completed: boolean,
  now: Date,
): Progress {
  if (completed === isCompleted(progress, id)) return progress;
  const { completedAt: _previous, ...rest } = progress.lessons[id] ?? {};
  return withLesson(progress, id, completed ? { ...rest, completedAt: now.toISOString() } : rest);
}

/** Records a finished knowledge check, keeping the best score alongside the latest one. */
export function recordQuiz(
  progress: Progress,
  id: string,
  correct: number,
  total: number,
  now: Date,
): Progress {
  const current = progress.lessons[id] ?? {};
  // A changed quiz (different question count) makes an old best score meaningless.
  const previousBest = current.quiz?.total === total ? current.quiz.best : 0;
  return withLesson(progress, id, {
    ...current,
    quiz: { best: Math.max(previousBest, correct), last: correct, total, at: now.toISOString() },
  });
}

export function completedCount(progress: Progress, ids: readonly string[]): number {
  return ids.filter((id) => isCompleted(progress, id)).length;
}

/** The first lesson not yet completed, or undefined when all are done. */
export function nextIncomplete<T extends string>(
  progress: Progress,
  ids: readonly T[],
): T | undefined {
  return ids.find((id) => !isCompleted(progress, id));
}

/** Largest progress file accepted on import: far more than every lesson could need. */
export const MAX_IMPORT_BYTES = 256 * 1024;

/** A portable copy of progress, for moving it to another browser or keeping a backup. */
export function exportProgress(progress: Progress, now: Date): string {
  return `${JSON.stringify(
    { version: PROGRESS_VERSION, exportedAt: now.toISOString(), lessons: progress.lessons },
    null,
    2,
  )}\n`;
}

export type ImportResult = { ok: true; progress: Progress } | { ok: false; error: string };

/** Reads an exported file, keeping only well-formed entries (see parseProgress). */
export function importProgress(text: string): ImportResult {
  if (text.length > MAX_IMPORT_BYTES) {
    return { ok: false, error: "That file is too large to be a progress export." };
  }
  let raw: unknown;
  try {
    raw = JSON.parse(text);
  } catch {
    return { ok: false, error: "That file isn't valid JSON." };
  }
  if (!isRecord(raw) || !isRecord(raw.lessons)) {
    return { ok: false, error: "That file isn't a Visual Engineering progress export." };
  }
  if (raw.version !== PROGRESS_VERSION) {
    return {
      ok: false,
      error: "That export comes from a version of the site this one can't read.",
    };
  }
  const progress = parseProgress(raw);
  if (Object.keys(progress.lessons).length === 0) {
    return { ok: false, error: "That file doesn't contain any lesson progress." };
  }
  return { ok: true, progress };
}

function mergeQuiz(a: QuizRecord | undefined, b: QuizRecord | undefined): QuizRecord | undefined {
  if (!a || !b) return a ?? b;
  const [older, newer] = Date.parse(a.at) <= Date.parse(b.at) ? [a, b] : [b, a];
  // A best score only carries over when both attempts were at the same version of the quiz.
  const best = older.total === newer.total ? Math.max(older.best, newer.best) : newer.best;
  return { ...newer, best };
}

/**
 * Combines two progress records without losing anything: a lesson completed in either is
 * completed (at the earlier time), and quiz results keep the latest attempt and the best score.
 */
export function mergeProgress(a: Progress, b: Progress): Progress {
  const lessons: Record<string, LessonProgress> = { ...a.lessons };
  for (const [id, incoming] of Object.entries(b.lessons)) {
    const current = lessons[id];
    if (!current) {
      lessons[id] = incoming;
      continue;
    }
    const dates = [current.completedAt, incoming.completedAt].filter(
      (d): d is string => d !== undefined,
    );
    const completedAt = dates.sort((x, y) => Date.parse(x) - Date.parse(y))[0];
    const quiz = mergeQuiz(current.quiz, incoming.quiz);
    lessons[id] = { ...(completedAt && { completedAt }), ...(quiz && { quiz }) };
  }
  return { version: PROGRESS_VERSION, lessons };
}

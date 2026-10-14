import { describe, expect, it } from "vitest";
import {
  EMPTY_PROGRESS,
  MAX_IMPORT_BYTES,
  completedCount,
  exportProgress,
  importProgress,
  mergeProgress,
  isCompleted,
  nextIncomplete,
  parseProgress,
  recordQuiz,
  setCompleted,
} from "@/lib/progress/progress";

const now = new Date("2026-10-13T09:00:00Z");
const later = new Date("2026-10-14T09:00:00Z");
const LB = "system-design/load-balancing";
const CACHE = "system-design/caching";

describe("parseProgress", () => {
  it("returns empty progress for missing, corrupt or future-version data", () => {
    for (const raw of [null, undefined, "x", 42, [], {}, { version: 2, lessons: {} }]) {
      expect(parseProgress(raw)).toEqual(EMPTY_PROGRESS);
    }
  });

  it("keeps well-formed entries and drops malformed ones", () => {
    const parsed = parseProgress({
      version: 1,
      lessons: {
        [LB]: { completedAt: now.toISOString() },
        [CACHE]: { quiz: { best: 4, last: 3, total: 5, at: now.toISOString() } },
        "not a lesson id": { completedAt: now.toISOString() },
        "ai/embeddings": { completedAt: "yesterday-ish" },
        "ai/tokenization": { quiz: { best: 9, last: 1, total: 5, at: now.toISOString() } },
        "ai/how-rag-works": "done",
      },
    });
    expect(parsed.lessons).toEqual({
      [LB]: { completedAt: now.toISOString() },
      [CACHE]: { quiz: { best: 4, last: 3, total: 5, at: now.toISOString() } },
    });
  });
});

describe("completion", () => {
  it("marks and unmarks a lesson without mutating the input", () => {
    const done = setCompleted(EMPTY_PROGRESS, LB, true, now);
    expect(isCompleted(done, LB)).toBe(true);
    expect(isCompleted(EMPTY_PROGRESS, LB)).toBe(false);

    const undone = setCompleted(done, LB, false, later);
    expect(isCompleted(undone, LB)).toBe(false);
    expect(undone.lessons).toEqual({});
  });

  it("returns the same object when nothing changes", () => {
    const done = setCompleted(EMPTY_PROGRESS, LB, true, now);
    expect(setCompleted(done, LB, true, later)).toBe(done);
  });

  it("keeps the quiz record when a lesson is unmarked", () => {
    const p = setCompleted(recordQuiz(EMPTY_PROGRESS, LB, 3, 5, now), LB, true, now);
    expect(setCompleted(p, LB, false, later).lessons[LB]).toEqual({
      quiz: { best: 3, last: 3, total: 5, at: now.toISOString() },
    });
  });

  it("counts completed lessons and finds the next incomplete one", () => {
    const p = setCompleted(EMPTY_PROGRESS, LB, true, now);
    expect(completedCount(p, [LB, CACHE])).toBe(1);
    expect(nextIncomplete(p, [LB, CACHE])).toBe(CACHE);
    expect(nextIncomplete(setCompleted(p, CACHE, true, now), [LB, CACHE])).toBeUndefined();
  });
});

describe("recordQuiz", () => {
  it("keeps the best score and the latest score", () => {
    const first = recordQuiz(EMPTY_PROGRESS, LB, 4, 5, now);
    const second = recordQuiz(first, LB, 2, 5, later);
    expect(second.lessons[LB]?.quiz).toEqual({
      best: 4,
      last: 2,
      total: 5,
      at: later.toISOString(),
    });
  });

  it("resets the best score when the quiz length changes", () => {
    const old = recordQuiz(EMPTY_PROGRESS, LB, 5, 5, now);
    expect(recordQuiz(old, LB, 2, 6, later).lessons[LB]?.quiz?.best).toBe(2);
  });

  it("round-trips through JSON and parseProgress", () => {
    const p = setCompleted(recordQuiz(EMPTY_PROGRESS, LB, 4, 5, now), CACHE, true, now);
    expect(parseProgress(JSON.parse(JSON.stringify(p)))).toEqual(p);
  });
});

describe("export and import", () => {
  const progress = recordQuiz(setCompleted(EMPTY_PROGRESS, LB, true, now), CACHE, 3, 5, now);

  it("round-trips an export", () => {
    const result = importProgress(exportProgress(progress, later));
    expect(result).toEqual({ ok: true, progress });
  });

  it("records when the export was made", () => {
    expect(JSON.parse(exportProgress(progress, later))).toMatchObject({
      version: 1,
      exportedAt: later.toISOString(),
    });
  });

  it("explains why a file can't be imported", () => {
    const error = (text: string) => {
      const result = importProgress(text);
      return result.ok ? undefined : result.error;
    };
    expect(error("{not json")).toMatch(/valid JSON/);
    expect(error("[1, 2]")).toMatch(/isn't a Visual Engineering progress export/);
    expect(error(JSON.stringify({ version: 2, lessons: {} }))).toMatch(/version/);
    expect(error(JSON.stringify({ version: 1, lessons: { "bad id": {} } }))).toMatch(
      /doesn't contain any lesson progress/,
    );
    expect(error(" ".repeat(MAX_IMPORT_BYTES + 1))).toMatch(/too large/);
  });

  it("drops malformed entries but keeps the rest", () => {
    const text = JSON.stringify({
      version: 1,
      lessons: { [LB]: { completedAt: now.toISOString() }, [CACHE]: { quiz: "great" } },
    });
    expect(importProgress(text)).toEqual({
      ok: true,
      progress: { version: 1, lessons: { [LB]: { completedAt: now.toISOString() } } },
    });
  });
});

describe("mergeProgress", () => {
  it("keeps lessons from both sides", () => {
    const a = setCompleted(EMPTY_PROGRESS, LB, true, now);
    const b = setCompleted(EMPTY_PROGRESS, CACHE, true, later);
    expect(completedCount(mergeProgress(a, b), [LB, CACHE])).toBe(2);
  });

  it("keeps the earlier completion date", () => {
    const a = setCompleted(EMPTY_PROGRESS, LB, true, later);
    const b = setCompleted(EMPTY_PROGRESS, LB, true, now);
    expect(mergeProgress(a, b).lessons[LB]?.completedAt).toBe(now.toISOString());
    expect(mergeProgress(b, a).lessons[LB]?.completedAt).toBe(now.toISOString());
  });

  it("keeps the latest quiz attempt and the best score", () => {
    const a = recordQuiz(EMPTY_PROGRESS, CACHE, 5, 5, now);
    const b = recordQuiz(EMPTY_PROGRESS, CACHE, 2, 5, later);
    const quiz = mergeProgress(a, b).lessons[CACHE]?.quiz;
    expect(quiz).toEqual({ best: 5, last: 2, total: 5, at: later.toISOString() });
    expect(mergeProgress(b, a).lessons[CACHE]?.quiz).toEqual(quiz);
  });

  it("drops a best score from a quiz with a different number of questions", () => {
    const a = recordQuiz(EMPTY_PROGRESS, CACHE, 4, 4, now);
    const b = recordQuiz(EMPTY_PROGRESS, CACHE, 2, 5, later);
    expect(mergeProgress(a, b).lessons[CACHE]?.quiz?.best).toBe(2);
  });

  it("combines a completion from one side with a quiz from the other", () => {
    const a = setCompleted(EMPTY_PROGRESS, LB, true, now);
    const b = recordQuiz(EMPTY_PROGRESS, LB, 3, 5, later);
    expect(mergeProgress(a, b).lessons[LB]).toEqual({
      completedAt: now.toISOString(),
      quiz: { best: 3, last: 3, total: 5, at: later.toISOString() },
    });
  });
});

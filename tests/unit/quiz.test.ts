import { describe, expect, it } from "vitest";
import { loadCatalog } from "@/lib/content/load";
import { displayOrder, gradeQuiz } from "@/lib/content/quiz";
import { quizSchema, type QuizQuestion } from "@/lib/content/schema";

const q = (id: string, correct: string): QuizQuestion =>
  quizSchema.parse([
    {
      id,
      prompt: "A question long enough to pass validation?",
      options: ["a", "b", "c"].map((o) => ({
        id: o,
        text: o,
        correct: o === correct,
        explanation: "An explanation of this option.",
      })),
    },
    {
      id: `${id}-2`,
      prompt: "Another question for the minimum count?",
      options: [
        { id: "a", text: "a", correct: true, explanation: "An explanation of this option." },
        { id: "b", text: "b", explanation: "An explanation of this option." },
      ],
    },
    {
      id: `${id}-3`,
      prompt: "A third question for the minimum count?",
      options: [
        { id: "a", text: "a", correct: true, explanation: "An explanation of this option." },
        { id: "b", text: "b", explanation: "An explanation of this option." },
      ],
    },
  ])[0]!;

describe("quiz schema", () => {
  it("rejects questions without exactly one correct option", () => {
    const base = { prompt: "Which is right here?", id: "x" };
    const opt = (id: string, correct = false) => ({
      id,
      text: id,
      correct,
      explanation: "Some explanation text.",
    });
    expect(quizSchema.safeParse([{ ...base, options: [opt("a"), opt("b")] }]).success).toBe(false);
    expect(
      quizSchema.safeParse([{ ...base, options: [opt("a", true), opt("b", true)] }]).success,
    ).toBe(false);
  });
});

describe("gradeQuiz", () => {
  const questions = [q("one", "b"), q("two", "a")];
  it("counts correct and answered questions", () => {
    expect(gradeQuiz(questions, { one: "b", two: "c" })).toEqual({
      correct: 1,
      answered: 2,
      total: 2,
      byQuestion: { one: true, two: false },
    });
  });
  it("leaves unanswered questions undefined", () => {
    expect(gradeQuiz(questions, {}).byQuestion).toEqual({ one: undefined, two: undefined });
  });
});

describe("displayOrder", () => {
  it("is a stable permutation of the options", () => {
    const options = ["a", "b", "c", "d"];
    const first = displayOrder("some-question", options);
    expect(displayOrder("some-question", options)).toEqual(first);
    expect([...first].sort()).toEqual(options);
  });
});

describe("published quizzes", async () => {
  const { lessons } = await loadCatalog();
  const published = lessons.filter((l) => l.status === "published");

  it("every published lesson has a knowledge check", () => {
    for (const lesson of published) expect(lesson.quiz.length, lesson.id).toBeGreaterThanOrEqual(3);
  });

  it("correct answers don't sit in one display position", () => {
    const positions = published.flatMap((l) =>
      l.quiz.map((question) =>
        displayOrder(question.id, question.options).findIndex((o) => o.correct),
      ),
    );
    const counts = new Map<number, number>();
    for (const p of positions) counts.set(p, (counts.get(p) ?? 0) + 1);
    // No single position should hold more than half of all correct answers.
    expect(Math.max(...counts.values())).toBeLessThanOrEqual(positions.length / 2);
  });
});

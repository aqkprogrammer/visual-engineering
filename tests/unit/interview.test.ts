import { describe, expect, it } from "vitest";
import { INTERVIEW_HEADING_ID } from "@/lib/content/headings";
import { loadCatalog } from "@/lib/content/load";
import { interviewItemSchema } from "@/lib/content/schema";
import { ASSESSMENT_RULES, assess } from "@/lib/interview/assess";
import { INTERVIEW_KINDS, INTERVIEW_LEVELS } from "@/lib/interview/taxonomy";

describe("assess", () => {
  const base = { coreTotal: 4, coreCovered: 0, strongShown: 0, redFlagsHit: 0 };

  it("applies the published rules in order", () => {
    expect(assess({ ...base, coreCovered: 4, strongShown: 1 })).toBe("strong");
    expect(assess({ ...base, coreCovered: 4 })).toBe("solid");
    expect(assess({ ...base, coreCovered: 2 })).toBe("partial");
    expect(assess({ ...base, coreCovered: 1 })).toBe("not-yet");
    expect(assess({ ...base, coreCovered: 0 })).toBe("not-yet");
  });

  it("never rates an answer with a red flag above partial", () => {
    expect(assess({ ...base, coreCovered: 4, strongShown: 2, redFlagsHit: 1 })).toBe("partial");
  });

  it("treats exactly half of the core points as partial (odd totals round up)", () => {
    expect(assess({ ...base, coreTotal: 3, coreCovered: 1 })).toBe("not-yet");
    expect(assess({ ...base, coreTotal: 3, coreCovered: 2 })).toBe("partial");
  });

  it("documents every verdict", () => {
    expect(ASSESSMENT_RULES.map((r) => r.verdict)).toEqual([
      "strong",
      "solid",
      "partial",
      "not-yet",
    ]);
  });
});

describe("interview item schema", () => {
  const valid = {
    id: "fixture",
    question: "Why does this fixture exist?",
    level: "junior",
    kind: "concept",
    answer: "Because tests need a known, fixed setup, and this one is long enough for the schema.",
    rubric: {
      core: ["Explains what a fixture is", "Says why it helps"],
      redFlags: ["Says tests need none"],
    },
  };

  it("accepts a valid item and defaults strong signals to none", () => {
    expect(interviewItemSchema.parse(valid).rubric.strong).toEqual([]);
  });

  it("rejects unbalanced code spans and missing red flags", () => {
    expect(
      interviewItemSchema.safeParse({ ...valid, answer: `${valid.answer} \`oops` }).success,
    ).toBe(false);
    expect(
      interviewItemSchema.safeParse({ ...valid, rubric: { ...valid.rubric, redFlags: [] } })
        .success,
    ).toBe(false);
  });
});

describe("interview questions on disk", async () => {
  const catalog = await loadCatalog();
  const published = catalog.lessons.filter((l) => l.status === "published");
  const items = published.flatMap((l) => l.interview);

  it("gives every published lesson at least three questions", () => {
    for (const lesson of published)
      expect(lesson.interview.length, lesson.id).toBeGreaterThanOrEqual(3);
  });

  it("uses globally unique ids, which become anchors on the interview page", () => {
    const ids = items.map((i) => i.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("covers every level and kind", () => {
    expect(new Set(items.map((i) => i.level))).toEqual(new Set(INTERVIEW_LEVELS));
    expect(new Set(items.map((i) => i.kind))).toEqual(new Set(INTERVIEW_KINDS));
  });

  it("lists the interview section in each lesson's table of contents, last", () => {
    for (const lesson of published) {
      expect(lesson.headings.at(-1), lesson.id).toEqual({
        depth: 2,
        text: "Interview questions",
        id: INTERVIEW_HEADING_ID,
      });
      expect(
        lesson.headings.filter((h) => h.id === INTERVIEW_HEADING_ID),
        lesson.id,
      ).toHaveLength(1);
    }
  });
});

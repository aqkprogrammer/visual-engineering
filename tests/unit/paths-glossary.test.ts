import { describe, expect, it } from "vitest";
import {
  glossaryTermSchema,
  learningPathSchema,
  type GlossaryTerm,
  type LearningPath,
} from "@/lib/content/schema";
import { validateGlossary, validateLearningPaths } from "@/lib/content/validate";
import { makeLesson } from "../support/fixtures";

const messages = (issues: { message: string }[]) => issues.map((i) => i.message);

const a = makeLesson({ slug: "a" });
const b = makeLesson({ slug: "b", prerequisites: ["system-design/a"] });
const draft = makeLesson({ slug: "draft", status: "draft" });
const lessons = [a, b, draft];

function makePath(steps: string[], overrides: Partial<LearningPath> = {}): LearningPath {
  return learningPathSchema.parse({
    slug: "fixture-path",
    title: "A fixture path",
    summary:
      "A fixture learning path summary that is long enough to pass the seventy character minimum.",
    audience: "People who write tests for learning paths.",
    outcomes: ["Validate a learning path", "Find an ordering mistake"],
    steps: steps.map((lesson) => ({ lesson, why: "Because this fixture needs a reason." })),
    ...overrides,
  });
}

function makeTerm(overrides: Partial<GlossaryTerm> = {}): GlossaryTerm {
  return glossaryTermSchema.parse({
    id: "fixture",
    term: "Fixture",
    definition: "A known, fixed setup used so that tests are repeatable and easy to read.",
    lesson: "system-design/a",
    ...overrides,
  });
}

describe("validateLearningPaths", () => {
  it("accepts published lessons in prerequisite order", () => {
    expect(
      validateLearningPaths([makePath(["system-design/a", "system-design/b"])], lessons),
    ).toEqual([]);
  });

  it("requires prerequisites to come earlier in the path", () => {
    const issues = validateLearningPaths(
      [makePath(["system-design/b", "system-design/a"])],
      lessons,
    );
    expect(messages(issues)).toEqual([
      'step 1: "system-design/b" needs "system-design/a" earlier in the path',
    ]);
  });

  it("flags missing, draft and repeated lessons", () => {
    const issues = validateLearningPaths(
      [
        makePath([
          "system-design/a",
          "system-design/missing",
          "system-design/draft",
          "system-design/a",
        ]),
      ],
      lessons,
    );
    expect(messages(issues)).toEqual([
      'step 2: lesson "system-design/missing" does not exist',
      'step 3: lesson "system-design/draft" is not published',
      'lists "system-design/a" more than once',
    ]);
  });

  it("flags duplicate path slugs", () => {
    const path = makePath(["system-design/a", "system-design/b"]);
    expect(messages(validateLearningPaths([path, path], lessons))).toEqual(["duplicate path slug"]);
  });
});

describe("validateGlossary", () => {
  it("accepts a consistent glossary", () => {
    const terms = [
      makeTerm({ related: ["other"] }),
      makeTerm({ id: "other", term: "Other", related: ["fixture"] }),
    ];
    expect(validateGlossary(terms, lessons)).toEqual([]);
  });

  it("flags duplicate ids and names, including aliases, case-insensitively", () => {
    const issues = validateGlossary(
      [makeTerm(), makeTerm(), makeTerm({ id: "another", term: "Another", aliases: ["FIXTURE"] })],
      lessons,
    );
    expect(messages(issues)).toEqual([
      "duplicate glossary id",
      '"FIXTURE" is already used by "fixture"',
    ]);
  });

  it("flags unpublished lessons and unknown or self references", () => {
    const issues = validateGlossary(
      [makeTerm({ lesson: "system-design/draft", related: ["fixture", "nope"] })],
      lessons,
    );
    expect(messages(issues)).toEqual([
      'lesson "system-design/draft" is not a published lesson',
      "lists itself as related",
      'related term "nope" does not exist',
    ]);
  });
});

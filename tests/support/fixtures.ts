import {
  domainSchema,
  lessonMetaSchema,
  type Domain,
  type LessonMeta,
  type LessonMetaInput,
} from "@/lib/content/schema";

export function makeDomain(overrides: Partial<Domain> = {}): Domain {
  return domainSchema.parse({
    id: "system-design",
    title: "System Design",
    tagline: "How large systems stay fast and correct.",
    description:
      "A fixture domain used by the tests. It needs a description long enough to satisfy the schema rules.",
    intro: ["A fixture paragraph that is comfortably longer than the forty character minimum."],
    modules: [
      { id: "traffic", title: "Traffic", summary: "Fixture module about traffic handling." },
      { id: "data", title: "Data", summary: "Fixture module about data at scale." },
    ],
    ...overrides,
  });
}

export function makeLesson(overrides: Partial<LessonMetaInput> = {}): LessonMeta {
  return lessonMetaSchema.parse({
    slug: "load-balancing",
    domain: "system-design",
    module: "traffic",
    title: "How load balancing works",
    description:
      "A fixture lesson description that is long enough to satisfy the seventy character minimum.",
    difficulty: "beginner",
    tags: ["load-balancing"],
    references: [
      { title: "Ref A", url: "https://example.org/a", publisher: "Example", kind: "official-docs" },
      { title: "Ref B", url: "https://example.org/b", publisher: "Example", kind: "article" },
    ],
    lastReviewed: "2026-10-12",
    status: "published",
    ...overrides,
  });
}

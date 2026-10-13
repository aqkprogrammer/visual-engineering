import { z } from "zod";
import { INTERVIEW_KINDS, INTERVIEW_LEVELS } from "@/lib/interview/taxonomy";

/** kebab-case: lowercase letters/digits separated by single hyphens. */
export const slugSchema = z
  .string()
  .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, "must be kebab-case (e.g. load-balancing)");

export const DOMAIN_IDS = [
  "system-design",
  "software-architecture",
  "ai",
  "containers",
  "cloud",
  "networking",
  "computer-science",
] as const;
export const domainIdSchema = z.enum(DOMAIN_IDS);
export type DomainId = z.infer<typeof domainIdSchema>;

export const DIFFICULTIES = ["beginner", "intermediate", "advanced"] as const;
export const difficultySchema = z.enum(DIFFICULTIES);
export type Difficulty = z.infer<typeof difficultySchema>;

export const moduleSchema = z.object({
  id: slugSchema,
  title: z.string().min(3).max(60),
  summary: z.string().min(20).max(240),
  /** Curriculum topics planned for this module. Shown honestly as "planned" until a lesson exists. */
  plannedTopics: z.array(z.string().min(2)).default([]),
});
export type Module = z.infer<typeof moduleSchema>;

export const domainSchema = z.object({
  id: domainIdSchema,
  title: z.string().min(3).max(40),
  tagline: z.string().min(10).max(120),
  /** Meta description for the domain landing page. */
  description: z.string().min(70).max(170),
  /** Introductory prose paragraphs for the landing page. */
  intro: z.array(z.string().min(40)).min(1),
  modules: z.array(moduleSchema).min(1),
});
export type Domain = z.infer<typeof domainSchema>;

/** `<domain>/<slug>` — the stable identity of a lesson, matching its URL path. */
export const lessonRefSchema = z
  .string()
  .regex(/^[a-z0-9-]+\/[a-z0-9]+(?:-[a-z0-9]+)*$/, "must look like <domain>/<lesson-slug>");
export type LessonRef = z.infer<typeof lessonRefSchema>;

export const referenceSchema = z.object({
  title: z.string().min(3),
  url: z.url({ protocol: /^https$/, error: "references must use https" }),
  publisher: z.string().min(2),
  kind: z.enum(["official-docs", "specification", "paper", "book", "article"]),
});
export type Reference = z.infer<typeof referenceSchema>;

export const lessonMetaSchema = z.object({
  slug: slugSchema,
  domain: domainIdSchema,
  module: slugSchema,
  title: z.string().min(5).max(70),
  /** One sentence. Doubles as the meta description, so keep it search-snippet sized. */
  description: z.string().min(70).max(170),
  difficulty: difficultySchema,
  /** Ordering within the module; lower comes first. */
  order: z.number().int().min(0).default(100),
  prerequisites: z.array(lessonRefSchema).default([]),
  related: z.array(lessonRefSchema).default([]),
  tags: z.array(slugSchema).min(1).max(8),
  /** Cloud-provider specific content is labelled in the UI. */
  provider: z.enum(["aws", "gcp", "azure"]).optional(),
  references: z.array(referenceSchema).min(2, "cite at least two authoritative references"),
  lastReviewed: z.iso.date(),
  status: z.enum(["draft", "published"]),
});
export type LessonMetaInput = z.input<typeof lessonMetaSchema>;
export type LessonMeta = z.output<typeof lessonMetaSchema>;

export const headingSchema = z.object({
  depth: z.union([z.literal(2), z.literal(3)]),
  text: z.string(),
  id: z.string(),
});
export type Heading = z.infer<typeof headingSchema>;

/** A lesson after build-time processing (reading time + headings derived from the MDX body). */
export type Lesson = LessonMeta & {
  id: LessonRef;
  quiz: QuizQuestion[];
  interview: InterviewItem[];
  readingMinutes: number;
  wordCount: number;
  headings: Heading[];
};

export const playgroundDemoSchema = z.object({
  slug: slugSchema,
  title: z.string().min(5).max(70),
  /** One sentence; doubles as the meta description. */
  summary: z.string().min(70).max(170),
  domain: domainIdSchema,
  /** The lesson that explains this demo, if one is published. */
  lesson: lessonRefSchema.optional(),
  kind: z.enum(["simulation", "walkthrough", "explorer"]),
  tryThis: z.array(z.string().min(20)).min(2),
  references: z.array(referenceSchema).min(1),
});
export type PlaygroundDemo = z.infer<typeof playgroundDemoSchema>;

export function definePlayground(demos: z.input<typeof playgroundDemoSchema>[]) {
  return demos;
}

export const learningPathSchema = z.object({
  slug: slugSchema,
  title: z.string().min(5).max(60),
  /** One sentence; doubles as the meta description. */
  summary: z.string().min(70).max(170),
  /** Who the path is for, in one or two sentences. */
  audience: z.string().min(20).max(240),
  /** What a learner can do after finishing the path. */
  outcomes: z.array(z.string().min(10).max(160)).min(2).max(6),
  steps: z
    .array(
      z.object({
        lesson: lessonRefSchema,
        /** Why this lesson comes at this point in the path. */
        why: z.string().min(20).max(200),
      }),
    )
    .min(2),
});
export type LearningPath = z.infer<typeof learningPathSchema>;

export function defineLearningPaths(paths: z.input<typeof learningPathSchema>[]) {
  return paths;
}

export const glossaryTermSchema = z.object({
  /** Anchor id on the glossary page: /glossary#<id>. */
  id: slugSchema,
  term: z.string().min(2).max(60),
  /** Other names and abbreviations, also matched by search. */
  aliases: z.array(z.string().min(2)).default([]),
  /** Plain-language definition in one to three sentences. */
  definition: z.string().min(40).max(400),
  /** The published lesson that explains the term in depth. */
  lesson: lessonRefSchema.optional(),
  /** Ids of other glossary terms worth reading next. */
  related: z.array(slugSchema).default([]),
});
export type GlossaryTerm = z.infer<typeof glossaryTermSchema>;

export function defineGlossary(terms: z.input<typeof glossaryTermSchema>[]) {
  return terms;
}

/** Inline Markdown only: `code` spans, so answers stay plain text everywhere they are shown. */
const inlineText = z
  .string()
  .refine((text) => (text.match(/`/g) ?? []).length % 2 === 0, "unbalanced backticks");

const rubricPoint = inlineText.pipe(z.string().min(10).max(160));

export const interviewItemSchema = z.object({
  id: slugSchema,
  question: z.string().min(10).max(200),
  /** The seniority at which a candidate should answer this well. */
  level: z.enum(INTERVIEW_LEVELS),
  kind: z.enum(INTERVIEW_KINDS),
  /** A model answer, written in full sentences. */
  answer: inlineText.pipe(z.string().min(80)),
  /**
   * What graders look for, published so learners can grade themselves the same way:
   * points every good answer covers, signs of a strong answer, and common mistakes.
   */
  rubric: z.object({
    core: z.array(rubricPoint).min(2).max(5),
    strong: z.array(rubricPoint).max(3).default([]),
    redFlags: z.array(rubricPoint).min(1).max(3),
  }),
});
export type InterviewItem = z.output<typeof interviewItemSchema>;

export const interviewSchema = z.array(interviewItemSchema).min(3).max(8);

/** Typed identity helper for lesson `interview.ts` files. */
export function defineInterview(items: z.input<typeof interviewSchema>) {
  return items;
}

export const quizOptionSchema = z.object({
  id: z.string().regex(/^[a-e]$/, "option ids are a–e"),
  text: z.string().min(1),
  correct: z.boolean().default(false),
  /** Why this option is right or wrong — shown after answering, for every option. */
  explanation: z.string().min(15),
});

export const quizQuestionSchema = z
  .object({
    id: slugSchema,
    prompt: z.string().min(10),
    options: z.array(quizOptionSchema).min(2).max(5),
  })
  .refine((q) => q.options.filter((o) => o.correct).length === 1, {
    message: "each question needs exactly one correct option",
  })
  .refine((q) => new Set(q.options.map((o) => o.id)).size === q.options.length, {
    message: "option ids must be unique",
  });
export type QuizQuestion = z.output<typeof quizQuestionSchema>;

export const quizSchema = z.array(quizQuestionSchema).min(3).max(8);

const clueTitle = z.string().min(5).max(80);

export const incidentClueSchema = z.discriminatedUnion("kind", [
  /** A chart produced by a simulation run; `ref` names it in `lib/incidents/evidence.ts`. */
  z.object({
    kind: z.literal("chart"),
    ref: slugSchema,
    title: clueTitle,
    caption: z.string().min(20),
  }),
  /** Log or config lines produced by the same run. */
  z.object({
    kind: z.literal("log"),
    ref: slugSchema,
    title: clueTitle,
    caption: z.string().min(20),
  }),
  /** Context written by hand, such as a colleague's message or a dashboard reading. */
  z.object({ kind: z.literal("note"), title: clueTitle, text: z.string().min(20) }),
]);
export type IncidentClue = z.infer<typeof incidentClueSchema>;

export const incidentSchema = z.object({
  slug: slugSchema,
  title: z.string().min(5).max(70),
  /** One sentence; doubles as the meta description. */
  summary: z.string().min(70).max(170),
  difficulty: difficultySchema,
  /** The lesson that explains the underlying mechanism. */
  lesson: lessonRefSchema,
  /** The playground demo in which the incident can be reproduced. */
  demo: slugSchema,
  /** What the on-call engineer is told, in a few short paragraphs. */
  briefing: z.array(z.string().min(20)).min(1).max(4),
  clues: z.array(incidentClueSchema).min(3).max(8),
  /** Exactly two questions: the root cause, then the best first fix. */
  questions: z.tuple([quizQuestionSchema, quizQuestionSchema]),
  postmortem: z.object({
    whatHappened: z.string().min(40),
    whyItHappened: z.string().min(40),
    prevention: z.array(z.string().min(15)).min(2).max(5),
  }),
  /** Steps to reproduce the incident in the playground demo, using its real control names. */
  reproduce: z.array(z.string().min(10)).min(2).max(6),
});
export type Incident = z.output<typeof incidentSchema>;

export function defineIncidents(incidents: z.input<typeof incidentSchema>[]) {
  return incidents;
}

/** Typed identity helper for lesson `quiz.ts` files. */
export function defineQuiz(questions: z.input<typeof quizSchema>) {
  return questions;
}

/** Typed identity helper for lesson `meta.ts` files. */
export function defineLesson(meta: LessonMetaInput): LessonMetaInput {
  return meta;
}

/** Typed identity helper for `content/domains.ts`. */
export function defineDomains(domains: z.input<typeof domainSchema>[]) {
  return domains;
}

/**
 * Top-level route segments that a domain id must never shadow. Domain landing pages live at
 * `/<domain>`, so they share the URL namespace with these static routes.
 */
export const RESERVED_SEGMENTS = [
  "about",
  "api",
  "contribute",
  "docs",
  "explore",
  "glossary",
  "how-it-works",
  "incidents",
  "interview",
  "paths",
  "playground",
  "roadmap",
  "search",
  "case-studies",
  "robots.txt",
  "sitemap.xml",
] as const;

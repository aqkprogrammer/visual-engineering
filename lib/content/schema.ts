import { z } from "zod";

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
  readingMinutes: number;
  wordCount: number;
  headings: Heading[];
};

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
  "interview",
  "paths",
  "playground",
  "roadmap",
  "search",
  "case-studies",
  "robots.txt",
  "sitemap.xml",
] as const;

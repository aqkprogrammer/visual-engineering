/**
 * Node-only: discovers and validates content on disk. Used by `scripts/content.ts` (which writes
 * the generated registry) and by tests. Never imported by application code.
 */
import { access, readdir, readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { z } from "zod";
import { INCIDENT_EVIDENCE } from "../incidents/evidence";
import { INTERVIEW_HEADING_ID } from "./headings";
import { analyzeMdx, readingMinutesFor } from "./mdx-text";
import {
  domainSchema,
  glossaryTermSchema,
  incidentSchema,
  interviewSchema,
  learningPathSchema,
  lessonMetaSchema,
  playgroundDemoSchema,
  quizSchema,
  type Domain,
  type GlossaryTerm,
  type Incident,
  type InterviewItem,
  type LearningPath,
  type Lesson,
  type LessonMeta,
  type PlaygroundDemo,
  type QuizQuestion,
} from "./schema";
import {
  lessonRef,
  validateCatalog,
  validateGlossary,
  validateIncidents,
  validateLearningPaths,
  type ContentIssue,
} from "./validate";

export const CONTENT_DIR = fileURLToPath(new URL("../../content", import.meta.url));

export type LoadedCatalog = {
  domains: Domain[];
  lessons: (Lesson & { plainText: string; sourcePath: string })[];
  playground: PlaygroundDemo[];
  paths: LearningPath[];
  glossary: GlossaryTerm[];
  incidents: Incident[];
  issues: ContentIssue[];
};

function formatZodError(error: z.ZodError): string {
  return error.issues.map((i) => `${i.path.join(".") || "(root)"}: ${i.message}`).join("; ");
}

/** Imports a content module's default export and validates it; issues are collected, not thrown. */
async function loadList<T>(
  file: string,
  schema: z.ZodType<T>,
  issues: ContentIssue[],
): Promise<T[]> {
  const mod = (await import(pathToFileURL(file).href)) as { default: unknown };
  const parsed = z.array(schema).safeParse(mod.default);
  if (parsed.success) return parsed.data;
  issues.push({ where: `content/${path.basename(file)}`, message: formatZodError(parsed.error) });
  return [];
}

async function exists(file: string): Promise<boolean> {
  try {
    await access(file);
    return true;
  } catch {
    return false;
  }
}

async function subdirectories(dir: string): Promise<string[]> {
  if (!(await exists(dir))) return [];
  const entries = await readdir(dir, { withFileTypes: true });
  return entries
    .filter((e) => e.isDirectory() && !e.name.startsWith("."))
    .map((e) => e.name)
    .sort();
}

export async function loadCatalog(contentDir = CONTENT_DIR): Promise<LoadedCatalog> {
  const issues: ContentIssue[] = [];
  const lessonsDir = path.join(contentDir, "lessons");

  const domainsModule = (await import(pathToFileURL(path.join(contentDir, "domains.ts")).href)) as {
    default: unknown;
  };
  const parsedDomains = z.array(domainSchema).safeParse(domainsModule.default);
  if (!parsedDomains.success) {
    issues.push({ where: "content/domains.ts", message: formatZodError(parsedDomains.error) });
  }
  const domains = parsedDomains.success ? parsedDomains.data : [];

  const metas: LessonMeta[] = [];
  const demoUses: { where: string; slug: string }[] = [];
  const interviewIds = new Map<string, string>();
  const lessons: LoadedCatalog["lessons"] = [];

  for (const domainDir of await subdirectories(lessonsDir)) {
    for (const slugDir of await subdirectories(path.join(lessonsDir, domainDir))) {
      const dir = path.join(lessonsDir, domainDir, slugDir);
      const where = `content/lessons/${domainDir}/${slugDir}`;
      const metaPath = path.join(dir, "meta.ts");
      const bodyPath = path.join(dir, "index.mdx");

      if (!(await exists(metaPath)) || !(await exists(bodyPath))) {
        issues.push({ where, message: "a lesson folder needs both meta.ts and index.mdx" });
        continue;
      }

      const mod = (await import(pathToFileURL(metaPath).href)) as { default: unknown };
      const parsed = lessonMetaSchema.safeParse(mod.default);
      if (!parsed.success) {
        issues.push({ where: `${where}/meta.ts`, message: formatZodError(parsed.error) });
        continue;
      }
      const meta = parsed.data;
      if (meta.domain !== domainDir || meta.slug !== slugDir) {
        issues.push({
          where,
          message: `folder must match meta: expected content/lessons/${meta.domain}/${meta.slug}`,
        });
        continue;
      }

      let quiz: QuizQuestion[] = [];
      const quizPath = path.join(dir, "quiz.ts");
      if (await exists(quizPath)) {
        const quizModule = (await import(pathToFileURL(quizPath).href)) as { default: unknown };
        const parsedQuiz = quizSchema.safeParse(quizModule.default);
        if (parsedQuiz.success) {
          quiz = parsedQuiz.data;
          if (new Set(quiz.map((q) => q.id)).size !== quiz.length) {
            issues.push({ where: `${where}/quiz.ts`, message: "duplicate question ids" });
          }
        } else {
          issues.push({ where: `${where}/quiz.ts`, message: formatZodError(parsedQuiz.error) });
        }
      } else if (meta.status === "published") {
        issues.push({ where, message: "published lessons need a knowledge check (quiz.ts)" });
      }

      let interview: InterviewItem[] = [];
      const interviewPath = path.join(dir, "interview.ts");
      if (await exists(interviewPath)) {
        const mod = (await import(pathToFileURL(interviewPath).href)) as { default: unknown };
        const parsedInterview = interviewSchema.safeParse(mod.default);
        if (parsedInterview.success) {
          interview = parsedInterview.data;
          for (const item of interview) {
            const owner = interviewIds.get(item.id);
            if (owner) {
              issues.push({
                where: `${where}/interview.ts`,
                message: `question id "${item.id}" is already used in ${owner}`,
              });
            }
            interviewIds.set(item.id, where);
          }
        } else {
          issues.push({
            where: `${where}/interview.ts`,
            message: formatZodError(parsedInterview.error),
          });
        }
      } else if (meta.status === "published") {
        issues.push({
          where,
          message: "published lessons need interview questions (interview.ts)",
        });
      }

      const source = await readFile(bodyPath, "utf8");
      if (/<InterviewQuestion\b/.test(source)) {
        issues.push({
          where: `${where}/index.mdx`,
          message: "interview questions belong in interview.ts, not in the MDX body",
        });
      }
      if (/from\s+["']@\/components\/visualizations\/scenes\//.test(source)) {
        issues.push({
          where: `${where}/index.mdx`,
          message: 'embed demos with <Demo slug="…" /> instead of importing a scene directly',
        });
      }
      demoUses.push(
        ...[...source.matchAll(/<Demo\s+slug="([^"]*)"/g)].map((m) => ({
          where: `${where}/index.mdx`,
          slug: m[1] ?? "",
        })),
      );

      const analysis = analyzeMdx(source);
      if (analysis.wordCount < 300 && meta.status === "published") {
        issues.push({
          where,
          message: `published lessons need substance (${analysis.wordCount} words)`,
        });
      }

      // Interview answers are rendered on the lesson page after the MDX body, so they count
      // towards reading time and appear in the table of contents.
      const interviewWords = interview
        .map((i) => `${i.question} ${i.answer}`)
        .join(" ")
        .split(/\s+/)
        .filter(Boolean).length;
      const wordCount = analysis.wordCount + interviewWords;

      metas.push(meta);
      lessons.push({
        ...meta,
        id: lessonRef(meta),
        quiz,
        interview,
        readingMinutes: readingMinutesFor(wordCount),
        wordCount,
        headings:
          interview.length > 0
            ? [
                ...analysis.headings,
                { depth: 2, text: "Interview questions", id: INTERVIEW_HEADING_ID },
              ]
            : analysis.headings,
        plainText: analysis.plainText,
        sourcePath: path.relative(contentDir, dir),
      });
    }
  }

  issues.push(...validateCatalog(domains, metas));

  const playgroundModule = (await import(
    pathToFileURL(path.join(contentDir, "playground.ts")).href
  )) as { default: unknown };
  const parsedPlayground = z.array(playgroundDemoSchema).safeParse(playgroundModule.default);
  if (!parsedPlayground.success) {
    issues.push({
      where: "content/playground.ts",
      message: formatZodError(parsedPlayground.error),
    });
  }
  const playground = parsedPlayground.success ? parsedPlayground.data : [];
  const published = new Set(metas.filter((m) => m.status === "published").map(lessonRef));
  const seen = new Set<string>();
  for (const demo of playground) {
    const where = `playground:${demo.slug}`;
    if (seen.has(demo.slug)) issues.push({ where, message: "duplicate playground slug" });
    seen.add(demo.slug);
    for (const ref of [...(demo.lesson ? [demo.lesson] : []), ...demo.related]) {
      if (!published.has(ref)) {
        issues.push({ where, message: `lesson "${ref}" is not a published lesson` });
      }
    }
  }

  for (const use of demoUses) {
    if (!seen.has(use.slug)) {
      issues.push({
        where: use.where,
        message: `unknown demo "${use.slug}" (see content/playground.ts)`,
      });
    }
  }

  const paths = await loadList(path.join(contentDir, "paths.ts"), learningPathSchema, issues);
  issues.push(...validateLearningPaths(paths, metas));

  const glossary = await loadList(path.join(contentDir, "glossary.ts"), glossaryTermSchema, issues);
  issues.push(...validateGlossary(glossary, metas));

  const incidents = await loadList(path.join(contentDir, "incidents.ts"), incidentSchema, issues);
  const evidence = Object.fromEntries(
    Object.entries(INCIDENT_EVIDENCE).map(([slug, build]) => [slug, build()]),
  );
  issues.push(...validateIncidents(incidents, metas, seen, evidence));

  return { domains, lessons, playground, paths, glossary, incidents, issues };
}

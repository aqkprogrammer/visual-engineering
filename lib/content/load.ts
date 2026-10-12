/**
 * Node-only: discovers and validates content on disk. Used by `scripts/content.ts` (which writes
 * the generated registry) and by tests. Never imported by application code.
 */
import { access, readdir, readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { z } from "zod";
import { analyzeMdx } from "./mdx-text";
import {
  domainSchema,
  lessonMetaSchema,
  playgroundDemoSchema,
  type Domain,
  type Lesson,
  type LessonMeta,
  type PlaygroundDemo,
} from "./schema";
import { lessonRef, validateCatalog, type ContentIssue } from "./validate";

export const CONTENT_DIR = fileURLToPath(new URL("../../content", import.meta.url));

export type LoadedCatalog = {
  domains: Domain[];
  lessons: (Lesson & { plainText: string; sourcePath: string })[];
  playground: PlaygroundDemo[];
  issues: ContentIssue[];
};

function formatZodError(error: z.ZodError): string {
  return error.issues.map((i) => `${i.path.join(".") || "(root)"}: ${i.message}`).join("; ");
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

      const analysis = analyzeMdx(await readFile(bodyPath, "utf8"));
      if (analysis.wordCount < 300 && meta.status === "published") {
        issues.push({
          where,
          message: `published lessons need substance (${analysis.wordCount} words)`,
        });
      }

      metas.push(meta);
      lessons.push({
        ...meta,
        id: lessonRef(meta),
        readingMinutes: analysis.readingMinutes,
        wordCount: analysis.wordCount,
        headings: analysis.headings,
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
    if (demo.lesson && !published.has(demo.lesson)) {
      issues.push({ where, message: `lesson "${demo.lesson}" is not a published lesson` });
    }
  }

  return { domains, lessons, playground, issues };
}

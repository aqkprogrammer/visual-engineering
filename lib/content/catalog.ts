import "server-only";
import {
  domains as allDomains,
  lessonBodies,
  lessons as allLessons,
} from "@/content/.generated/registry";
import type { Domain, DomainId, Lesson, LessonRef, Module } from "./schema";

/**
 * Read-only queries over the generated content registry. Server-only: lesson bodies and the
 * full catalog never ship to the client unless a page passes specific fields down.
 *
 * Drafts are visible in `next dev` so authors can preview them, and excluded everywhere else.
 */
const includeDrafts = process.env.NODE_ENV === "development";

const visibleLessons: Lesson[] = allLessons.filter(
  (l) => l.status === "published" || includeDrafts,
);

const domainOrder = new Map(allDomains.map((d, i) => [d.id, i]));

function moduleIndex(lesson: Lesson): number {
  const domain = allDomains.find((d) => d.id === lesson.domain);
  return domain?.modules.findIndex((m) => m.id === lesson.module) ?? -1;
}

/** Curriculum order: domain → module → lesson.order → title. */
function compareLessons(a: Lesson, b: Lesson): number {
  return (
    (domainOrder.get(a.domain) ?? 0) - (domainOrder.get(b.domain) ?? 0) ||
    moduleIndex(a) - moduleIndex(b) ||
    a.order - b.order ||
    a.title.localeCompare(b.title)
  );
}

const orderedLessons = [...visibleLessons].sort(compareLessons);
const lessonById = new Map(orderedLessons.map((l) => [l.id, l]));

export function getDomains(): Domain[] {
  return allDomains;
}

export function getDomain(id: string): Domain | undefined {
  return allDomains.find((d) => d.id === id);
}

export function getLessons(): Lesson[] {
  return orderedLessons;
}

export function getLesson(domain: string, slug: string): Lesson | undefined {
  return lessonById.get(`${domain}/${slug}`);
}

export function getLessonsByRef(refs: LessonRef[]): Lesson[] {
  return refs.flatMap((ref) => lessonById.get(ref) ?? []);
}

export function getDomainLessons(domain: DomainId): Lesson[] {
  return orderedLessons.filter((l) => l.domain === domain);
}

export function getModuleLessons(domain: DomainId, module: Module["id"]): Lesson[] {
  return orderedLessons.filter((l) => l.domain === domain && l.module === module);
}

/** Previous/next lesson within the same domain, in curriculum order. */
export function getAdjacentLessons(lesson: Lesson): { previous?: Lesson; next?: Lesson } {
  const siblings = getDomainLessons(lesson.domain);
  const index = siblings.findIndex((l) => l.id === lesson.id);
  return { previous: siblings[index - 1], next: siblings[index + 1] };
}

export async function loadLessonBody(lesson: Lesson) {
  const load = lessonBodies[lesson.id];
  if (!load) throw new Error(`No MDX body registered for lesson ${lesson.id}`);
  return (await load()).default;
}

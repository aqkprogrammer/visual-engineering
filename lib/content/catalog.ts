import "server-only";
import {
  domains as allDomains,
  glossary as allTerms,
  incidents as allIncidents,
  lessons as allLessons,
  paths as allPaths,
  playground as allDemos,
} from "@/content/.generated/registry";
import type {
  Domain,
  DomainId,
  GlossaryTerm,
  Incident,
  InterviewItem,
  LearningPath,
  Lesson,
  LessonRef,
  Module,
  PlaygroundDemo,
} from "./schema";

/**
 * Read-only queries over the generated content registry. Server-only: the
 * full catalog never ships to the client unless a page passes specific fields down.
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

export function getPlaygroundDemos(): PlaygroundDemo[] {
  return allDemos;
}

export function getPlaygroundDemo(slug: string): PlaygroundDemo | undefined {
  return allDemos.find((d) => d.slug === slug);
}

/** Demos that belong to a lesson, for linking from the lesson page. */
export function getLessonDemos(lesson: Lesson): PlaygroundDemo[] {
  return allDemos.filter((d) => d.lesson === lesson.id);
}

export function getLearningPaths(): LearningPath[] {
  return allPaths;
}

export function getLearningPath(slug: string): LearningPath | undefined {
  return allPaths.find((p) => p.slug === slug);
}

/** The lessons of a path, in path order. */
export function getPathLessons(path: LearningPath): Lesson[] {
  return getLessonsByRef(path.steps.map((s) => s.lesson));
}

export type PathPosition = { path: LearningPath; index: number; next?: Lesson };

/** Every path that includes this lesson, with its position and the lesson after it. */
export function getLessonPaths(lesson: Lesson): PathPosition[] {
  return allPaths.flatMap((path) => {
    const index = path.steps.findIndex((s) => s.lesson === lesson.id);
    if (index === -1) return [];
    const nextRef = path.steps[index + 1]?.lesson;
    return [{ path, index, next: nextRef ? lessonById.get(nextRef) : undefined }];
  });
}

const sortedTerms = [...allTerms].sort((a, b) =>
  a.term.localeCompare(b.term, "en", { sensitivity: "base" }),
);

/** Glossary terms in alphabetical order. */
export function getGlossary(): GlossaryTerm[] {
  return sortedTerms;
}

/** Terms whose in-depth explanation is this lesson. */
export function getLessonTerms(lesson: Lesson): GlossaryTerm[] {
  return sortedTerms.filter((t) => t.lesson === lesson.id);
}

export type InterviewEntry = {
  item: InterviewItem;
  lesson: { id: LessonRef; title: string; domain: DomainId; domainTitle: string };
};

/** Every interview question with the lesson it comes from, in curriculum order. */
export function getInterviewEntries(): InterviewEntry[] {
  return orderedLessons.flatMap((lesson) =>
    lesson.interview.map((item) => ({
      item,
      lesson: {
        id: lesson.id,
        title: lesson.title,
        domain: lesson.domain,
        domainTitle: getDomain(lesson.domain)?.title ?? lesson.domain,
      },
    })),
  );
}

export function getIncidents(): Incident[] {
  return allIncidents;
}

export function getIncident(slug: string): Incident | undefined {
  return allIncidents.find((i) => i.slug === slug);
}

/** Incidents whose root cause this lesson explains. */
export function getLessonIncidents(lesson: Lesson): Incident[] {
  return allIncidents.filter((i) => i.lesson === lesson.id);
}

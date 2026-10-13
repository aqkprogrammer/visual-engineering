import {
  RESERVED_SEGMENTS,
  type Domain,
  type GlossaryTerm,
  type LearningPath,
  type LessonMeta,
  type LessonRef,
} from "./schema";

export type ContentIssue = { where: string; message: string };

export function lessonRef(lesson: Pick<LessonMeta, "domain" | "slug">): LessonRef {
  return `${lesson.domain}/${lesson.slug}`;
}

/**
 * Cross-document checks that a per-file schema cannot express: uniqueness, references that
 * must resolve, reserved URL segments and an acyclic prerequisite graph.
 * Returns every issue found rather than stopping at the first, so authors can fix them in one pass.
 */
export function validateCatalog(domains: Domain[], lessons: LessonMeta[]): ContentIssue[] {
  const issues: ContentIssue[] = [];
  const reserved = new Set<string>(RESERVED_SEGMENTS);

  const domainById = new Map<string, Domain>();
  for (const domain of domains) {
    if (domainById.has(domain.id)) {
      issues.push({ where: `domain:${domain.id}`, message: "duplicate domain id" });
    }
    if (reserved.has(domain.id)) {
      issues.push({
        where: `domain:${domain.id}`,
        message: "domain id collides with a reserved route",
      });
    }
    domainById.set(domain.id, domain);

    const moduleIds = new Set<string>();
    for (const mod of domain.modules) {
      if (moduleIds.has(mod.id)) {
        issues.push({ where: `domain:${domain.id}`, message: `duplicate module id "${mod.id}"` });
      }
      moduleIds.add(mod.id);
    }
  }

  const lessonById = new Map<string, LessonMeta>();
  for (const lesson of lessons) {
    const id = lessonRef(lesson);
    if (lessonById.has(id)) {
      issues.push({ where: id, message: "duplicate lesson slug within domain" });
    }
    lessonById.set(id, lesson);

    const domain = domainById.get(lesson.domain);
    if (!domain) {
      issues.push({ where: id, message: `unknown domain "${lesson.domain}"` });
    } else if (!domain.modules.some((m) => m.id === lesson.module)) {
      issues.push({
        where: id,
        message: `unknown module "${lesson.module}" in domain "${lesson.domain}"`,
      });
    }

    if (new Set(lesson.tags).size !== lesson.tags.length) {
      issues.push({ where: id, message: "duplicate tags" });
    }
  }

  for (const lesson of lessons) {
    const id = lessonRef(lesson);
    const links: [string, LessonRef[]][] = [
      ["prerequisite", lesson.prerequisites],
      ["related lesson", lesson.related],
    ];
    for (const [label, refs] of links) {
      for (const ref of refs) {
        if (ref === id) {
          issues.push({ where: id, message: `lists itself as a ${label}` });
          continue;
        }
        const target = lessonById.get(ref);
        if (!target) {
          issues.push({ where: id, message: `${label} "${ref}" does not exist` });
        } else if (lesson.status === "published" && target.status !== "published") {
          issues.push({ where: id, message: `${label} "${ref}" is not published yet` });
        }
      }
    }
  }

  for (const cycle of findPrerequisiteCycles(lessons)) {
    issues.push({
      where: cycle[0] ?? "prerequisites",
      message: `prerequisite cycle: ${cycle.join(" → ")}`,
    });
  }

  return issues;
}

/** Depth-first search for cycles in the prerequisite graph. Each cycle is reported once. */
export function findPrerequisiteCycles(lessons: LessonMeta[]): LessonRef[][] {
  const edges = new Map<LessonRef, LessonRef[]>(
    lessons.map((l) => [lessonRef(l), l.prerequisites]),
  );
  const state = new Map<LessonRef, "visiting" | "done">();
  const stack: LessonRef[] = [];
  const cycles: LessonRef[][] = [];

  const visit = (node: LessonRef) => {
    const s = state.get(node);
    if (s === "done") return;
    if (s === "visiting") {
      cycles.push([...stack.slice(stack.indexOf(node)), node]);
      return;
    }
    state.set(node, "visiting");
    stack.push(node);
    for (const next of edges.get(node) ?? []) {
      if (edges.has(next)) visit(next);
    }
    stack.pop();
    state.set(node, "done");
  };

  for (const node of edges.keys()) visit(node);
  return cycles;
}

/**
 * Checks learning paths against the lessons they list: every step must be a published lesson,
 * appear once, and come after all of its own prerequisites, so a path can be followed in order.
 */
export function validateLearningPaths(
  paths: LearningPath[],
  lessons: LessonMeta[],
): ContentIssue[] {
  const issues: ContentIssue[] = [];
  const lessonById = new Map(lessons.map((l) => [lessonRef(l), l]));
  const slugs = new Set<string>();

  for (const path of paths) {
    const where = `path:${path.slug}`;
    if (slugs.has(path.slug)) issues.push({ where, message: "duplicate path slug" });
    slugs.add(path.slug);

    const seen = new Set<LessonRef>();
    for (const [index, step] of path.steps.entries()) {
      const lesson = lessonById.get(step.lesson);
      if (seen.has(step.lesson)) {
        issues.push({ where, message: `lists "${step.lesson}" more than once` });
      }
      if (!lesson) {
        issues.push({
          where,
          message: `step ${index + 1}: lesson "${step.lesson}" does not exist`,
        });
      } else if (lesson.status !== "published") {
        issues.push({
          where,
          message: `step ${index + 1}: lesson "${step.lesson}" is not published`,
        });
      } else {
        for (const prerequisite of lesson.prerequisites) {
          if (!seen.has(prerequisite)) {
            issues.push({
              where,
              message: `step ${index + 1}: "${step.lesson}" needs "${prerequisite}" earlier in the path`,
            });
          }
        }
      }
      seen.add(step.lesson);
    }
  }
  return issues;
}

/** Glossary ids and names must be unique, and every link must resolve to something published. */
export function validateGlossary(terms: GlossaryTerm[], lessons: LessonMeta[]): ContentIssue[] {
  const issues: ContentIssue[] = [];
  const published = new Set(lessons.filter((l) => l.status === "published").map(lessonRef));
  const ids = new Set(terms.map((t) => t.id));
  const seenIds = new Set<string>();
  const names = new Map<string, string>();

  for (const term of terms) {
    const where = `glossary:${term.id}`;
    if (seenIds.has(term.id)) issues.push({ where, message: "duplicate glossary id" });
    seenIds.add(term.id);

    for (const name of [term.term, ...term.aliases]) {
      const key = name.toLowerCase();
      const owner = names.get(key);
      if (owner && owner !== term.id) {
        issues.push({ where, message: `"${name}" is already used by "${owner}"` });
      }
      names.set(key, term.id);
    }

    if (term.lesson && !published.has(term.lesson)) {
      issues.push({ where, message: `lesson "${term.lesson}" is not a published lesson` });
    }
    for (const related of term.related) {
      if (related === term.id) issues.push({ where, message: "lists itself as related" });
      else if (!ids.has(related)) {
        issues.push({ where, message: `related term "${related}" does not exist` });
      }
    }
  }
  return issues;
}

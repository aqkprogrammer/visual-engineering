import { RESERVED_SEGMENTS, type Domain, type LessonMeta, type LessonRef } from "./schema";

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

import "server-only";
import {
  getDomain,
  getGlossary,
  getIncidents,
  getInterviewEntries,
  getLearningPaths,
  getLessons,
  getLessonsByRef,
  getPlaygroundDemos,
} from "@/lib/content/catalog";
import type { SearchDoc } from "./search";

const DEMO_KIND_LABEL = {
  simulation: "Simulation",
  walkthrough: "Step-by-step walkthrough",
  explorer: "Interactive explorer",
} as const;

/** Builds the search index at build time from the content catalog. */
export function buildSearchIndex(): SearchDoc[] {
  const lessons: SearchDoc[] = getLessons().map((lesson) => {
    const domain = getDomain(lesson.domain);
    const lessonModule = domain?.modules.find((m) => m.id === lesson.module);
    return {
      kind: "lesson",
      title: lesson.title,
      href: `/${lesson.id}`,
      summary: lesson.description,
      context: domain?.title ?? lesson.domain,
      aliases: [],
      keywords: [...lesson.tags, lessonModule?.title ?? "", ...lesson.headings.map((h) => h.text)],
      body: lesson.quiz.map((q) => q.prompt).join(" "),
    };
  });

  const paths: SearchDoc[] = getLearningPaths().map((path) => ({
    kind: "path",
    title: path.title,
    href: `/paths/${path.slug}`,
    summary: path.summary,
    context: `Learning path · ${path.steps.length} lessons`,
    aliases: [],
    keywords: getLessonsByRef(path.steps.map((s) => s.lesson)).map((l) => l.title),
    body: [path.audience, ...path.outcomes].join(" "),
  }));

  const demos: SearchDoc[] = getPlaygroundDemos().map((demo) => ({
    kind: "demo",
    title: demo.title,
    href: `/playground/${demo.slug}`,
    summary: demo.summary,
    context: `${DEMO_KIND_LABEL[demo.kind]} · ${getDomain(demo.domain)?.title ?? demo.domain}`,
    aliases: [],
    keywords: [],
    body: demo.tryThis.join(" "),
  }));

  const terms: SearchDoc[] = getGlossary().map((term) => ({
    kind: "term",
    title: term.term,
    href: `/glossary/#${term.id}`,
    summary: term.definition,
    context: term.lesson ? (getDomain(term.lesson.split("/")[0] ?? "")?.title ?? "") : "",
    aliases: term.aliases,
    keywords: [],
    body: "",
  }));

  const incidents: SearchDoc[] = getIncidents().map((incident) => ({
    kind: "incident",
    title: incident.title,
    href: `/incidents/${incident.slug}`,
    summary: incident.summary,
    context: getDomain(incident.lesson.split("/")[0] ?? "")?.title ?? "",
    aliases: [],
    keywords: incident.clues.map((c) => c.title),
    body: incident.briefing.join(" "),
  }));

  const questions: SearchDoc[] = getInterviewEntries().map(({ item, lesson }) => ({
    kind: "question",
    title: item.question,
    href: `/interview/#${item.id}`,
    summary: item.answer,
    context: lesson.domainTitle,
    aliases: [],
    keywords: [lesson.title],
    body: "",
  }));

  return [...lessons, ...paths, ...demos, ...incidents, ...questions, ...terms];
}

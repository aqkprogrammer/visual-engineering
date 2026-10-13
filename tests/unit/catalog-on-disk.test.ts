import { describe, expect, it } from "vitest";
import { loadCatalog } from "@/lib/content/load";
import { RESERVED_SEGMENTS } from "@/lib/content/schema";

/** Guards the real curriculum: every content change must keep these green. */
describe("curriculum content on disk", async () => {
  const catalog = await loadCatalog();

  it("has no validation issues", () => {
    expect(catalog.issues).toEqual([]);
  });

  it("defines all seven domains, none shadowing a static route", () => {
    expect(catalog.domains.map((d) => d.id)).toHaveLength(7);
    for (const domain of catalog.domains) {
      expect(RESERVED_SEGMENTS as readonly string[]).not.toContain(domain.id);
    }
  });

  it("gives every published lesson headings, a reading time and a recent review date", () => {
    const published = catalog.lessons.filter((l) => l.status === "published");
    expect(published.length).toBeGreaterThan(0);
    for (const lesson of published) {
      expect(lesson.headings.length, lesson.id).toBeGreaterThan(3);
      expect(lesson.readingMinutes, lesson.id).toBeGreaterThan(0);
      expect(Number.isNaN(Date.parse(lesson.lastReviewed)), lesson.id).toBe(false);
    }
  });

  it("keeps heading ids unique within each lesson", () => {
    for (const lesson of catalog.lessons) {
      const ids = lesson.headings.map((h) => h.id);
      expect(new Set(ids).size, lesson.id).toBe(ids.length);
    }
  });
});

describe("playground content", async () => {
  const { DEMO_SLUGS } = await import("@/components/visualizations/demo-slugs");
  const catalog = await loadCatalog();

  it("registers a component for every playground demo and vice versa", () => {
    expect(catalog.playground.map((d) => d.slug).sort()).toEqual([...DEMO_SLUGS].sort());
  });
});

describe("learning paths and glossary on disk", async () => {
  const catalog = await loadCatalog();
  const published = new Set(
    catalog.lessons.filter((l) => l.status === "published").map((l) => l.id),
  );

  it("has at least one path, each with two or more published lessons", () => {
    expect(catalog.paths.length).toBeGreaterThan(0);
    for (const path of catalog.paths) {
      expect(path.steps.length, path.slug).toBeGreaterThanOrEqual(2);
      for (const step of path.steps) expect(published.has(step.lesson), step.lesson).toBe(true);
    }
  });

  it("links every glossary term to a published lesson", () => {
    expect(catalog.glossary.length).toBeGreaterThan(20);
    for (const term of catalog.glossary) {
      expect(term.lesson && published.has(term.lesson), term.id).toBe(true);
    }
  });

  it("puts every published lesson in at least one path", () => {
    const inPaths = new Set(catalog.paths.flatMap((p) => p.steps.map((s) => s.lesson)));
    expect([...published].filter((id) => !inPaths.has(id))).toEqual([]);
  });
});

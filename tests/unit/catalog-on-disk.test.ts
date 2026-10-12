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

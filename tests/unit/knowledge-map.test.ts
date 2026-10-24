import { describe, expect, it } from "vitest";
import { layoutMap, NODE, readyLessons, wrapTitle, type MapLessonInput } from "@/lib/map/layout";
import { getDomains, getLearningPaths, getLessons } from "@/lib/content/catalog";

const domains = getDomains();
const lessons: MapLessonInput[] = getLessons().map((l) => ({
  id: l.id,
  title: l.title,
  domain: l.domain,
  moduleIndex: domains.find((d) => d.id === l.domain)!.modules.findIndex((m) => m.id === l.module),
  order: l.order,
  prerequisites: l.prerequisites,
}));
const paths = getLearningPaths().map((p) => ({
  slug: p.slug,
  title: p.title,
  lessons: p.steps.map((s) => s.lesson),
}));
const layout = layoutMap(
  domains.map((d) => ({ id: d.id, title: d.title })),
  lessons,
  paths,
);

describe("wrapTitle", () => {
  it("wraps by words without cutting anything", () => {
    expect(wrapTitle("How DNS resolution works")).toEqual(["How DNS resolution", "works"]);
    expect(wrapTitle("Autoscaling")).toEqual(["Autoscaling"]);
    const title = "How retrieval-augmented generation (RAG) works";
    expect(wrapTitle(title).join(" ")).toBe(title);
  });

  it("fits every lesson title in three lines", () => {
    for (const lesson of lessons) {
      const lines = wrapTitle(lesson.title);
      expect(lines.length, lesson.title).toBeLessThanOrEqual(3);
      expect(lines.join(" ")).toBe(lesson.title);
    }
  });
});

describe("knowledge map layout", () => {
  it("places every lesson exactly once, one row per domain with lessons", () => {
    expect(layout.nodes.map((n) => n.id).sort()).toEqual(lessons.map((l) => l.id).sort());
    const rowsWithLessons = new Set(lessons.map((l) => l.domain));
    expect(layout.rows.map((r) => r.domain).sort()).toEqual([...rowsWithLessons].sort());
  });

  it("never overlaps two boxes", () => {
    for (const a of layout.nodes) {
      for (const b of layout.nodes) {
        if (a === b) continue;
        const apart = Math.abs(a.x - b.x) >= NODE.w || Math.abs(a.y - b.y) >= NODE.h;
        expect(apart, `${a.id} overlaps ${b.id}`).toBe(true);
      }
    }
  });

  it("draws one link per prerequisite", () => {
    const expected = lessons.reduce((n, l) => n + l.prerequisites.length, 0);
    expect(layout.edges).toHaveLength(expected);
  });

  it("routes links between distant rows through the gaps between boxes", () => {
    for (const edge of layout.edges) {
      const verticals = [...edge.d.matchAll(/L([\d.]+),([\d.]+) L\1,([\d.]+)/g)].map((m) => ({
        x: Number(m[1]),
        lo: Math.min(Number(m[2]), Number(m[3])),
        hi: Math.max(Number(m[2]), Number(m[3])),
      }));
      for (const v of verticals) {
        for (const node of layout.nodes) {
          if (node.id === edge.from || node.id === edge.to) continue;
          const crosses =
            Math.abs(v.x - node.x) < NODE.w / 2 &&
            v.lo < node.y + NODE.h / 2 &&
            v.hi > node.y - NODE.h / 2;
          expect(crosses, `${edge.from} → ${edge.to} crosses ${node.id}`).toBe(false);
        }
      }
    }
  });

  it("draws every learning path through its lessons in order", () => {
    for (const path of paths) {
      const route = layout.routes.find((r) => r.slug === path.slug)!;
      expect(route.stops).toEqual(path.lessons);
      expect(route.d.split(" L")).toHaveLength(path.lessons.length);
    }
  });

  it("fits the canvas to its contents", () => {
    for (const n of layout.nodes) {
      expect(n.x + NODE.w / 2).toBeLessThanOrEqual(layout.width);
      expect(n.y + NODE.h / 2).toBeLessThanOrEqual(layout.height);
    }
  });
});

describe("readyLessons", () => {
  it("with nothing completed, is every lesson without prerequisites", () => {
    const ready = readyLessons(lessons, new Set());
    expect([...ready].sort()).toEqual(
      lessons
        .filter((l) => l.prerequisites.length === 0)
        .map((l) => l.id)
        .sort(),
    );
  });

  it("unlocks a lesson once all its prerequisites are completed", () => {
    expect(readyLessons(lessons, new Set(["ai/embeddings"])).has("ai/hybrid-search")).toBe(false);
    const done = new Set(["ai/embeddings", "ai/how-rag-works"]);
    const ready = readyLessons(lessons, done);
    expect(ready.has("ai/hybrid-search")).toBe(true);
    expect(ready.has("ai/how-rag-works")).toBe(false);
  });
});

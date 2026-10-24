/**
 * Layout of the knowledge map: one row per domain, lessons in module order, prerequisite links
 * as curves, and each learning path as a route through its lessons. Pure and deterministic, so
 * the page is identical on every build and the layout can be tested.
 */

export type MapLessonInput = {
  id: string;
  title: string;
  domain: string;
  /** Position of the lesson's module within its domain, then its order within the module. */
  moduleIndex: number;
  order: number;
  prerequisites: string[];
};
export type MapDomainInput = { id: string; title: string };
export type MapPathInput = { slug: string; title: string; lessons: string[] };

export type MapNode = {
  id: string;
  title: string;
  domain: string;
  x: number;
  y: number;
  /** The title split into at most two lines that fit the box. */
  lines: string[];
};
export type MapEdge = { from: string; to: string; d: string };
export type MapRoute = { slug: string; title: string; d: string; stops: string[] };
export type MapRow = { domain: string; title: string; y: number };
export type MapLayout = {
  width: number;
  height: number;
  nodes: MapNode[];
  edges: MapEdge[];
  routes: MapRoute[];
  rows: MapRow[];
};

export const NODE = { w: 150, h: 62 } as const;
const LEFT = 16;
const COL = 172;
const ROW = 116;
const TOP = 40;
const LINE_CHARS = 23;

/**
 * Splits a title into lines of about `max` characters. Titles are never cut short — the visible
 * text must match the link's accessible name — so a very long title simply takes more lines.
 */
export function wrapTitle(title: string, max = LINE_CHARS): string[] {
  const lines: string[] = [];
  for (const word of title.split(/\s+/)) {
    const current = lines.at(-1);
    if (current !== undefined && `${current} ${word}`.length <= max) {
      lines[lines.length - 1] = `${current} ${word}`;
    } else {
      lines.push(word);
    }
  }
  return lines;
}

export function layoutMap(
  domains: MapDomainInput[],
  lessons: MapLessonInput[],
  paths: MapPathInput[],
): MapLayout {
  const rows: MapRow[] = [];
  const nodes: MapNode[] = [];
  let maxCols = 0;
  domains.forEach((domain) => {
    const inRow = lessons
      .filter((l) => l.domain === domain.id)
      .sort(
        (a, b) => a.moduleIndex - b.moduleIndex || a.order - b.order || a.id.localeCompare(b.id),
      );
    if (inRow.length === 0) return;
    const y = TOP + rows.length * ROW + NODE.h / 2;
    rows.push({ domain: domain.id, title: domain.title, y });
    inRow.forEach((lesson, i) => {
      nodes.push({
        id: lesson.id,
        title: lesson.title,
        domain: lesson.domain,
        x: LEFT + i * COL + NODE.w / 2,
        y,
        lines: wrapTitle(lesson.title),
      });
    });
    maxCols = Math.max(maxCols, inRow.length);
  });
  const byId = new Map(nodes.map((n) => [n.id, n]));

  const edges: MapEdge[] = [];
  for (const lesson of lessons) {
    const to = byId.get(lesson.id);
    if (!to) continue;
    for (const ref of lesson.prerequisites) {
      const from = byId.get(ref);
      if (!from) continue;
      edges.push({ from: from.id, to: to.id, d: curve(from, to) });
    }
  }

  const routes: MapRoute[] = paths.map((path) => {
    const stops = path.lessons.filter((id) => byId.has(id));
    const points = stops.map((id) => byId.get(id)!);
    const d = points.map((p, i) => `${i === 0 ? "M" : "L"}${p.x},${p.y}`).join(" ");
    return { slug: path.slug, title: path.title, d, stops };
  });

  return {
    width: LEFT * 2 + maxCols * COL - (COL - NODE.w),
    height: TOP + rows.length * ROW,
    nodes,
    edges,
    routes,
    rows,
  };
}

/** A link from the edge of one box to the edge of another, avoiding the boxes in between. */
function curve(from: MapNode, to: MapNode): string {
  if (from.y === to.y) {
    const sx = from.x + (to.x > from.x ? NODE.w / 2 : -NODE.w / 2);
    const ex = to.x + (to.x > from.x ? -NODE.w / 2 : NODE.w / 2);
    if (Math.abs(to.x - from.x) <= COL) return `M${sx},${from.y} L${ex},${to.y}`;
    // Skip over boxes in between by arching below the row, clear of the row's label.
    const bottom = from.y + NODE.h / 2 + 20;
    return `M${from.x},${from.y + NODE.h / 2} C${from.x},${bottom} ${to.x},${bottom} ${to.x},${to.y + NODE.h / 2}`;
  }
  const down = to.y > from.y;
  const dir = down ? 1 : -1;
  const sy = from.y + dir * (NODE.h / 2);
  const ey = to.y - dir * (NODE.h / 2);
  if (Math.abs(to.y - from.y) <= ROW) {
    // Adjacent rows: a curve through the gap between them crosses no boxes.
    const mid = (sy + ey) / 2;
    return `M${from.x},${sy} C${from.x},${mid} ${to.x},${mid} ${to.x},${ey}`;
  }
  // Further apart: run down the gutter beside the target's column, between the rows' boxes.
  const gapOut = from.y + dir * (NODE.h / 2 + 12);
  const gapIn = to.y - dir * (NODE.h / 2 + 22);
  const channel = to.x - NODE.w / 2 - (COL - NODE.w) / 2;
  return `M${from.x},${sy} L${from.x},${gapOut} L${channel},${gapOut} L${channel},${gapIn} L${to.x},${gapIn} L${to.x},${ey}`;
}

/** Lessons whose prerequisites are all completed but which aren't completed themselves. */
export function readyLessons(lessons: MapLessonInput[], completed: Set<string>): Set<string> {
  return new Set(
    lessons
      .filter((l) => !completed.has(l.id) && l.prerequisites.every((p) => completed.has(p)))
      .map((l) => l.id),
  );
}

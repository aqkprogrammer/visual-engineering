import {
  heapPageCount,
  ROWS_PER_HEAP_PAGE,
  type BNode,
  type IndexFrameState,
} from "@/lib/simulation/models/btree";
import { cn } from "@/lib/utils/cn";

const W = 760;
const H = 400;
const LEVEL_GAP = 66;
const NODE_H = 30;
const KEY_W = 22;

type Placed = { node: BNode; x: number; y: number; w: number };

/** Positions leaves evenly and centres every internal node over its children. */
function layout(state: IndexFrameState): Placed[] {
  const { tree } = state;
  const levels: BNode[][] = [];
  let frontier = [tree.nodes[tree.root]!];
  while (frontier.length) {
    levels.push(frontier);
    frontier = frontier.flatMap((n) => (n.leaf ? [] : n.children.map((c) => tree.nodes[c]!)));
  }
  const leafCount = levels.at(-1)!.length;
  const slot = Math.min(84, (W - 40) / leafCount);
  const placed = new Map<number, Placed>();
  const top = 34;
  levels.at(-1)!.forEach((node, i) => {
    const w = Math.max(KEY_W, node.keys.length * KEY_W) + 8;
    placed.set(node.id, {
      node,
      x: 20 + slot * (i + 0.5),
      y: top + (levels.length - 1) * LEVEL_GAP,
      w,
    });
  });
  for (let l = levels.length - 2; l >= 0; l--) {
    for (const node of levels[l]!) {
      const xs = node.children.map((c) => placed.get(c)!.x);
      const w = node.keys.length * KEY_W + 8;
      placed.set(node.id, {
        node,
        x: (Math.min(...xs) + Math.max(...xs)) / 2,
        y: top + l * LEVEL_GAP,
        w,
      });
    }
  }
  return [...placed.values()];
}

export function BTreeScene({ state }: { state: IndexFrameState }) {
  const placed = layout(state);
  const byId = new Map(placed.map((p) => [p.node.id, p]));
  const onPath = new Set(state.path);
  const heapPages = heapPageCount(state.heap);
  const heapY = 300;
  const pageW = Math.min(132, (W - 40) / heapPages - 8);

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="absolute inset-0 h-full w-full font-mono" aria-hidden>
      <text x={20} y={20} className="fill-fg-subtle text-[11px]">
        B+ tree index on id · {state.operation === "search" ? "searching for" : "inserting"}{" "}
        {state.key}
      </text>

      {/* Edges */}
      {placed
        .filter((p) => !p.node.leaf)
        .flatMap((p) =>
          p.node.children.map((c) => {
            const child = byId.get(c)!;
            const active = onPath.has(p.node.id) && onPath.has(c);
            return (
              <line
                key={`${p.node.id}-${c}`}
                x1={p.x}
                y1={p.y + NODE_H}
                x2={child.x}
                y2={child.y}
                strokeWidth={active ? 2.25 : 1}
                className={active ? "stroke-accent" : "stroke-border-strong"}
              />
            );
          }),
        )}
      {/* Leaf sibling links */}
      {placed
        .filter((p) => p.node.leaf && p.node.next !== null)
        .map((p) => {
          const next = byId.get(p.node.next!)!;
          return (
            <line
              key={`next-${p.node.id}`}
              x1={p.x + p.w / 2}
              y1={p.y + NODE_H / 2}
              x2={next.x - next.w / 2}
              y2={next.y + NODE_H / 2}
              strokeDasharray="2 3"
              className="stroke-fg-subtle"
            />
          );
        })}

      {/* Pages */}
      {placed.map(({ node, x, y, w }) => {
        const active = state.active === node.id;
        const visited = onPath.has(node.id);
        return (
          <g key={node.id}>
            <rect
              x={x - w / 2}
              y={y}
              width={w}
              height={NODE_H}
              rx={5}
              strokeWidth={active ? 2.25 : 1}
              className={cn(
                visited ? "fill-accent-soft" : "fill-surface-2",
                active ? "stroke-accent" : visited ? "stroke-accent/60" : "stroke-border-strong",
              )}
            />
            {node.keys.map((k, i) => (
              <text
                key={k}
                x={x - w / 2 + 4 + KEY_W * (i + 0.5)}
                y={y + 19}
                textAnchor="middle"
                className={cn(
                  "text-[11px]",
                  k === state.key && node.leaf && state.found ? "fill-ok font-medium" : "fill-fg",
                )}
              >
                {k}
              </text>
            ))}
            <text x={x} y={y - 4} textAnchor="middle" className="fill-fg-subtle text-[9px]">
              p{node.id}
            </text>
          </g>
        );
      })}

      {/* Heap (table pages) */}
      <text x={20} y={heapY - 10} className="fill-fg-subtle text-[11px]">
        Table heap — rows in insertion order, not sorted by id ({heapPages} pages)
      </text>
      {Array.from({ length: heapPages }, (_, p) => {
        const rows = state.heap.slice(p * ROWS_PER_HEAP_PAGE, (p + 1) * ROWS_PER_HEAP_PAGE);
        const fetched = state.heapPage === p + 1;
        const x = 20 + p * (pageW + 8);
        return (
          <g key={p}>
            <rect
              x={x}
              y={heapY}
              width={pageW}
              height={44}
              rx={6}
              strokeWidth={fetched ? 2.25 : 1}
              className={cn(
                fetched ? "fill-ok/15 stroke-ok" : "fill-surface-2 stroke-border-strong",
              )}
            />
            <text x={x + 6} y={heapY + 14} className="fill-fg-subtle text-[9px]">
              heap page {p + 1}
            </text>
            <text x={x + 6} y={heapY + 32} className="fill-fg text-[11px]">
              {rows.join(" · ")}
            </text>
          </g>
        );
      })}
      <text x={W - 20} y={H - 14} textAnchor="end" className="fill-fg-subtle text-[11px]">
        dashed lines link neighbouring leaves for range scans
      </text>
    </svg>
  );
}

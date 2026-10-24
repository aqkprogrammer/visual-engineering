"use client";

import { useId, useState } from "react";
import { useHydrated, useProgress } from "@/components/progress/progress-store";
import { NODE, readyLessons, type MapLayout, type MapLessonInput } from "@/lib/map/layout";
import { isCompleted } from "@/lib/progress/progress";
import { getBasePath } from "@/lib/site";
import { cn } from "@/lib/utils/cn";

const ROUTE_STROKE = [
  "stroke-accent",
  "stroke-data",
  "stroke-warn",
  "stroke-ok",
  "stroke-fail",
  "stroke-fg-muted",
];
const ROUTE_BG = ["bg-accent", "bg-data", "bg-warn", "bg-ok", "bg-fail", "bg-fg-muted"];

type Status = "completed" | "ready" | "locked";

export function KnowledgeMap({
  layout,
  lessons,
}: {
  layout: MapLayout;
  lessons: MapLessonInput[];
}) {
  const progress = useProgress();
  const hydrated = useHydrated();
  const [route, setRoute] = useState<string | null>(null);
  const name = useId();

  const completed = new Set(
    hydrated ? lessons.filter((l) => isCompleted(progress, l.id)).map((l) => l.id) : [],
  );
  const ready = readyLessons(lessons, completed);
  const statusOf = (id: string): Status =>
    completed.has(id) ? "completed" : ready.has(id) ? "ready" : "locked";
  const lessonById = new Map(lessons.map((l) => [l.id, l]));
  const titleOf = (id: string) => layout.nodes.find((n) => n.id === id)?.title ?? id;
  const selected = layout.routes.find((r) => r.slug === route) ?? null;
  const routeIndex = selected ? layout.routes.indexOf(selected) : -1;
  const stopNumber = (id: string) => (selected ? selected.stops.indexOf(id) + 1 : 0);

  return (
    <div className="space-y-4">
      <fieldset>
        <legend className="mb-1.5 text-xs font-medium text-fg-muted">Show a learning path</legend>
        <div className="flex flex-wrap gap-2">
          {[{ slug: null, title: "Prerequisites only" }, ...layout.routes].map((r, i) => (
            <label
              key={r.slug ?? "none"}
              className="inline-flex cursor-pointer items-center gap-2 rounded-md border border-border px-2.5 py-1 text-sm hover:bg-surface has-[:checked]:border-accent has-[:checked]:bg-accent-soft has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-accent"
            >
              <input
                type="radio"
                name={name}
                checked={route === r.slug}
                onChange={() => setRoute(r.slug)}
                className="sr-only"
              />
              {r.slug && (
                <span
                  aria-hidden
                  className={cn("size-2.5 rounded-full", ROUTE_BG[(i - 1) % ROUTE_BG.length])}
                />
              )}
              {r.title}
            </label>
          ))}
        </div>
      </fieldset>

      <p className="text-sm text-fg-muted" aria-live="polite">
        {hydrated
          ? `${completed.size} of ${lessons.length} lessons completed · ${ready.size} ready to start`
          : "Loading your progress…"}
        {selected && ` · ${selected.title}: ${selected.stops.length} lessons, numbered in order`}
      </p>

      <div
        className="relative overflow-x-auto rounded-xl border border-border bg-bg"
        tabIndex={0}
        role="region"
        aria-label="Knowledge map"
      >
        <svg
          viewBox={`0 0 ${layout.width} ${layout.height}`}
          width={layout.width}
          height={layout.height}
          className="block min-w-full font-mono"
          role="group"
          aria-label={`Lessons by domain, with arrows to the lessons that build on each one${selected ? `; the ${selected.title} path is numbered in order` : ""}`}
        >
          <defs>
            <marker
              id={`${name}-arrow`}
              viewBox="0 0 10 10"
              refX="9"
              refY="5"
              markerWidth="6"
              markerHeight="6"
              orient="auto-start-reverse"
            >
              <path d="M0,0 L10,5 L0,10 z" className="fill-fg-subtle" />
            </marker>
          </defs>

          {layout.rows.map((row) => (
            <text
              key={row.domain}
              x={16}
              y={row.y - NODE.h / 2 - 10}
              className="fill-fg-muted text-[11px] font-medium tracking-wide uppercase"
            >
              {row.title}
            </text>
          ))}

          {selected && (
            <path
              d={selected.d}
              fill="none"
              strokeWidth={6}
              strokeLinecap="round"
              strokeLinejoin="round"
              opacity={0.55}
              className={ROUTE_STROKE[routeIndex % ROUTE_STROKE.length]}
            />
          )}

          {layout.edges.map((e) => (
            <path
              key={`${e.from}-${e.to}`}
              d={e.d}
              fill="none"
              strokeWidth={1.25}
              opacity={selected ? 0.25 : 0.7}
              markerEnd={`url(#${name}-arrow)`}
              className="stroke-fg-subtle"
            />
          ))}

          {layout.nodes.map((node) => {
            const status = statusOf(node.id);
            const stop = stopNumber(node.id);
            const dim = selected !== null && stop === 0;
            const prereqs = lessonById.get(node.id)?.prerequisites ?? [];
            const label = [
              node.title,
              status === "completed" ? "completed" : status === "ready" ? "ready to start" : null,
              prereqs.length > 0 ? `builds on ${prereqs.map(titleOf).join(" and ")}` : null,
              stop > 0 && selected ? `step ${stop} of ${selected.title}` : null,
            ]
              .filter(Boolean)
              .join(" — ");
            return (
              <a
                key={node.id}
                href={`${getBasePath()}/${node.id}/`}
                aria-label={label}
                className="group"
              >
                <g opacity={dim ? 0.4 : 1}>
                  <rect
                    x={node.x - NODE.w / 2}
                    y={node.y - NODE.h / 2}
                    width={NODE.w}
                    height={NODE.h}
                    rx={9}
                    strokeWidth={status === "ready" ? 1.75 : 1}
                    strokeDasharray={status === "ready" ? "4 3" : undefined}
                    className={cn(
                      "transition-colors group-hover:stroke-accent group-focus-visible:stroke-accent",
                      status === "completed" && "fill-ok/15 stroke-ok",
                      status === "ready" && "fill-surface stroke-accent",
                      status === "locked" && "fill-surface-2 stroke-border-strong",
                    )}
                  />
                  <text
                    textAnchor="middle"
                    className="fill-fg font-sans text-[11px] group-hover:fill-accent"
                  >
                    {node.lines.map((line, i) => (
                      <tspan
                        key={i}
                        x={node.x}
                        y={node.y + 4 + (i - (node.lines.length - 1) / 2) * 14}
                      >
                        {/* A trailing space keeps the words apart in the link's visible text. */}
                        {i < node.lines.length - 1 ? `${line} ` : line}
                      </tspan>
                    ))}
                  </text>
                  {status === "completed" && (
                    <text
                      x={node.x + NODE.w / 2 - 12}
                      y={node.y - NODE.h / 2 + 14}
                      textAnchor="middle"
                      className="fill-ok text-[12px]"
                    >
                      ✓
                    </text>
                  )}
                  {stop > 0 && (
                    <g>
                      <circle
                        cx={node.x - NODE.w / 2}
                        cy={node.y - NODE.h / 2}
                        r={10}
                        className="fill-bg stroke-fg"
                      />
                      <text
                        x={node.x - NODE.w / 2}
                        y={node.y - NODE.h / 2 + 4}
                        textAnchor="middle"
                        className="fill-fg text-[11px]"
                      >
                        {stop}
                      </text>
                    </g>
                  )}
                </g>
              </a>
            );
          })}
        </svg>
      </div>

      <ul className="flex flex-wrap gap-x-5 gap-y-1.5 text-xs text-fg-muted" aria-label="Legend">
        <li className="flex items-center gap-1.5">
          <span aria-hidden className="size-3 rounded-sm border border-ok bg-ok/15" /> Completed
        </li>
        <li className="flex items-center gap-1.5">
          <span aria-hidden className="size-3 rounded-sm border border-dashed border-accent" />{" "}
          Ready: everything it builds on is done
        </li>
        <li className="flex items-center gap-1.5">
          <span
            aria-hidden
            className="size-3 rounded-sm border border-border-strong bg-surface-2"
          />{" "}
          Not yet
        </li>
        <li className="flex items-center gap-1.5">
          <span aria-hidden className="text-fg-subtle">
            →
          </span>{" "}
          Builds on
        </li>
      </ul>
    </div>
  );
}

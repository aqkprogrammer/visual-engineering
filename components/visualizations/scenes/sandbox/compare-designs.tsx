"use client";

import { ArrowLeftRight, GitCompare, X } from "lucide-react";
import { useMemo, useState } from "react";
import { evaluate, type Goals } from "@/lib/sandbox/challenges";
import { compare, summarise, type ComparisonRow } from "@/lib/sandbox/compare";
import {
  HIT_RATIOS,
  LIMITS,
  sandboxModel,
  TIER_LABEL,
  type Architecture,
  type SandboxAction,
  type SandboxState,
  type TrafficProfile,
} from "@/lib/simulation/models/sandbox";
import { runSimulation } from "@/lib/simulation/run";
import type { Frame, ScheduledAction } from "@/lib/simulation/types";
import { cn } from "@/lib/utils/cn";
import { ActionButton, SegmentedControl, Toggle } from "../../player/controls";
import { NumberSelect, range } from "./number-select";

const SEED = 1;

const format = (row: ComparisonRow, value: number) => {
  switch (row.key) {
    case "cost":
      return String(value);
    case "availability":
      return `${(value * 100).toFixed(value > 0.999 && value < 1 ? 2 : 1)}%`;
    case "worstErrorRate":
      return `${(value * 100).toFixed(value > 0 && value < 0.1 ? 1 : 0)}%`;
    case "worstLatencyMs":
      return `${Math.round(value)} ms`;
    case "worstBacklogSeconds":
      return Number.isFinite(value) ? `${value.toFixed(1)} s` : "never drains";
  }
};

function LatencyChart({ a, b }: { a: Frame<SandboxState>[]; b: Frame<SandboxState>[] }) {
  const W = 600;
  const H = 140;
  const series = [a, b].map((frames) =>
    frames.map((f) => ({ t: f.index, ms: f.state.metrics?.latencyMs ?? 0 })),
  );
  const ticks = Math.max(a.length, b.length) - 1 || 1;
  const top = Math.max(50, ...series.flat().map((p) => p.ms));
  const points = (s: { t: number; ms: number }[]) =>
    s.map((p) => `${(p.t / ticks) * W},${H - (p.ms / top) * (H - 10)}`).join(" ");
  return (
    <figure className="space-y-1.5">
      <figcaption className="text-xs font-medium text-fg-muted">
        Latency every second (illustrative)
      </figcaption>
      <svg viewBox={`0 0 ${W} ${H}`} className="h-36 w-full" aria-hidden preserveAspectRatio="none">
        <line x1={0} y1={H} x2={W} y2={H} className="stroke-border-strong" />
        <polyline
          points={points(series[0]!)}
          fill="none"
          strokeWidth={2}
          className="stroke-accent"
          vectorEffect="non-scaling-stroke"
        />
        <polyline
          points={points(series[1]!)}
          fill="none"
          strokeWidth={2}
          strokeDasharray="5 4"
          className="stroke-data"
          vectorEffect="non-scaling-stroke"
        />
      </svg>
      <p className="flex flex-wrap gap-x-4 text-xs text-fg-muted">
        <span className="inline-flex items-center gap-1.5">
          <span aria-hidden className="h-0.5 w-4 bg-accent" /> Design A (above)
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span aria-hidden className="h-0.5 w-4 border-t-2 border-dashed border-data" /> Design B
        </span>
        <span className="text-fg-subtle">Top of chart: {Math.round(top)} ms</span>
      </p>
    </figure>
  );
}

export function CompareDesigns({
  architecture,
  traffic,
  ticks,
  actions,
  framesA,
  goals,
  onAdopt,
}: {
  architecture: Architecture;
  traffic: TrafficProfile;
  ticks: number;
  actions: ScheduledAction<SandboxAction>[];
  framesA: Frame<SandboxState>[];
  goals: Goals | null;
  onAdopt(design: Architecture): void;
}) {
  const [b, setB] = useState<Architecture | null>(null);
  const framesB = useMemo(
    () =>
      b &&
      runSimulation(sandboxModel, {
        params: { architecture: b, traffic },
        seed: SEED,
        ticks,
        actions,
      }),
    [b, traffic, ticks, actions],
  );
  const design = (change: Partial<Architecture>) =>
    setB((current) => current && { ...current, ...change });

  if (!b || !framesB) {
    return (
      <section
        aria-labelledby="compare-title"
        className="space-y-2 rounded-xl border border-border p-5"
      >
        <h2 id="compare-title" className="font-semibold">
          Compare two designs
        </h2>
        <p className="text-sm text-fg-muted">
          Run a second design under exactly the same traffic and failures — including any you inject
          above — and compare the results side by side.
        </p>
        <ActionButton onClick={() => setB({ ...architecture })}>
          <GitCompare aria-hidden className="size-3.5" /> Compare with another design
        </ActionButton>
      </section>
    );
  }

  const rows = compare(summarise(framesA, architecture), summarise(framesB, b));
  const goalsA = goals ? evaluate(framesA, architecture, goals) : null;
  const goalsB = goals ? evaluate(framesB, b, goals) : null;
  const bottleneckA = summarise(framesA, architecture).usualBottleneck;
  const bottleneckB = summarise(framesB, b).usualBottleneck;
  const winsA = rows.filter((r) => r.better === "a").length;
  const winsB = rows.filter((r) => r.better === "b").length;

  return (
    <section
      aria-labelledby="compare-title"
      className="space-y-5 rounded-xl border border-border p-5"
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="space-y-1">
          <h2 id="compare-title" className="font-semibold">
            Compare two designs
          </h2>
          <p className="text-sm text-fg-muted">
            Design A is the one above. Design B runs under the same traffic, seed and failures.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <ActionButton onClick={() => onAdopt(b)}>
            <ArrowLeftRight aria-hidden className="size-3.5" /> Use design B above
          </ActionButton>
          <ActionButton onClick={() => setB(null)}>
            <X aria-hidden className="size-3.5" /> Stop comparing
          </ActionButton>
        </div>
      </div>

      <fieldset className="space-y-4">
        <legend className="mb-1 text-xs font-medium text-fg-muted">Design B</legend>
        <div className="flex flex-wrap gap-x-6 gap-y-4">
          <NumberSelect
            label="Design B: app servers"
            value={b.appServers}
            options={range(...LIMITS.appServers)}
            onChange={(appServers) => design({ appServers })}
          />
          <NumberSelect
            label="Design B: read replicas"
            value={b.readReplicas}
            options={range(...LIMITS.readReplicas)}
            onChange={(readReplicas) => design({ readReplicas })}
          />
          <div className="space-y-2">
            <Toggle
              label="Design B: cache"
              checked={b.cache}
              onChange={(cache) => design({ cache })}
            />
            {b.cache && (
              <SegmentedControl
                label="Design B: hit ratio"
                value={String(b.cacheHitRatio)}
                options={HIT_RATIOS.map((n) => ({
                  value: String(n),
                  label: `${Math.round(n * 100)}%`,
                }))}
                onChange={(r) => design({ cacheHitRatio: Number(r) })}
              />
            )}
          </div>
          <div className="space-y-2">
            <Toggle
              label="Design B: write queue"
              checked={b.asyncWrites}
              onChange={(asyncWrites) => design({ asyncWrites })}
            />
            {b.asyncWrites && (
              <NumberSelect
                label="Design B: queue workers"
                value={b.workers}
                options={range(...LIMITS.workers)}
                onChange={(workers) => design({ workers })}
              />
            )}
          </div>
        </div>
      </fieldset>

      <p className="text-sm font-medium" aria-live="polite">
        {winsA === winsB
          ? "Neither design is better on more measures."
          : `Design ${winsA > winsB ? "A" : "B"} is better on ${Math.max(winsA, winsB)} of ${rows.length} measures.`}
      </p>

      <div
        className="relative overflow-x-auto"
        tabIndex={0}
        role="region"
        aria-label="Design comparison"
      >
        <table className="w-full min-w-[28rem] text-left text-sm">
          <thead className="text-xs text-fg-subtle">
            <tr>
              <th scope="col" className="py-1 pr-3 font-medium">
                Measure
              </th>
              <th scope="col" className="py-1 pr-3 font-medium">
                Design A
              </th>
              <th scope="col" className="py-1 font-medium">
                Design B
              </th>
            </tr>
          </thead>
          <tbody className="font-mono">
            {goalsA && goalsB && (
              <tr className="border-t border-border">
                <th scope="row" className="py-1.5 pr-3 font-sans font-normal">
                  Challenge goals met
                </th>
                {[goalsA, goalsB].map((g, i) => (
                  <td
                    key={i}
                    className={cn(
                      "py-1.5 pr-3",
                      g.every((r) => r.passed) ? "text-ok" : "text-fail",
                    )}
                  >
                    {g.filter((r) => r.passed).length} of {g.length}
                  </td>
                ))}
              </tr>
            )}
            {rows.map((row) => (
              <tr key={row.key} className="border-t border-border">
                <th scope="row" className="py-1.5 pr-3 font-sans font-normal">
                  {row.label}
                </th>
                {(["a", "b"] as const).map((side) => (
                  <td key={side} className={cn("py-1.5 pr-3", row.better === side && "text-ok")}>
                    {format(row, row[side])}
                    {row.better === side && (
                      <>
                        <span aria-hidden> ✓</span>
                        <span className="sr-only"> (better)</span>
                      </>
                    )}
                  </td>
                ))}
              </tr>
            ))}
            <tr className="border-t border-border">
              <th scope="row" className="py-1.5 pr-3 font-sans font-normal">
                Usual bottleneck
              </th>
              {[bottleneckA, bottleneckB].map((t, i) => (
                <td key={i} className="py-1.5 pr-3 font-sans">
                  {t ? TIER_LABEL[t] : "none"}
                </td>
              ))}
            </tr>
          </tbody>
        </table>
      </div>

      <LatencyChart a={framesA} b={framesB} />
    </section>
  );
}

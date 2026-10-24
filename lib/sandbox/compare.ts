/**
 * Comparing two sandbox designs run under identical conditions: the same traffic, the same seed
 * and the same scripted and injected failures.
 */
import {
  costUnits,
  type Architecture,
  type SandboxState,
  type Tier,
} from "@/lib/simulation/models/sandbox";
import type { Frame } from "@/lib/simulation/types";

export type RunSummary = {
  cost: number;
  /** Share of offered requests that succeeded over the whole run. */
  availability: number;
  worstErrorRate: number;
  worstLatencyMs: number;
  /** Longest wait for a queued write, in seconds; Infinity if the queue stopped draining. */
  worstBacklogSeconds: number;
  /** The component that was the bottleneck for the most seconds, if any. */
  usualBottleneck: Tier | null;
};

export function summarise(frames: Frame<SandboxState>[], architecture: Architecture): RunSummary {
  const metrics = frames.flatMap((f) => (f.state.metrics ? [f.state.metrics] : []));
  const totals = frames.at(-1)!.state.totals;
  const max = (pick: (m: (typeof metrics)[number]) => number) =>
    metrics.reduce((best, m) => Math.max(best, pick(m)), 0);
  const counts = new Map<Tier, number>();
  for (const m of metrics)
    if (m.bottleneck) counts.set(m.bottleneck, (counts.get(m.bottleneck) ?? 0) + 1);
  const usualBottleneck = [...counts.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] ?? null;
  return {
    cost: costUnits(architecture),
    availability: totals.offered === 0 ? 1 : 1 - totals.failed / totals.offered,
    worstErrorRate: max((m) => m.errorRate),
    worstLatencyMs: max((m) => m.latencyMs),
    worstBacklogSeconds: max((m) => m.backlogSeconds),
    usualBottleneck,
  };
}

export type Better = "a" | "b" | "tie";

export type ComparisonRow = {
  key: keyof Omit<RunSummary, "usualBottleneck">;
  label: string;
  a: number;
  b: number;
  better: Better;
};

const LOWER_IS_BETTER: Record<ComparisonRow["key"], boolean> = {
  cost: true,
  availability: false,
  worstErrorRate: true,
  worstLatencyMs: true,
  worstBacklogSeconds: true,
};

const LABELS: Record<ComparisonRow["key"], string> = {
  cost: "Cost (units)",
  availability: "Requests served",
  worstErrorRate: "Worst error rate in any second",
  worstLatencyMs: "Worst latency in any second",
  worstBacklogSeconds: "Longest wait for a queued write",
};

/** Differences smaller than this are treated as a tie, so rounding noise doesn't pick a winner. */
const TOLERANCE: Record<ComparisonRow["key"], number> = {
  cost: 0,
  availability: 0.0005,
  worstErrorRate: 0.0005,
  worstLatencyMs: 0.5,
  worstBacklogSeconds: 0.05,
};

export function compare(a: RunSummary, b: RunSummary): ComparisonRow[] {
  return (Object.keys(LABELS) as ComparisonRow["key"][]).map((key) => {
    const va = a[key];
    const vb = b[key];
    let better: Better = "tie";
    const bothInfinite = !Number.isFinite(va) && !Number.isFinite(vb);
    if (!bothInfinite && (Math.abs(va - vb) > TOLERANCE[key] || !Number.isFinite(va - vb))) {
      const aWins = LOWER_IS_BETTER[key] ? va < vb : va > vb;
      better = aWins ? "a" : "b";
    }
    return { key, label: LABELS[key], a: va, b: vb, better };
  });
}

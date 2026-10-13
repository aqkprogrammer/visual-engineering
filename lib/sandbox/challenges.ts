/**
 * Sandbox challenges: a traffic profile, scripted failures, and goals checked against every second
 * of the run. Each challenge's documented solution is verified by tests, and a brute-force search
 * in the tests confirms the cost limit leaves at least one design that passes.
 */
import {
  costUnits,
  DEFAULT_ARCHITECTURE,
  type Architecture,
  type SandboxAction,
  type SandboxState,
  type TrafficProfile,
} from "@/lib/simulation/models/sandbox";
import type { Frame, ScheduledAction } from "@/lib/simulation/types";

export type Goals = {
  maxErrorRate: number;
  maxLatencyMs: number;
  maxCost: number;
  /** Longest acceptable wait for a queued write, in seconds. */
  maxBacklogSeconds?: number;
};

export type Challenge = {
  id: string;
  title: string;
  brief: string;
  traffic: TrafficProfile;
  ticks: number;
  /** Failures the challenge injects, e.g. a cache flush during a deploy. */
  script: ScheduledAction<SandboxAction>[];
  start: Architecture;
  goals: Goals | null;
  hint: string;
};

export const FREE_PLAY_ID = "free-play";

export const CHALLENGES: Challenge[] = [
  {
    id: FREE_PLAY_ID,
    title: "Free play",
    brief:
      "No goals: choose a traffic level and an architecture, then break things with the failure buttons.",
    traffic: { base: 1000, readShare: 0.9, spikes: [] },
    ticks: 60,
    script: [],
    start: DEFAULT_ARCHITECTURE,
    goals: null,
    hint: "Watch which component turns into the bottleneck first, and what it does to latency before anything fails.",
  },
  {
    id: "launch-day",
    title: "Launch day",
    brief:
      "Normal traffic is 1,000 requests per second, 90% reads. A launch announcement triples it for 20 seconds. Stay fast and error-free through the spike without overspending.",
    traffic: { base: 1000, readShare: 0.9, spikes: [{ from: 20, to: 40, multiplier: 3 }] },
    ticks: 60,
    script: [],
    start: DEFAULT_ARCHITECTURE,
    goals: { maxErrorRate: 0.01, maxLatencyMs: 150, maxCost: 10 },
    hint: "Size app servers for the peak, not the average: latency climbs steeply as they approach 100% busy. Then look at what three times the reads do to the database.",
  },
  {
    id: "read-heavy-catalogue",
    title: "Read-heavy catalogue",
    brief:
      "A product catalogue serves 4,000 requests per second, 98% of them reads of popular pages. Keep it fast without a huge database bill.",
    traffic: { base: 4000, readShare: 0.98, spikes: [] },
    ticks: 40,
    script: [],
    start: { ...DEFAULT_ARCHITECTURE, appServers: 4 },
    goals: { maxErrorRate: 0.01, maxLatencyMs: 150, maxCost: 14 },
    hint: "Read replicas add database capacity one node at a time. A cache with a high hit ratio removes most reads altogether.",
  },
  {
    id: "checkout-surge",
    title: "Checkout surge",
    brief:
      "Checkout traffic is 60% writes. A sale doubles traffic for 15 seconds, briefly sending more writes than the database primary can take. Accept every order, and make sure no order waits more than 10 seconds to be saved.",
    traffic: { base: 1000, readShare: 0.4, spikes: [{ from: 20, to: 35, multiplier: 2 }] },
    ticks: 60,
    script: [],
    start: { ...DEFAULT_ARCHITECTURE, appServers: 5 },
    goals: { maxErrorRate: 0.01, maxLatencyMs: 150, maxCost: 12, maxBacklogSeconds: 10 },
    hint: "Replicas only take reads. When writes exceed what the primary can absorb, a queue lets you accept them now and save them as capacity allows.",
  },
  {
    id: "cold-cache",
    title: "Cold cache after a deploy",
    brief:
      "2,000 requests per second, 90% reads, behind a cache that usually answers 95% of them. A deploy flushes the cache 20 seconds in. Survive the cold start.",
    traffic: { base: 2000, readShare: 0.9, spikes: [] },
    ticks: 60,
    script: [{ tick: 20, action: { type: "flush-cache" } }],
    start: { ...DEFAULT_ARCHITECTURE, appServers: 6, cache: true, cacheHitRatio: 0.95 },
    goals: { maxErrorRate: 0.01, maxLatencyMs: 200, maxCost: 11 },
    hint: "While the cache is cold, every read reaches the database. Either the database tier can absorb that for the warm-up period, or users see errors — a cache can't be the only thing standing between you and an outage.",
  },
];

export function getChallenge(id: string): Challenge {
  return CHALLENGES.find((c) => c.id === id) ?? CHALLENGES[0]!;
}

export type GoalResult = { label: string; passed: boolean; detail: string };

const pct = (n: number) => `${(n * 100).toFixed(n < 0.1 ? 1 : 0)}%`;

/** Checks every second of a run against the challenge's goals. */
export function evaluate(
  frames: Frame<SandboxState>[],
  architecture: Architecture,
  goals: Goals,
): GoalResult[] {
  const steps = frames.flatMap((f) =>
    f.state.metrics ? [{ at: f.index, m: f.state.metrics }] : [],
  );
  const worst = <K extends "errorRate" | "latencyMs" | "backlogSeconds">(key: K) =>
    steps.reduce((best, s) => (s.m[key] > best.value ? { value: s.m[key], at: s.at } : best), {
      value: 0,
      at: 0,
    });

  const errors = worst("errorRate");
  const latency = worst("latencyMs");
  const cost = costUnits(architecture);
  const results: GoalResult[] = [
    {
      label: `Error rate at most ${pct(goals.maxErrorRate)} every second`,
      passed: errors.value <= goals.maxErrorRate,
      detail: errors.value === 0 ? "No errors" : `Worst: ${pct(errors.value)} at ${errors.at} s`,
    },
    {
      label: `Latency at most ${goals.maxLatencyMs} ms every second`,
      passed: latency.value <= goals.maxLatencyMs,
      detail: `Worst: ${Math.round(latency.value)} ms at ${latency.at} s`,
    },
    {
      label: `Cost at most ${goals.maxCost} units`,
      passed: cost <= goals.maxCost,
      detail: `This design: ${cost} units`,
    },
  ];
  if (goals.maxBacklogSeconds !== undefined) {
    const backlog = worst("backlogSeconds");
    results.push({
      label: `Queued writes wait at most ${goals.maxBacklogSeconds} s`,
      passed: backlog.value <= goals.maxBacklogSeconds,
      detail:
        backlog.value === 0
          ? "No write backlog"
          : Number.isFinite(backlog.value)
            ? `Worst: ${backlog.value.toFixed(1)} s at ${backlog.at} s`
            : `The queue stopped draining at ${backlog.at} s`,
    });
  }
  return results;
}

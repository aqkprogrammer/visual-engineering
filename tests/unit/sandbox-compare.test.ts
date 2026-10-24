import { describe, expect, it } from "vitest";
import { getChallenge } from "@/lib/sandbox/challenges";
import { compare, summarise } from "@/lib/sandbox/compare";
import { sandboxModel, type Architecture } from "@/lib/simulation/models/sandbox";
import { runSimulation } from "@/lib/simulation/run";

const challenge = getChallenge("read-heavy-catalogue");
const run = (architecture: Architecture) =>
  runSimulation(sandboxModel, {
    params: { architecture, traffic: challenge.traffic },
    seed: 1,
    ticks: challenge.ticks,
    actions: challenge.script,
  });
const starting = challenge.start;
const solved: Architecture = { ...starting, appServers: 10, cache: true, cacheHitRatio: 0.95 };

describe("comparing sandbox designs", () => {
  it("summarises a run's cost, availability and worst seconds", () => {
    const s = summarise(run(starting), starting);
    expect(s.cost).toBe(5);
    expect(s.availability).toBeGreaterThan(0);
    expect(s.availability).toBeLessThan(1);
    expect(s.worstErrorRate).toBeGreaterThan(0.01);
    expect(s.usualBottleneck).not.toBeNull();
  });

  it("finds the better design on each measure", () => {
    const rows = compare(summarise(run(starting), starting), summarise(run(solved), solved));
    const better = Object.fromEntries(rows.map((r) => [r.key, r.better]));
    expect(better.cost).toBe("a");
    expect(better.availability).toBe("b");
    expect(better.worstErrorRate).toBe("b");
    expect(better.worstLatencyMs).toBe("b");
    expect(better.worstBacklogSeconds).toBe("tie");
  });

  it("calls identical designs a tie on every measure", () => {
    const s = summarise(run(solved), solved);
    expect(compare(s, s).every((r) => r.better === "tie")).toBe(true);
  });

  it("treats a queue that never drains as worse than any finite wait", () => {
    const base = summarise(run(solved), solved);
    const rows = compare(
      { ...base, worstBacklogSeconds: Infinity },
      { ...base, worstBacklogSeconds: 4 },
    );
    expect(rows.find((r) => r.key === "worstBacklogSeconds")!.better).toBe("b");
  });
});

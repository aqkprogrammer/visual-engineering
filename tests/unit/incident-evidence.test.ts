import { describe, expect, it } from "vitest";
import { describeChart, niceMax } from "@/components/incidents/evidence-chart";
import { loadCatalog } from "@/lib/content/load";
import {
  CACHE_SCAN_TICK,
  INCIDENT_EVIDENCE,
  K8S_FAIL_TICK,
  LB_CRASH_TICK,
  QUEUE_SLOWDOWN_TICK,
  type IncidentEvidence,
} from "@/lib/incidents/evidence";
import { validateIncidents } from "@/lib/content/validate";

const average = (values: number[]) => values.reduce((a, b) => a + b, 0) / values.length;
const values = (e: IncidentEvidence, chart: string, series = 0) =>
  e.charts[chart]?.series[series]?.values ?? [];

/**
 * The incident stories make specific claims about the evidence. These tests hold the simulations
 * to those claims, so a model change can't silently turn a briefing or an answer into a lie.
 */
describe("incident evidence matches the stories", () => {
  it("is deterministic", () => {
    for (const build of Object.values(INCIDENT_EVIDENCE)) {
      expect(build()).toEqual(build());
    }
  });

  it("orders-arriving-late: arrivals stay flat, processing halves, the backlog grows", () => {
    const e = INCIDENT_EVIDENCE["orders-arriving-late"]!();
    const slowdown = QUEUE_SLOWDOWN_TICK / 10; // seconds
    // queue-rates starts at second 1; the others at second 0.
    const arriving = values(e, "queue-rates", 0);
    const processed = values(e, "queue-rates", 1);
    expect(new Set(arriving)).toEqual(new Set([10]));
    expect(average(processed.slice(2, slowdown - 1))).toBe(10);
    expect(average(processed.slice(slowdown + 2))).toBeCloseTo(5, 0);

    const depth = values(e, "queue-depth");
    const after = depth.slice(slowdown + 1);
    expect(depth.slice(0, slowdown).every((d) => d <= 3)).toBe(true);
    expect(after.every((d, i) => i === 0 || d >= (after[i - 1] ?? 0))).toBe(true);
    expect(depth.at(-1)).toBeGreaterThan(200);
    expect(values(e, "queue-busy").slice(slowdown + 1)).toEqual(expect.arrayContaining([100]));
    expect(new Set(values(e, "queue-busy").slice(slowdown + 1))).toEqual(new Set([100]));
    expect(e.logs["queue-dlq"]).toEqual([
      "dead-letter queue depth: 0",
      "messages retried: 0",
      "consumers running: 3 of 3",
    ]);
  });

  it("errors-after-a-crash: errors only between the crash and removal, about a third of traffic", () => {
    const e = INCIDENT_EVIDENCE["errors-after-a-crash"]!();
    const failed = values(e, "lb-errors", 0);
    const succeeded = values(e, "lb-errors", 1);
    const rotation = values(e, "lb-rotation");
    const crash = Math.floor((LB_CRASH_TICK - 1) / 4); // the bucket holding the crash tick
    const removed = rotation.indexOf(2);

    expect(rotation.slice(0, removed).every((n) => n === 3)).toBe(true);
    expect(rotation.slice(removed).every((n) => n === 2)).toBe(true);
    expect(failed.slice(0, crash).every((n) => n === 0)).toBe(true);
    expect(failed.slice(removed + 2).every((n) => n === 0)).toBe(true);

    const windowFailed = failed.slice(crash, removed).reduce((a, b) => a + b, 0);
    const windowTotal = windowFailed + succeeded.slice(crash, removed).reduce((a, b) => a + b, 0);
    expect(windowFailed / windowTotal).toBeGreaterThan(0.2);
    expect(windowFailed / windowTotal).toBeLessThan(0.45);

    const log = e.logs["lb-events"]!.join("\n");
    expect(log).toMatch(/1500 ms {2}app-2 crashed/);
    expect(log).toMatch(/1500 ms {2}Health check failed for app-2 \(1 of 3\)/);
    expect(log).toMatch(/2000 ms {2}Health check failed for app-2 \(2 of 3\)/);
    expect(log).toMatch(/2500 ms {2}app-2 failed 3 health checks in a row — removed from rotation/);
  });

  it("cache-collapse-at-night: the scan drives the hit ratio to zero, with misses and evictions", () => {
    const e = INCIDENT_EVIDENCE["cache-collapse-at-night"]!();
    const ratio = values(e, "cache-hit-ratio");
    expect(average(ratio.slice(40, CACHE_SCAN_TICK - 1))).toBeGreaterThan(40);
    expect(ratio.slice(CACHE_SCAN_TICK + 45).every((r) => r === 0)).toBe(true);
    expect(
      values(e, "cache-latency")
        .slice(CACHE_SCAN_TICK + 45)
        .every((l) => l === 40),
    ).toBe(true);
    const log = e.logs["cache-access-log"]!;
    expect(log.length).toBeGreaterThanOrEqual(8);
    expect(log.every((line) => /GET [A-H] {2}miss, evicted [A-H]$/.test(line))).toBe(true);
  });

  it("pods-missing-after-node-failure: one replica is missing until eviction and replacement", () => {
    const e = INCIDENT_EVIDENCE["pods-missing-after-node-failure"]!();
    const ready = values(e, "k8s-ready");
    expect(ready.slice(0, K8S_FAIL_TICK + 1).every((n) => n === 3)).toBe(true);
    expect(Math.min(...ready)).toBe(2);
    expect(ready.at(-1)).toBe(3);

    const log = e.logs["k8s-events"]!;
    const order = ["NotReady", "Toleration expired", "ReplicaSet created", "Scheduler assigned"];
    const positions = order.map((text) => log.findIndex((line) => line.includes(text)));
    expect(positions.every((p) => p >= 0)).toBe(true);
    expect([...positions].sort((a, b) => a - b)).toEqual(positions);
    // The replacement is scheduled in the same step it is created.
    const step = (text: string) => log.find((l) => l.includes(text))?.slice(0, 8);
    expect(step("ReplicaSet created")).toBe(step("Scheduler assigned"));
  });
});

describe("incident content", async () => {
  const catalog = await loadCatalog();

  it("has a validated incident for every evidence builder", () => {
    expect(catalog.incidents.map((i) => i.slug).sort()).toEqual(
      Object.keys(INCIDENT_EVIDENCE).sort(),
    );
  });

  it("rejects clues that name evidence the simulation doesn't produce", () => {
    const [incident] = catalog.incidents;
    const broken = {
      ...incident!,
      demo: "nope",
      clues: [
        ...incident!.clues,
        {
          kind: "chart" as const,
          ref: "missing",
          title: "Missing chart",
          caption: "This chart does not exist anywhere.",
        },
      ],
    };
    const evidence = { [incident!.slug]: INCIDENT_EVIDENCE[incident!.slug]!() };
    const lessons = catalog.lessons;
    expect(
      validateIncidents([broken], lessons, new Set(["message-queue"]), evidence).map(
        (i) => i.message,
      ),
    ).toEqual(['unknown demo "nope"', 'unknown chart "missing"']);
  });
});

describe("chart helpers", () => {
  it("rounds axis maxima to readable numbers", () => {
    expect([0, 3, 7, 12, 22, 225, 480].map(niceMax)).toEqual([1, 5, 10, 20, 25, 250, 500]);
  });

  it("describes each series in words", () => {
    expect(
      describeChart({
        unit: "pods",
        xUnit: "steps",
        xStep: 1,
        markers: [],
        series: [{ label: "Ready", values: [3, 2, 3] }],
      }),
    ).toBe("Ready: starts at 3, ends at 3 (range 2–3 pods)");
  });
});

import { describe, expect, it } from "vitest";
import {
  CHANGES,
  MODULES,
  OPTIONAL,
  summarise,
  type Style,
} from "@/lib/architecture/change-impact";
import {
  DEFAULT_EVENT_SOURCING_CONFIG,
  eventSourcingModel,
  replay,
  type EventSourcingAction,
  type EventSourcingConfig,
} from "@/lib/simulation/models/event-sourcing";
import {
  DEFAULT_SERVICE_CALLS_CONFIG,
  expectedSuccess,
  serviceCallsModel,
  type ServiceCallsAction,
  type ServiceCallsConfig,
} from "@/lib/simulation/models/service-calls";
import { runSimulation } from "@/lib/simulation/run";
import type { ScheduledAction } from "@/lib/simulation/types";

/** Pins the behaviour the software architecture lessons describe to the models. */

function calls(
  config: Partial<ServiceCallsConfig>,
  actions: ScheduledAction<ServiceCallsAction>[] = [],
) {
  const frames = runSimulation(serviceCallsModel, {
    params: { ...DEFAULT_SERVICE_CALLS_CONFIG, ...config },
    seed: 7,
    ticks: 100,
    actions,
  });
  const t = frames.at(-1)!.state.totals;
  return {
    success: (t.succeeded + t.degraded) / t.requests,
    degraded: t.degraded / t.requests,
    slow: t.slow / t.requests,
  };
}

describe("monoliths and microservices", () => {
  it("compounds independent failures with the number of remote calls", () => {
    expect(expectedSuccess({ ...DEFAULT_SERVICE_CALLS_CONFIG, services: 10 })).toBeCloseTo(0.99, 3);
    const one = calls({ services: 1 }).success;
    const ten = calls({ services: 10 }).success;
    expect(ten).toBeLessThan(one);
    expect(ten).toBeCloseTo(0.99, 2);
  });

  it("compounds slow responses too: ~1% for one call, ~10% for ten, chained or fanned out", () => {
    expect(calls({ services: 1 }).slow).toBeCloseTo(0.01, 2);
    expect(calls({ services: 10 }).slow).toBeCloseTo(1 - 0.99 ** 10, 2);
    expect(calls({ services: 10, topology: "fan-out" }).slow).toBeCloseTo(1 - 0.99 ** 10, 2);
  });

  it("a monolith's in-process calls don't compound like remote ones", () => {
    const monolith = calls({ architecture: "monolith", services: 10 });
    expect(monolith.slow).toBeCloseTo(0.01, 2);
    expect(monolith.success).toBeCloseTo(0.999, 3);
  });

  it("timeouts with a retry cut slow responses sharply", () => {
    expect(calls({ services: 10, timeouts: true }).slow).toBeLessThan(
      calls({ services: 10 }).slow / 5,
    );
  });

  it("isolates a failing optional service only with a fallback; a monolith can't isolate it", () => {
    const down: ScheduledAction<ServiceCallsAction>[] = [
      { tick: 1, action: { type: "fail-service", index: 4 } },
    ];
    expect(calls({ services: 5 }, down).success).toBe(0);
    const withFallback = calls({ services: 5, fallback: true }, down);
    expect(withFallback.success).toBeGreaterThan(0.99);
    expect(withFallback.degraded).toBeGreaterThan(0.99);
    expect(calls({ architecture: "monolith", services: 5 }, down).success).toBe(0);
  });

  it("timeouts turn a slow dependency into errors unless there's a fallback", () => {
    const slow: ScheduledAction<ServiceCallsAction>[] = [
      { tick: 1, action: { type: "slow-service", index: 2 } },
    ];
    const without = calls({ services: 5 }, slow);
    const withTimeouts = calls({ services: 5, timeouts: true }, slow);
    expect(without.slow).toBeGreaterThan(0.25);
    expect(withTimeouts.slow).toBeLessThan(0.01);
    expect(withTimeouts.success).toBeLessThan(without.success);
  });
});

function ledger(
  config: Partial<EventSourcingConfig>,
  actions: ScheduledAction<EventSourcingAction>[] = [],
  ticks = 40,
) {
  return runSimulation(eventSourcingModel, {
    params: { ...DEFAULT_EVENT_SOURCING_CONFIG, ...config },
    seed: 2,
    ticks,
    actions,
  });
}

describe("event sourcing and CQRS", () => {
  it("rebuilds current state by replaying the log, and the write side rejects impossible commands", () => {
    const frames = ledger({});
    const final = frames.at(-1)!.state;
    expect(replay(final.log)).toBe(final.metrics!.trueBalance);
    expect(final.rejected).toBeGreaterThan(0);
    // Sequence numbers are contiguous: events are only ever appended.
    expect(final.log.map((e) => e.seq)).toEqual(final.log.map((_, i) => i + 1));
  });

  it("a projector that keeps up shows current data; a slow one falls further behind", () => {
    expect(ledger({}).every((f) => (f.state.metrics?.lag ?? 0) === 0)).toBe(true);
    const lags = ledger({ projectorRate: 0.5 })
      .slice(1)
      .map((f) => f.state.metrics!.lag);
    expect(lags.at(-1)).toBeGreaterThan(lags[0]! + 10);
  });

  it("after a pause, read models catch up from where they stopped", () => {
    const frames = ledger({}, [
      { tick: 10, action: { type: "pause-projector" } },
      { tick: 18, action: { type: "resume-projector" } },
    ]);
    const lag = (i: number) => frames[i]!.state.metrics!.lag;
    expect(lag(17)).toBeGreaterThan(5);
    expect(frames[17]!.state.metrics!.stale).toBe(true);
    expect(lag(30)).toBe(0);
  });

  it("builds a brand-new read model from the full history", () => {
    const frames = ledger({}, [{ tick: 20, action: { type: "add-spending-projection" } }]);
    const final = frames.at(-1)!.state;
    const spending = final.projections.find((p) => p.id === "spending")!;
    expect(spending.position).toBe(final.log.at(-1)!.seq);
    const withdrawn = final.log
      .filter((e) => e.type === "MoneyWithdrawn")
      .reduce((sum, e) => sum + e.amount, 0);
    expect(Object.values(spending.byCategory).reduce((a, b) => a + b, 0)).toBe(withdrawn);
  });

  it("corrects mistakes with a compensating event, never by editing history", () => {
    const before = ledger({}, [], 14).at(-1)!.state.log;
    const after = ledger({}, [{ tick: 15, action: { type: "reverse-last-withdrawal" } }], 15).at(
      -1,
    )!.state.log;
    expect(after.slice(0, before.length)).toEqual(before);
    const reversal = after.find((e) => e.type === "WithdrawalReversed")!;
    const original = after.find((e) => e.seq === reversal.reverses)!;
    expect(original.type).toBe("MoneyWithdrawn");
    expect(reversal.amount).toBe(original.amount);
  });

  it("snapshots cut the events replayed to load the account", () => {
    const replayed = (snapshots: boolean) => ledger({ snapshots }).at(-1)!.state.totals.replayed;
    expect(replayed(true)).toBeLessThan(replayed(false) / 3);
  });
});

describe("hexagonal architecture change impact", () => {
  const styles: Style[] = ["layered", "hexagonal"];

  it("every change references real modules", () => {
    for (const change of CHANGES) {
      for (const style of styles) {
        const ids = new Set(MODULES[style].map((m) => m.id));
        for (const id of [...change.impact[style].edited, ...change.impact[style].added]) {
          expect(ids.has(id), `${change.id}/${style}/${id}`).toBe(true);
        }
        for (const id of change.impact[style].added) {
          expect(OPTIONAL[style], `${change.id}/${style}: ${id} must start absent`).toContain(id);
        }
      }
    }
  });

  it("swapping the database or adding an entry point never edits the hexagonal core", () => {
    for (const id of ["switch-database", "add-cli"] as const) {
      const change = CHANGES.find((c) => c.id === id)!;
      expect(summarise("hexagonal", change.impact.hexagonal).coreTouched, id).toBe(false);
      expect(change.impact.hexagonal.edited, id).toEqual([]);
      expect(summarise("layered", change.impact.layered).coreTouched, id).toBe(true);
    }
  });

  it("hexagonal business-logic tests never need infrastructure; layered ones always do here", () => {
    for (const change of CHANGES) {
      expect(change.impact.hexagonal.testsNeedInfrastructure, change.id).toBe(false);
      expect(change.impact.layered.testsNeedInfrastructure, change.id).toBe(true);
    }
  });

  it("a business rule change touches the core in both styles", () => {
    const rule = CHANGES.find((c) => c.id === "change-rule")!;
    for (const style of styles)
      expect(summarise(style, rule.impact[style]).coreTouched, style).toBe(true);
  });
});

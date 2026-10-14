/**
 * Event sourcing and CQRS: a bank account whose only source of truth is an append-only log of
 * events. Commands are checked against the state rebuilt from the log; accepted ones append new
 * events. Separate projections (read models) follow the log at their own pace, so queries can be
 * briefly out of date — and can be rebuilt, or new ones created, by replaying history.
 *
 * Each step is one second, with one customer command per step from a fixed, seeded script.
 */
import type { Rng } from "../rng";
import type { SimEvent, SimulationModel, StepResult } from "../types";

export const SNAPSHOT_EVERY = 10;
export const REBUILD_RATE = 6;
export const HISTORY_STEPS = 60;
export const VISIBLE_EVENTS = 12;

export type AccountEvent = {
  seq: number;
  type: "AccountOpened" | "MoneyDeposited" | "MoneyWithdrawn" | "WithdrawalReversed";
  amount: number;
  category: "salary" | "groceries" | "rent" | "travel" | "correction" | "opening";
  /** For a reversal: the event it compensates. */
  reverses?: number;
};

export type ProjectionId = "balance" | "statement" | "spending";

export type Projection = {
  id: ProjectionId;
  /** Sequence number of the last event this projection has applied. */
  position: number;
  /** Events applied per step while catching up. */
  rate: number;
  paused: boolean;
  rebuilding: boolean;
  /** The read model's data. */
  balance: number;
  lines: number;
  byCategory: Record<string, number>;
};

export type EventSourcingConfig = {
  /** Events per step the projector applies normally: 2 keeps up with one command a step; 0.5 falls behind. */
  projectorRate: number;
  snapshots: boolean;
};

export const DEFAULT_EVENT_SOURCING_CONFIG: EventSourcingConfig = {
  projectorRate: 2,
  snapshots: true,
};

export type EventSourcingState = {
  tick: number;
  config: EventSourcingConfig;
  log: AccountEvent[];
  projections: Projection[];
  /** Commands rejected because the rebuilt state didn't allow them. */
  rejected: number;
  /** Events replayed to load the account for the last command (with snapshots, fewer). */
  lastRehydration: number;
  /** A carried fraction so a rate of 0.5 applies one event every two steps. */
  carry: Record<ProjectionId, number>;
  metrics: {
    trueBalance: number;
    readBalance: number;
    lag: number;
    stale: boolean;
  } | null;
  history: { at: number; lag: number }[];
  totals: { staleReads: number; reads: number; replayed: number };
};

export type EventSourcingAction =
  | { type: "pause-projector" }
  | { type: "resume-projector" }
  | { type: "rebuild-projection"; projection: ProjectionId }
  | { type: "add-spending-projection" }
  | { type: "reverse-last-withdrawal" };

export const PROJECTION_LABEL: Record<ProjectionId, string> = {
  balance: "Balance view",
  statement: "Statement view",
  spending: "Spending by category",
};

function emptyProjection(id: ProjectionId, rate: number): Projection {
  return {
    id,
    position: 0,
    rate,
    paused: false,
    rebuilding: false,
    balance: 0,
    lines: 0,
    byCategory: {},
  };
}

/** Folds one event into a state: the same function serves the write side and every projection. */
export function applyEvent(balance: number, event: AccountEvent): number {
  switch (event.type) {
    case "AccountOpened":
    case "MoneyDeposited":
    case "WithdrawalReversed":
      return balance + event.amount;
    case "MoneyWithdrawn":
      return balance - event.amount;
  }
}

/** Replays a log to the current balance — "rehydration". */
export function replay(log: readonly AccountEvent[], upTo = Infinity): number {
  return log.filter((e) => e.seq <= upTo).reduce(applyEvent, 0);
}

function project(p: Projection, event: AccountEvent): Projection {
  const next = { ...p, position: event.seq, byCategory: { ...p.byCategory } };
  next.balance = applyEvent(p.balance, event);
  next.lines = p.lines + 1;
  if (event.type === "MoneyWithdrawn") {
    next.byCategory[event.category] = (next.byCategory[event.category] ?? 0) + event.amount;
  } else if (event.type === "WithdrawalReversed") {
    next.byCategory[event.category] = (next.byCategory[event.category] ?? 0) - event.amount;
  }
  return next;
}

const COMMANDS: {
  type: "deposit" | "withdraw";
  amount: number;
  category: AccountEvent["category"];
}[] = [
  { type: "deposit", amount: 2000, category: "salary" },
  { type: "withdraw", amount: 900, category: "rent" },
  { type: "withdraw", amount: 80, category: "groceries" },
  { type: "withdraw", amount: 45, category: "groceries" },
  { type: "withdraw", amount: 300, category: "travel" },
  { type: "withdraw", amount: 60, category: "groceries" },
  { type: "withdraw", amount: 1200, category: "travel" },
  { type: "deposit", amount: 150, category: "salary" },
];

function tick(state: EventSourcingState, rng: Rng): StepResult<EventSourcingState> {
  const at = state.tick + 1;
  const events: SimEvent[] = [];
  const log = [...state.log];
  let rejected = state.rejected;

  // Write side: load the account by replaying its events (from the latest snapshot, if enabled),
  // check the command against that state, then append.
  const command = COMMANDS[(at - 1) % COMMANDS.length]!;
  const amount = Math.round(command.amount * (0.8 + rng.next() * 0.4));
  const lastSeq = log.at(-1)?.seq ?? 0;
  const snapshotAt = state.config.snapshots
    ? Math.floor(lastSeq / SNAPSHOT_EVERY) * SNAPSHOT_EVERY
    : 0;
  const lastRehydration = lastSeq - snapshotAt;
  const balance = replay(log);
  if (command.type === "withdraw" && amount > balance) {
    rejected += 1;
    events.push({
      at,
      tone: "warning",
      message: `Withdrawal of ${amount} rejected: the balance is ${balance}. No event recorded.`,
    });
  } else {
    log.push({
      seq: lastSeq + 1,
      type: command.type === "deposit" ? "MoneyDeposited" : "MoneyWithdrawn",
      amount,
      category: command.category,
    });
  }

  // Read side: each projection applies events from the log at its own pace.
  const carry = { ...state.carry };
  const projections = state.projections.map((p) => {
    if (p.paused) return p;
    const rate = p.rebuilding ? REBUILD_RATE : p.rate;
    carry[p.id] = (carry[p.id] ?? 0) + rate;
    let budget = Math.floor(carry[p.id]!);
    carry[p.id]! -= budget;
    let next = p;
    while (budget > 0) {
      const event = log.find((e) => e.seq === next.position + 1);
      if (!event) break;
      next = project(next, event);
      budget--;
    }
    if (next.rebuilding && next.position === (log.at(-1)?.seq ?? 0)) {
      next = { ...next, rebuilding: false };
      events.push({
        at,
        tone: "success",
        message: `${PROJECTION_LABEL[p.id]} caught up with all ${next.position} events`,
      });
    }
    return next;
  });

  const trueBalance = replay(log);
  const balanceView = projections.find((p) => p.id === "balance")!;
  const lag = (log.at(-1)?.seq ?? 0) - balanceView.position;
  const stale = balanceView.balance !== trueBalance;

  return {
    state: {
      ...state,
      tick: at,
      log,
      projections,
      rejected,
      lastRehydration,
      carry,
      metrics: { trueBalance, readBalance: balanceView.balance, lag, stale },
      history: [...state.history, { at, lag }].slice(-HISTORY_STEPS),
      totals: {
        staleReads: state.totals.staleReads + (stale ? 1 : 0),
        reads: state.totals.reads + 1,
        replayed: state.totals.replayed + lastRehydration,
      },
    },
    events,
  };
}

function apply(
  state: EventSourcingState,
  action: EventSourcingAction,
): StepResult<EventSourcingState> {
  const at = state.tick + 1;
  const events: SimEvent[] = [];
  let projections = state.projections;
  let log = state.log;
  const update = (id: ProjectionId, change: (p: Projection) => Projection) => {
    projections = projections.map((p) => (p.id === id ? change(p) : p));
  };

  switch (action.type) {
    case "pause-projector":
      projections = projections.map((p) => ({ ...p, paused: true }));
      events.push({
        at,
        tone: "warning",
        message: "Projector stopped — events keep being recorded, but read models stop updating",
      });
      break;
    case "resume-projector":
      projections = projections.map((p) => ({ ...p, paused: false }));
      events.push({
        at,
        tone: "success",
        message: "Projector restarted — read models catch up from where they stopped",
      });
      break;
    case "rebuild-projection":
      update(action.projection, (p) => ({ ...emptyProjection(p.id, p.rate), rebuilding: true }));
      events.push({
        at,
        tone: "info",
        message: `${PROJECTION_LABEL[action.projection]} wiped and rebuilding by replaying the log from event 1`,
      });
      break;
    case "add-spending-projection":
      if (projections.some((p) => p.id === "spending")) break;
      projections = [
        ...projections,
        { ...emptyProjection("spending", state.config.projectorRate), rebuilding: true },
      ];
      events.push({
        at,
        tone: "info",
        message: "New read model: spending by category, built from the full history of events",
      });
      break;
    case "reverse-last-withdrawal": {
      const reversed = new Set(log.filter((e) => e.reverses).map((e) => e.reverses));
      const target = [...log]
        .reverse()
        .find((e) => e.type === "MoneyWithdrawn" && !reversed.has(e.seq));
      if (!target) break;
      const seq = (log.at(-1)?.seq ?? 0) + 1;
      log = [
        ...log,
        {
          seq,
          type: "WithdrawalReversed",
          amount: target.amount,
          category: target.category,
          reverses: target.seq,
        },
      ];
      events.push({
        at,
        tone: "info",
        message: `Event ${target.seq} was a mistake: appended event ${seq}, reversing it. Event ${target.seq} stays in the log.`,
      });
      break;
    }
  }
  return { state: { ...state, projections, log }, events };
}

function describe(state: EventSourcingState): string {
  const m = state.metrics;
  if (!m) return "Ready. Press Play: each second a customer deposits or withdraws money.";
  const count = state.log.length;
  return m.stale
    ? `${count} events recorded. The balance view shows ${m.readBalance} but the account holds ${m.trueBalance}: it is ${m.lag} event${m.lag === 1 ? "" : "s"} behind.`
    : `${count} events recorded. The balance view is up to date: ${m.trueBalance}.`;
}

export const eventSourcingModel: SimulationModel<
  EventSourcingState,
  EventSourcingConfig,
  EventSourcingAction
> = {
  id: "event-sourcing",
  init(config) {
    return {
      tick: 0,
      config,
      log: [{ seq: 1, type: "AccountOpened", amount: 100, category: "opening" }],
      projections: [
        emptyProjection("balance", config.projectorRate),
        emptyProjection("statement", config.projectorRate),
      ],
      rejected: 0,
      lastRehydration: 0,
      carry: { balance: 0, statement: 0, spending: 0 },
      metrics: null,
      history: [],
      totals: { staleReads: 0, reads: 0, replayed: 0 },
    };
  },
  tick,
  apply,
  describe,
};

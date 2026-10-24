/**
 * Teaching model of a client calling a dependency through timeouts, retries and an optional
 * circuit breaker — and how retries can keep an overloaded dependency down after the original
 * problem has gone (a retry storm).
 *
 * Simplifications (shown to learners):
 * - One step is 100 ms. Requests are counted as fractional amounts per step (a fluid model).
 * - The dependency serves its queue first-in, first-out at a fixed capacity. Work for requests
 *   whose client has already timed out is still done, and wasted.
 * - Backoff delays are spread evenly over their range ("full jitter").
 * - The circuit breaker opens when more than half of the last second's calls failed, stays open
 *   for 3 s, then lets a tenth of calls through as trials.
 */
import type { Rng } from "../rng";
import type { SimEvent, SimulationModel, StepResult } from "../types";

export const STEP_MS = 100;
export const ARRIVALS_PER_STEP = 10; // 100 requests per second
export const CAPACITY_PER_STEP = 15; // 150 per second
export const DEGRADED_CAPACITY = 5; // 50 per second while slowed
export const SLOW_STEPS = 50; // 5 seconds
export const MAX_ATTEMPTS = 4; // the first try plus 3 retries
export const BACKOFF_BASE_STEPS = 2; // 200 ms, doubling per attempt
export const BUDGET_RATIO = 0.1; // retries may add at most 10% to fresh requests
export const BUDGET_CAP = 50;
export const BREAKER = { windowSteps: 10, threshold: 0.5, openSteps: 30, trialShare: 0.1 } as const;

export type RetryPolicy = "none" | "immediate" | "backoff" | "budget";
export type TimeoutChoice = "short" | "long";
export const TIMEOUT_STEPS: Record<TimeoutChoice, number> = { short: 10, long: 30 };

export type RetriesConfig = { retries: RetryPolicy; timeout: TimeoutChoice; breaker: boolean };
export const DEFAULT_RETRIES_CONFIG: RetriesConfig = {
  retries: "immediate",
  timeout: "short",
  breaker: false,
};

type Cohort = { count: number; enqueuedAt: number; attempt: number; timedOut: boolean };
type BreakerState = "closed" | "open" | "half-open";

export type RetriesState = {
  tick: number;
  config: RetriesConfig;
  capacity: number;
  slowUntil: number | null;
  queue: Cohort[];
  /** Retries waiting to be sent: step → count per attempt number. */
  scheduled: Record<number, number[]>;
  budget: number;
  breaker: BreakerState;
  breakerUntil: number;
  /** Outcomes of calls in recent steps, for the breaker: [succeeded, failed]. */
  recent: [number, number][];
  metrics: {
    fresh: number;
    retries: number;
    /** Calls that reached the dependency this step. */
    sent: number;
    rejectedByBreaker: number;
    served: number;
    wasted: number;
    succeeded: number;
    /** Requests that finally failed for the user this step. */
    failed: number;
    latencyMs: number;
    queue: number;
  } | null;
  totals: { requests: number; succeeded: number; failed: number; sent: number; wasted: number };
};

export type RetriesAction = { type: "slow-dependency" };

const total = (q: Cohort[]) => q.reduce((n, c) => n + c.count, 0);

function clone(s: RetriesState): RetriesState {
  return {
    ...s,
    config: { ...s.config },
    queue: s.queue.map((c) => ({ ...c })),
    scheduled: Object.fromEntries(Object.entries(s.scheduled).map(([k, v]) => [k, [...v]])),
    recent: s.recent.map((r) => [...r] as [number, number]),
    totals: { ...s.totals },
  };
}

function schedule(s: RetriesState, attempt: number, count: number, from: number) {
  if (count <= 0) return;
  const add = (tick: number, amount: number) => {
    const slot = (s.scheduled[tick] ??= Array(MAX_ATTEMPTS).fill(0));
    slot[attempt] = (slot[attempt] ?? 0) + amount;
  };
  if (s.config.retries === "backoff") {
    // Full jitter: spread evenly over 1 … base × 2^(attempt − 1) steps.
    const spread = BACKOFF_BASE_STEPS * 2 ** (attempt - 1);
    for (let d = 1; d <= spread; d++) add(from + d, count / spread);
  } else {
    add(from + 1, count);
  }
}

/** A failed attempt: retry it if the policy allows, otherwise the user sees an error. */
function onFailure(s: RetriesState, count: number, attempt: number): number {
  const policy = s.config.retries;
  if (policy === "none" || attempt + 1 >= MAX_ATTEMPTS) return count;
  let retry = count;
  if (policy === "budget") {
    retry = Math.min(count, s.budget);
    s.budget -= retry;
  }
  schedule(s, attempt + 1, retry, s.tick);
  return count - retry;
}

function tick(state: RetriesState, _rng: Rng): StepResult<RetriesState> {
  const s = clone(state);
  const events: SimEvent[] = [];
  s.tick += 1;
  const timeoutSteps = TIMEOUT_STEPS[s.config.timeout];

  if (s.slowUntil !== null && s.tick >= s.slowUntil) {
    s.slowUntil = null;
    s.capacity = CAPACITY_PER_STEP;
    events.push({
      at: s.tick,
      tone: "success",
      message: "The dependency is back to full speed — the original problem is over",
    });
  }

  // Requests to send this step: new ones plus retries that are due.
  const due = s.scheduled[s.tick] ?? [];
  delete s.scheduled[s.tick];
  const outgoing: number[] = [ARRIVALS_PER_STEP, ...due.slice(1)];
  const retries = due.slice(1).reduce((a, b) => a + b, 0);
  s.totals.requests += ARRIVALS_PER_STEP;
  s.budget = Math.min(BUDGET_CAP, s.budget + ARRIVALS_PER_STEP * BUDGET_RATIO);

  let failed = 0;
  let succeeded = 0;
  let succeededWait = 0;
  let rejected = 0;

  // Circuit breaker: open rejects everything; half-open lets a share through as trials.
  if (s.config.breaker && s.breaker === "open" && s.tick >= s.breakerUntil) {
    s.breaker = "half-open";
    events.push({
      at: s.tick,
      tone: "info",
      message: "Circuit breaker half-open: letting a few trial calls through",
    });
  }
  const passShare =
    !s.config.breaker || s.breaker === "closed"
      ? 1
      : s.breaker === "half-open"
        ? BREAKER.trialShare
        : 0;
  let sent = 0;
  outgoing.forEach((count, attempt) => {
    if (count <= 0) return;
    const through = count * passShare;
    const blocked = count - through;
    if (blocked > 0) {
      // Rejected fast. Retrying into an open breaker is pointless, so these fail for the user.
      rejected += blocked;
      failed += blocked;
    }
    if (through > 0) {
      s.queue.push({ count: through, enqueuedAt: s.tick, attempt, timedOut: false });
      sent += through;
    }
  });

  // The dependency works through its queue.
  let capacity = s.capacity;
  let wasted = 0;
  let callOk = 0;
  let callFailed = 0;
  while (capacity > 1e-9 && s.queue.length > 0) {
    const head = s.queue[0]!;
    const take = Math.min(head.count, capacity);
    capacity -= take;
    head.count -= take;
    if (head.timedOut) wasted += take;
    else {
      succeeded += take;
      succeededWait += take * (s.tick - head.enqueuedAt + 1);
      callOk += take;
    }
    if (head.count <= 1e-9) s.queue.shift();
  }

  // Calls still waiting past the timeout fail for their client (but stay queued, as real work does).
  for (const c of s.queue) {
    if (!c.timedOut && s.tick - c.enqueuedAt >= timeoutSteps) {
      c.timedOut = true;
      callFailed += c.count;
      failed += onFailure(s, c.count, c.attempt);
    }
  }
  // Drop queued work nobody is waiting for once it is far too old (the server's own timeout).
  s.queue = s.queue.filter((c) => !(c.timedOut && s.tick - c.enqueuedAt > timeoutSteps * 3));

  // Breaker bookkeeping.
  s.recent.push([callOk, callFailed]);
  if (s.recent.length > BREAKER.windowSteps) s.recent.shift();
  if (s.config.breaker) {
    const [ok, bad] = s.recent.reduce(([a, b], [x, y]) => [a + x, b + y], [0, 0]);
    if (s.breaker === "closed" && bad > 0 && bad / (ok + bad) > BREAKER.threshold) {
      s.breaker = "open";
      s.breakerUntil = s.tick + BREAKER.openSteps;
      events.push({
        at: s.tick,
        tone: "warning",
        message: "Circuit breaker opened: calls fail fast instead of piling onto the dependency",
      });
    } else if (s.breaker === "half-open") {
      if (callFailed > 0) {
        s.breaker = "open";
        s.breakerUntil = s.tick + BREAKER.openSteps;
      } else if (callOk > 0) {
        s.breaker = "closed";
        s.recent = [];
        events.push({
          at: s.tick,
          tone: "success",
          message: "Trial calls succeeded: circuit breaker closed",
        });
      }
    }
  }

  s.metrics = {
    fresh: ARRIVALS_PER_STEP,
    retries,
    sent,
    rejectedByBreaker: rejected,
    served: s.capacity - capacity,
    wasted,
    succeeded,
    failed,
    latencyMs: succeeded > 0 ? (succeededWait / succeeded) * STEP_MS : 0,
    queue: total(s.queue),
  };
  s.totals.succeeded += succeeded;
  s.totals.failed += failed;
  s.totals.sent += sent;
  s.totals.wasted += wasted;
  return { state: s, events };
}

function apply(state: RetriesState, action: RetriesAction): StepResult<RetriesState> {
  const s = clone(state);
  if (action.type === "slow-dependency" && s.slowUntil === null) {
    s.capacity = DEGRADED_CAPACITY;
    s.slowUntil = s.tick + 1 + SLOW_STEPS;
    return {
      state: s,
      events: [
        {
          at: s.tick + 1,
          tone: "error",
          message: `The dependency slows to a third of its capacity for ${(SLOW_STEPS * STEP_MS) / 1000} s`,
        },
      ],
    };
  }
  return { state: s, events: [] };
}

export const retriesModel: SimulationModel<RetriesState, RetriesConfig, RetriesAction> = {
  id: "retries",
  init(config) {
    return {
      tick: 0,
      config,
      capacity: CAPACITY_PER_STEP,
      slowUntil: null,
      queue: [],
      scheduled: {},
      budget: BUDGET_CAP,
      breaker: "closed",
      breakerUntil: 0,
      recent: [],
      metrics: null,
      totals: { requests: 0, succeeded: 0, failed: 0, sent: 0, wasted: 0 },
    };
  },
  tick,
  apply,
  describe(s) {
    const m = s.metrics;
    if (!m) return "Press play to start sending requests.";
    const ok = m.succeeded + m.failed > 0 ? m.succeeded / (m.succeeded + m.failed) : 1;
    return `${(s.tick * STEP_MS) / 1000} s: ${Math.round(m.sent * 10)} calls/s reach the dependency (capacity ${s.capacity * 10}/s); ${Math.round(ok * 100)}% of finished requests succeed${s.config.breaker ? `; breaker ${s.breaker}` : ""}.`;
  },
};

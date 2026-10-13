/**
 * Teaching model of a message queue between producers and a pool of consumers.
 *
 * Simplifications (shown to learners):
 * - One tick is 100 ms. Each consumer handles one message at a time.
 * - Normal messages take 2 ticks to process (5 per second per consumer); a slow downstream
 *   dependency triples that.
 * - "Poison" messages always fail. A failed message goes back to the end of the queue; after
 *   3 receives it moves to the dead-letter queue (like Amazon SQS's maxReceiveCount).
 * - A bounded queue rejects new messages when full — the producer must back off and retry later.
 * - No partitions, ordering guarantees, visibility timeouts or consumer crashes.
 */
import type { Rng } from "../rng";
import type { SimEvent, SimulationModel, StepResult } from "../types";

export const TICK_MS = 100;
export const BASE_WORK = 2;
export const MAX_RECEIVES = 3;
export const BOUNDED_CAPACITY = 40;
export const RATES = { low: 4, normal: 10, spike: 25 } as const;
export type RateLevel = keyof typeof RATES;

export type QueueConfig = {
  rate: RateLevel;
  consumers: number;
  slowDownstream: boolean;
  bounded: boolean;
  poisonShare: number;
};

export const DEFAULT_QUEUE_CONFIG: QueueConfig = {
  rate: "normal",
  consumers: 3,
  slowDownstream: false,
  bounded: false,
  poisonShare: 0,
};

export type Message = {
  id: number;
  enqueuedAt: number;
  createdAt: number;
  receives: number;
  poison: boolean;
};
export type Consumer = { id: number; message: Message | null; remaining: number };

export type QueueState = {
  tick: number;
  config: QueueConfig;
  queue: Message[];
  consumers: Consumer[];
  dlq: Message[];
  nextId: number;
  completed: { at: number; latencyTicks: number }[];
  totals: { produced: number; completed: number; rejected: number; retried: number };
  rejectedNow: number;
};

export type QueueAction = { type: "configure"; config: Partial<QueueConfig> };

const clone = <T>(value: T): T => structuredClone(value);

export function oldestAgeTicks(state: QueueState): number {
  return state.queue.length === 0
    ? 0
    : state.tick - Math.min(...state.queue.map((m) => m.createdAt));
}

/** Messages completed per second over the last second. */
export function throughput(state: QueueState): number {
  return state.completed.filter((c) => c.at > state.tick - 10).length;
}

export const capacityPerSecond = (config: QueueConfig) =>
  (config.consumers * 1000) / (TICK_MS * BASE_WORK * (config.slowDownstream ? 3 : 1));

function resizeConsumers(s: QueueState) {
  while (s.consumers.length < s.config.consumers) {
    s.consumers.push({ id: (s.consumers.at(-1)?.id ?? 0) + 1, message: null, remaining: 0 });
  }
  // Removed consumers finish nothing: their in-flight message returns to the front of the queue.
  while (s.consumers.length > s.config.consumers) {
    const removed = s.consumers.pop()!;
    if (removed.message) s.queue.unshift(removed.message);
  }
}

function tick(state: QueueState, rng: Rng): StepResult<QueueState> {
  const s = clone(state);
  const events: SimEvent[] = [];
  s.tick += 1;
  s.rejectedNow = 0;

  // Producers.
  const rate = RATES[s.config.rate] / 10;
  const arrivals = Math.floor(rate) + (rng.chance(rate - Math.floor(rate)) ? 1 : 0);
  for (let i = 0; i < arrivals; i++) {
    if (s.config.bounded && s.queue.length >= BOUNDED_CAPACITY) {
      s.rejectedNow += 1;
      s.totals.rejected += 1;
      continue;
    }
    s.queue.push({
      id: s.nextId++,
      enqueuedAt: s.tick,
      createdAt: s.tick,
      receives: 0,
      poison: rng.chance(s.config.poisonShare),
    });
    s.totals.produced += 1;
  }
  if (s.rejectedNow > 0) {
    events.push({
      at: s.tick,
      tone: "warning",
      message: `Queue full — ${s.rejectedNow} message${s.rejectedNow === 1 ? "" : "s"} rejected; producers must back off`,
    });
  }

  // Consumers.
  const work = BASE_WORK * (s.config.slowDownstream ? 3 : 1);
  for (const consumer of s.consumers) {
    if (consumer.message) {
      consumer.remaining -= 1;
      if (consumer.remaining <= 0) {
        const message = consumer.message;
        consumer.message = null;
        if (message.poison) {
          if (message.receives >= MAX_RECEIVES) {
            s.dlq.push(message);
            events.push({
              at: s.tick,
              tone: "error",
              message: `Message #${message.id} failed ${MAX_RECEIVES} times — moved to the dead-letter queue`,
            });
          } else {
            s.queue.push({ ...message, enqueuedAt: s.tick });
            s.totals.retried += 1;
          }
        } else {
          s.totals.completed += 1;
          s.completed.push({ at: s.tick, latencyTicks: s.tick - message.createdAt });
        }
      }
    }
    if (!consumer.message && s.queue.length > 0) {
      const next = s.queue.shift()!;
      consumer.message = { ...next, receives: next.receives + 1 };
      consumer.remaining = work;
    }
  }
  s.completed = s.completed.filter((c) => c.at > s.tick - 50);
  return { state: s, events };
}

function apply(state: QueueState, action: QueueAction): StepResult<QueueState> {
  const s = clone(state);
  const events: SimEvent[] = [];
  const at = s.tick + 1;
  const before = s.config;
  s.config = { ...s.config, ...action.config };
  resizeConsumers(s);
  if (before.rate !== s.config.rate)
    events.push({
      at,
      tone: "info",
      message: `Producers now send ${RATES[s.config.rate]} messages per second`,
    });
  if (before.consumers !== s.config.consumers) {
    events.push({
      at,
      tone: "info",
      message: `${s.config.consumers} consumer${s.config.consumers === 1 ? "" : "s"} — capacity ${capacityPerSecond(s.config).toFixed(1)} messages per second`,
    });
  }
  if (before.slowDownstream !== s.config.slowDownstream) {
    events.push({
      at,
      tone: s.config.slowDownstream ? "warning" : "success",
      message: s.config.slowDownstream
        ? "Downstream database slowed down — each message takes 3× longer"
        : "Downstream back to normal speed",
    });
  }
  if (before.bounded !== s.config.bounded) {
    events.push({
      at,
      tone: "info",
      message: s.config.bounded
        ? `Queue bounded at ${BOUNDED_CAPACITY} messages`
        : "Queue unbounded",
    });
  }
  if (before.poisonShare !== s.config.poisonShare) {
    events.push({
      at,
      tone: "info",
      message: `${Math.round(s.config.poisonShare * 100)}% of new messages are malformed (poison)`,
    });
  }
  return { state: s, events };
}

export const queueModel: SimulationModel<QueueState, QueueConfig, QueueAction> = {
  id: "message-queue",
  init(config) {
    const s: QueueState = {
      tick: 0,
      config,
      queue: [],
      consumers: [],
      dlq: [],
      nextId: 1,
      completed: [],
      totals: { produced: 0, completed: 0, rejected: 0, retried: 0 },
      rejectedNow: 0,
    };
    resizeConsumers(s);
    return s;
  },
  tick,
  apply,
  describe(state) {
    const age = (oldestAgeTicks(state) * TICK_MS) / 1000;
    return [
      `${((state.tick * TICK_MS) / 1000).toFixed(1)} s`,
      `in ${RATES[state.config.rate]}/s, out ${throughput(state)}/s`,
      `${state.queue.length} waiting`,
      state.queue.length === 0 ? "queue empty" : `oldest waiting ${age.toFixed(1)} s`,
      state.dlq.length > 0 ? `${state.dlq.length} in the dead-letter queue` : "",
    ]
      .filter(Boolean)
      .join(" · ");
  },
};

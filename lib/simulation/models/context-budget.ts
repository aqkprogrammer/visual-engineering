/**
 * Teaching model of a language-model request's context window: what goes in, what has to give
 * when it doesn't fit, and what that costs.
 *
 * Simplifications (shown to learners):
 * - Token counts for every part are fixed, illustrative numbers; real counts come from the
 *   provider's tokenizer.
 * - The reserved answer space is treated as a hard limit. Some APIs reject a request whose input
 *   plus maximum output exceeds the window; others accept it and stop the answer early.
 * - The summary is a fixed 500 tokens that keeps the order number but not exact wording.
 * - Prices are illustrative, not any provider's. Cached input is billed at a tenth of the
 *   normal input price, as some providers do for most of their models.
 */

export const WINDOWS = [8_000, 32_000, 128_000] as const;
export const TOOL_COUNTS = [0, 4, 16] as const;
export const DOC_COUNTS = [0, 3, 8] as const;
export const TURN_COUNTS = [4, 12, 40] as const;
export const RESERVES = [1_000, 4_000] as const;

export const SIZES = {
  system: 900,
  perTool: 400,
  perDoc: 900,
  question: 80,
  summary: 500,
  answer: 400,
} as const;

/** Turns (one customer message and one reply) kept verbatim when older ones are summarised. */
export const KEEP_RECENT_TURNS = 4;
export const CACHED_PRICE_FACTOR = 0.1;

export type Strategy = "reject" | "drop-oldest" | "summarise" | "fewer-docs";

export const PRICE_TIERS = {
  small: { label: "Small model", input: 0.2, output: 0.8 },
  medium: { label: "Medium model", input: 2, output: 8 },
  large: { label: "Large model", input: 10, output: 40 },
} as const;
export type PriceTier = keyof typeof PRICE_TIERS;

export type BudgetParams = {
  window: number;
  tools: number;
  docs: number;
  turns: number;
  reserve: number;
  strategy: Strategy;
  cachePrefix: boolean;
  tier: PriceTier;
};

export const DEFAULT_BUDGET_PARAMS: BudgetParams = {
  window: 8_000,
  tools: 4,
  docs: 3,
  turns: 12,
  reserve: 1_000,
  strategy: "reject",
  cachePrefix: false,
  tier: "medium",
};

export type Turn = { index: number; tokens: number; note?: string };

/** Earlier turns of a support chat about a missing refund. Turn 1 and 2 carry the key facts. */
export function conversation(turns: number): Turn[] {
  return Array.from({ length: turns }, (_, i) => {
    if (i === 0) return { index: 1, tokens: 220, note: "Customer gives order number A-7731" };
    if (i === 1) return { index: 2, tokens: 260, note: "Customer pastes the error: E1042" };
    return { index: i + 1, tokens: 180 + ((i * 137) % 340) };
  });
}

export const DOCS = [
  "Refund policy",
  "Card decline codes",
  "Order cancellation",
  "Payment methods",
  "Fees and exchange rates",
  "Account security",
  "Premium subscription",
  "Contacting support",
];

export type PartKind = "system" | "tools" | "summary" | "history" | "docs" | "question";
export type Part = { kind: PartKind; label: string; tokens: number };

export type RequestPlan = {
  status: "sent" | "trimmed" | "rejected";
  parts: Part[];
  input: number;
  /** Input tokens allowed once the answer space is reserved. */
  budget: number;
  keptTurns: Turn[];
  droppedTurns: number;
  summarised: boolean;
  keptDocs: number;
  checks: { order: boolean; code: boolean; policy: boolean };
  cost: number;
  cachedTokens: number;
};

function assemble(turns: Turn[], summarised: boolean, docs: number, tools: number): Part[] {
  const parts: Part[] = [{ kind: "system", label: "System prompt", tokens: SIZES.system }];
  if (tools > 0) {
    parts.push({
      kind: "tools",
      label: `${tools} tool definitions`,
      tokens: tools * SIZES.perTool,
    });
  }
  if (summarised)
    parts.push({ kind: "summary", label: "Summary of earlier turns", tokens: SIZES.summary });
  if (turns.length > 0) {
    parts.push({
      kind: "history",
      label: `${turns.length} earlier turn${turns.length === 1 ? "" : "s"}`,
      tokens: turns.reduce((n, t) => n + t.tokens, 0),
    });
  }
  if (docs > 0) {
    parts.push({
      kind: "docs",
      label: `${docs} retrieved document${docs === 1 ? "" : "s"}`,
      tokens: docs * SIZES.perDoc,
    });
  }
  parts.push({ kind: "question", label: "New question", tokens: SIZES.question });
  return parts;
}

const total = (parts: Part[]) => parts.reduce((n, p) => n + p.tokens, 0);

/** Plans one request with `history` earlier turns, applying the strategy if it doesn't fit. */
export function planRequest(params: BudgetParams, history: number = params.turns): RequestPlan {
  const budget = params.window - params.reserve;
  let turns = conversation(history);
  let summarised = false;
  let docs = params.docs;
  let parts = assemble(turns, summarised, docs, params.tools);
  const over = () => total(parts) > budget;
  let trimmed = false;

  if (over()) {
    trimmed = true;
    if (params.strategy === "drop-oldest") {
      while (over() && turns.length > 0) {
        turns = turns.slice(1);
        parts = assemble(turns, summarised, docs, params.tools);
      }
    } else if (params.strategy === "summarise" && turns.length > KEEP_RECENT_TURNS) {
      turns = turns.slice(-KEEP_RECENT_TURNS);
      summarised = true;
      parts = assemble(turns, summarised, docs, params.tools);
    } else if (params.strategy === "fewer-docs") {
      while (over() && docs > 0) {
        docs -= 1;
        parts = assemble(turns, summarised, docs, params.tools);
      }
    }
  }
  const rejected = over();
  const input = total(parts);
  const kept = new Set(turns.map((t) => t.index));
  const checks = rejected
    ? { order: false, code: false, policy: false }
    : { order: kept.has(1) || summarised, code: kept.has(2), policy: docs > 0 };

  const price = PRICE_TIERS[params.tier];
  const cachedTokens = params.cachePrefix ? SIZES.system + params.tools * SIZES.perTool : 0;
  const cost = rejected
    ? 0
    : ((input - cachedTokens) * price.input +
        cachedTokens * price.input * CACHED_PRICE_FACTOR +
        SIZES.answer * price.output) /
      1_000_000;

  return {
    status: rejected ? "rejected" : trimmed ? "trimmed" : "sent",
    parts,
    input,
    budget,
    keptTurns: turns,
    droppedTurns: history - turns.length,
    summarised,
    keptDocs: docs,
    checks,
    cost,
    cachedTokens,
  };
}

/**
 * Cost of the whole conversation: every turn re-sends the history so far, so the total grows
 * faster than the number of turns.
 */
export function conversationCost(params: BudgetParams): {
  cost: number;
  inputTokens: number;
  rejected: number;
} {
  let cost = 0;
  let inputTokens = 0;
  let rejected = 0;
  for (let history = 0; history <= params.turns; history++) {
    const plan = planRequest(params, history);
    cost += plan.cost;
    if (plan.status === "rejected") rejected += 1;
    else inputTokens += plan.input;
  }
  return { cost, inputTokens, rejected };
}

export type BudgetVerdict = "correct" | "wrong-order" | "no-policy" | "rejected";

/** Can the assistant answer “When will I get my refund for that order?” */
export function verdict(plan: RequestPlan): BudgetVerdict {
  if (plan.status === "rejected") return "rejected";
  if (!plan.checks.order) return "wrong-order";
  if (!plan.checks.policy) return "no-policy";
  return "correct";
}

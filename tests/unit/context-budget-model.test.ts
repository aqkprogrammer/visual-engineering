import { describe, expect, it } from "vitest";
import {
  conversation,
  conversationCost,
  DEFAULT_BUDGET_PARAMS,
  planRequest,
  SIZES,
  verdict,
  type BudgetParams,
} from "@/lib/simulation/models/context-budget";

const plan = (change: Partial<BudgetParams>) =>
  planRequest({ ...DEFAULT_BUDGET_PARAMS, ...change });

describe("context budget model", () => {
  it("adds up every part of the request", () => {
    const p = plan({ window: 128_000 });
    const history = conversation(DEFAULT_BUDGET_PARAMS.turns).reduce((n, t) => n + t.tokens, 0);
    expect(p.input).toBe(
      SIZES.system + 4 * SIZES.perTool + history + 3 * SIZES.perDoc + SIZES.question,
    );
    expect(p.status).toBe("sent");
  });

  it("always fits the result within the window minus the reserved answer", () => {
    for (const strategy of ["reject", "drop-oldest", "summarise", "fewer-docs"] as const) {
      for (const turns of [4, 12, 40]) {
        const p = plan({ strategy, turns });
        if (p.status !== "rejected") expect(p.input).toBeLessThanOrEqual(p.budget);
      }
    }
  });

  // The demo's "things to try", in order.
  it("8K window, 12 turns: sending it anyway is rejected", () => {
    const p = plan({});
    expect(p.status).toBe("rejected");
    expect(verdict(p)).toBe("rejected");
    expect(p.cost).toBe(0);
  });

  it("dropping the oldest turns fits, but loses the order number", () => {
    const p = plan({ strategy: "drop-oldest" });
    expect(p.status).toBe("trimmed");
    expect(p.checks).toEqual({ order: false, code: false, policy: true });
    expect(verdict(p)).toBe("wrong-order");
  });

  it("summarising answers correctly, but loses the exact error code", () => {
    const p = plan({ strategy: "summarise" });
    expect(p.summarised).toBe(true);
    expect(p.checks).toEqual({ order: true, code: false, policy: true });
    expect(verdict(p)).toBe("correct");
  });

  it("retrieving fewer documents drops the refund policy", () => {
    expect(verdict(plan({ strategy: "fewer-docs" }))).toBe("no-policy");
  });

  it("a 32K window fits everything, but each request costs more", () => {
    const big = plan({ window: 32_000 });
    expect(big.status).toBe("sent");
    expect(verdict(big)).toBe("correct");
    expect(big.cost).toBeGreaterThan(plan({ strategy: "summarise" }).cost);
  });

  it("a 40-turn conversation costs about 15 times a 4-turn one", () => {
    const long = conversationCost({ ...DEFAULT_BUDGET_PARAMS, window: 32_000, turns: 40 });
    const short = conversationCost({ ...DEFAULT_BUDGET_PARAMS, window: 32_000, turns: 4 });
    expect(long.rejected).toBe(0);
    expect(long.cost / short.cost).toBeGreaterThan(14);
    expect(long.cost / short.cost).toBeLessThan(16);
  });

  it("caching the prefix lowers the cost but not the tokens used", () => {
    const plain = plan({ window: 32_000 });
    const cached = plan({ window: 32_000, cachePrefix: true });
    expect(cached.input).toBe(plain.input);
    expect(cached.cachedTokens).toBe(SIZES.system + 4 * SIZES.perTool);
    expect(cached.cost).toBeLessThan(plain.cost);
  });

  it("counts rejected requests in a conversation", () => {
    const c = conversationCost(DEFAULT_BUDGET_PARAMS);
    expect(c.rejected).toBeGreaterThan(0);
  });
});

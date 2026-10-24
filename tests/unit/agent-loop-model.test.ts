import { describe, expect, it } from "vitest";
import {
  agentSteps,
  DEFAULT_AGENT_PARAMS,
  INJECTED_NOTE,
  runAgent,
  type AgentParams,
} from "@/lib/simulation/models/agent-loop";

const run = (change: Partial<AgentParams>) => runAgent({ ...DEFAULT_AGENT_PARAMS, ...change });
const steps = (change: Partial<AgentParams>) => agentSteps({ ...DEFAULT_AGENT_PARAMS, ...change });

describe("agent loop model", () => {
  it("starts with tool discovery and the user's request", () => {
    const [discovery, request] = steps({});
    expect(discovery!.state.messages[0]!.label).toBe("tools/list");
    expect(request!.state.messages.at(-1)!.from).toBe("user");
  });

  it("never makes more model calls than the step limit", () => {
    for (const scenario of ["normal", "tool-error", "injection", "polling"] as const) {
      for (const maxSteps of [3, 5, 10]) {
        for (const approval of [false, true]) {
          for (const validation of [false, true]) {
            const s = run({ scenario, maxSteps, approval, validation });
            expect(s.modelCalls).toBeLessThanOrEqual(maxSteps);
          }
        }
      }
    }
  });

  it("bills the whole conversation on every model call", () => {
    const all = steps({});
    let expected = 0;
    let context = 0;
    for (const step of all) {
      const message = step.state.messages.at(-1)!;
      if (message.from === "model") expected += context;
      context += message.tokens;
      expect(step.state.billedTokens).toBe(expected);
    }
  });

  // The demo's "things to try", in order.
  it("normal: four model calls, three tools, then an answer", () => {
    const s = run({});
    expect(s.modelCalls).toBe(4);
    const tools = new Set(
      s.messages.filter((m) => m.label.startsWith("tools/call")).map((m) => m.tool),
    );
    expect([...tools]).toEqual(["get_order", "get_refund_policy", "issue_refund"]);
    expect(s.messages.at(-1)!.label).toBe("end_turn");
    expect(s.outcome).toBe("refunded");
    expect(s.refunds).toEqual([84]);
  });

  it("tool error: a limit of 3 stops before the refund; at 5 the retry succeeds", () => {
    const short = run({ scenario: "tool-error", maxSteps: 3 });
    expect(short.outcome).toBe("step-limit");
    expect(short.refunds).toEqual([]);
    const enough = run({ scenario: "tool-error", maxSteps: 5 });
    expect(enough.outcome).toBe("refunded");
    expect(enough.messages.some((m) => m.isError && m.tool === "get_order")).toBe(true);
  });

  it("injection: with no safeguards, $500 goes to a stranger", () => {
    const s = run({ scenario: "injection" });
    expect(s.messages.some((m) => m.untrusted && m.text.includes(INJECTED_NOTE))).toBe(true);
    expect(s.refunds).toEqual([500]);
    expect(s.outcome).toBe("wrong-refund");
  });

  it("injection: approval or validation blocks it and the correct $84 is refunded", () => {
    for (const guard of [{ approval: true }, { validation: true }]) {
      const s = run({ scenario: "injection", ...guard });
      expect(s.refunds).toEqual([84]);
      expect(s.outcome).toBe("refunded-after-block");
    }
    const denied = run({ scenario: "injection", approval: true });
    expect(
      denied.messages.some((m) => m.from === "app" && m.to === "reviewer" && m.label === "denied"),
    ).toBe(true);
  });

  it("never finishes: only the step limit ends it, billing almost three times a normal run", () => {
    const s = run({ scenario: "polling" });
    expect(s.outcome).toBe("loop-stopped");
    expect(s.modelCalls).toBe(10);
    const ratio = s.billedTokens / run({}).billedTokens;
    expect(ratio).toBeGreaterThan(2.5);
    expect(ratio).toBeLessThan(3);
  });

  it("a refund can succeed even when the loop stops before telling the user", () => {
    const s = run({ maxSteps: 3 });
    expect(s.refunds).toEqual([84]);
    expect(s.outcome).toBe("step-limit");
  });
});

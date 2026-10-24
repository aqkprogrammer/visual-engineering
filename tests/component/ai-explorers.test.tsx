// @vitest-environment jsdom
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { ChunkingExplorer } from "@/components/visualizations/scenes/chunking/chunking-explorer";
import { AgentWalkthrough } from "@/components/visualizations/scenes/agent-loop/agent-walkthrough";
import { ContextBudgetExplorer } from "@/components/visualizations/scenes/context-budget/context-budget-explorer";
import { HybridSearchExplorer } from "@/components/visualizations/scenes/hybrid-search/hybrid-search-explorer";

describe("ChunkingExplorer", () => {
  it("shows chunks and re-evaluates the selected question as settings change", async () => {
    const user = userEvent.setup();
    render(<ChunkingExplorer />);
    const chunks = screen.getByRole("list", { name: "Chunks" });
    expect(within(chunks).getAllByRole("listitem")).toHaveLength(6);
    expect(within(chunks).getAllByText("cuts a sentence")).toHaveLength(6);
    expect(screen.getByText(/^Partly answerable/)).toBeInTheDocument();

    await user.click(screen.getByLabelText(/Who has to approve a database failover/));
    expect(screen.getByText(/^Not answerable/)).toBeInTheDocument();

    await user.click(screen.getByRole("radio", { name: "Structure-aware" }));
    await user.click(screen.getByRole("switch", { name: /Add section headings/ }));
    expect(screen.getByText(/^Answerable/)).toBeInTheDocument();
    expect(within(chunks).queryByText("cuts a sentence")).toBeNull();
    expect(within(chunks).getAllByText("prefixed: Database failover").length).toBeGreaterThan(0);
  });
});

describe("HybridSearchExplorer", () => {
  it("compares three result lists and marks relevant articles", async () => {
    const user = userEvent.setup();
    render(<HybridSearchExplorer />);
    const keyword = screen.getByRole("region", { name: "Keyword (BM25) results" });
    const vector = screen.getByRole("region", { name: "Vector (toy embedding) results" });
    expect(within(keyword).getAllByRole("listitem")[0]).toHaveTextContent(
      "Error E1042: card declined by issuer(relevant)",
    );
    expect(within(vector).getAllByRole("listitem")[0]).toHaveTextContent("Why a payment fails");

    await user.click(screen.getByText("how do I get my money back"));
    expect(within(keyword).queryByText("Refunds for cancelled orders")).toBeNull();
    expect(within(vector).getAllByRole("listitem")[0]).toHaveTextContent("Refunds");
    expect(within(keyword).getByText(/recall@3 0\.00/)).toBeInTheDocument();
  });

  it("searches a typed query without judging relevance", async () => {
    const user = userEvent.setup();
    render(<HybridSearchExplorer />);
    const box = screen.getByRole("searchbox", { name: "Search query" });
    await user.clear(box);
    await user.type(box, "reset password");
    expect(
      screen.getByText(/relevance is only judged for the example questions/),
    ).toBeInTheDocument();
    const hybrid = screen.getByRole("region", { name: "Hybrid (rank fusion) results" });
    expect(within(hybrid).getAllByRole("listitem")[0]).toHaveTextContent("Reset your password");
    expect(screen.queryByText(/recall@3/)).toBeNull();
  });
});

describe("ContextBudgetExplorer", () => {
  it("rejects an over-long request, then trims it with the chosen strategy", async () => {
    const user = userEvent.setup();
    render(<ContextBudgetExplorer />);
    expect(screen.getByText(/^Rejected:/)).toBeInTheDocument();

    await user.click(screen.getByRole("radio", { name: /Drop the oldest turns/ }));
    expect(screen.getByText(/^Trimmed to fit: 7 earlier turns dropped/)).toBeInTheDocument();
    expect(screen.getByText(/has lost the order number/)).toBeInTheDocument();

    await user.click(screen.getByRole("radio", { name: /Summarise older turns/ }));
    expect(screen.getByText(/^Trimmed to fit: 8 earlier turns summarised/)).toBeInTheDocument();
    expect(screen.getByText("No:", { exact: false, selector: "span.sr-only" })).toBeInTheDocument();
    expect(screen.getByText(/The assistant can answer/)).toBeInTheDocument();

    await user.click(screen.getByRole("radio", { name: "32K" }));
    expect(screen.getByText("Fits without changes.")).toBeInTheDocument();
  });
});

describe("AgentWalkthrough", () => {
  beforeEach(() => {
    vi.stubGlobal(
      "matchMedia",
      vi.fn().mockImplementation((query: string) => ({
        matches: false,
        media: query,
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
      })),
    );
  });

  it("shows where each scenario ends and updates when safeguards change", async () => {
    const user = userEvent.setup();
    render(<AgentWalkthrough />);
    expect(screen.getByText(/Where this run ends: Done: refunded \$84\.00/)).toBeInTheDocument();

    await user.click(screen.getByRole("radio", { name: "Prompt injection" }));
    expect(screen.getByText(/Where this run ends: Harmful: \$500 refunded/)).toBeInTheDocument();

    await user.click(screen.getByRole("switch", { name: /Human approval for refunds/ }));
    expect(screen.getByText(/the injected \$500 refund was blocked/)).toBeInTheDocument();

    const transcript = screen.getByRole("list", { name: "Messages so far" });
    expect(within(transcript).getAllByRole("listitem")).toHaveLength(1);
    await user.click(screen.getByRole("button", { name: "Next step" }));
    expect(within(transcript).getAllByRole("listitem")).toHaveLength(2);
  });
});

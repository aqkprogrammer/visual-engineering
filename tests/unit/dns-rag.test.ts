import { describe, expect, it } from "vitest";
import { dnsSteps } from "@/lib/simulation/models/dns";
import {
  answer,
  chunk,
  CORPUS,
  DEFAULT_RAG_PARAMS,
  ragSteps,
  rerank,
  retrieve,
  score,
  terms,
  type RagParams,
} from "@/lib/simulation/models/rag";

describe("DNS walkthroughs", () => {
  it("a cold lookup walks root → TLD → authoritative, in that order", () => {
    const servers = dnsSteps("cold")
      .map((s) => s.state.message)
      .filter((m) => m && m.from === "resolver")
      .map((m) => m!.to);
    expect(servers).toEqual(["root", "tld", "auth", "stub"]);
  });

  it("a warm lookup never leaves the resolver", () => {
    const parties = new Set(dnsSteps("warm").flatMap((s) => s.state.involved));
    expect(parties.has("root")).toBe(false);
    expect(parties.has("tld")).toBe(false);
    expect(parties.has("auth")).toBe(false);
  });

  it("a sibling name skips root and TLD using the cached delegation", () => {
    const parties = new Set(dnsSteps("sibling").flatMap((s) => s.state.involved));
    expect(parties.has("auth")).toBe(true);
    expect(parties.has("root")).toBe(false);
  });

  it("caches only grow during a cold lookup and the final answer is cached", () => {
    const steps = dnsSteps("cold");
    const sizes = steps.map((s) => s.state.resolverCache.length);
    expect(sizes).toEqual([...sizes].sort((a, b) => a - b));
    expect(steps.at(-1)!.state.resolverCache.map((e) => e.name)).toContain("shop.example.com.");
  });

  it("is faster when cached", () => {
    const total = (s: "cold" | "warm" | "sibling") => dnsSteps(s).at(-1)!.state.elapsedMs;
    expect(total("warm")).toBeLessThan(total("sibling"));
    expect(total("sibling")).toBeLessThan(total("cold"));
  });
});

describe("RAG model", () => {
  const params = (p: Partial<RagParams> = {}): RagParams => ({ ...DEFAULT_RAG_PARAMS, ...p });
  const verdict = (p: Partial<RagParams>) => ragSteps(params(p)).at(-1)!.state.answer!.verdict;

  it("drops stop words and trailing punctuation", () => {
    expect([...terms("Who has to approve a $700 hotel booking?")]).toEqual([
      "approve",
      "$700",
      "hotel",
      "booking",
    ]);
  });

  it("chunks by sentence or by document", () => {
    expect(chunk(CORPUS, "document")).toHaveLength(CORPUS.length);
    expect(chunk(CORPUS, "sentence").length).toBeGreaterThan(CORPUS.length);
  });

  it("scores relevant text above irrelevant text", () => {
    const q = "How much is the equipment stipend for remote work?";
    expect(score(q, CORPUS[2]!.text)).toBeGreaterThan(score(q, CORPUS[3]!.text));
  });

  it("the reranker removes superseded documents", () => {
    const q = "How long do I have to submit an expense claim?";
    const ranked = rerank(q, retrieve(q, chunk(CORPUS, "document")));
    expect(ranked.every((c) => c.current)).toBe(true);
  });

  it("can produce every kind of outcome", () => {
    expect(verdict({ question: "approval", topK: 1 })).toBe("correct");
    expect(verdict({ question: "approval", topK: 2 })).toBe("conflicting");
    expect(verdict({ question: "deadline", chunking: "document", topK: 1 })).toBe("outdated");
    expect(verdict({ question: "deadline", chunking: "document", topK: 1, rerank: true })).toBe(
      "correct",
    );
    expect(verdict({ question: "gym" })).toBe("not-found");
  });

  it("removing the outdated document from the corpus fixes the conflict", () => {
    expect(verdict({ question: "approval", topK: 3, includeSuperseded: false })).toBe("correct");
  });

  it("cites the context position of the supporting chunk", () => {
    const context = chunk(CORPUS, "sentence").filter((c) => c.docId === "expenses-2025");
    expect(answer("approval", context).text).toContain("[2]");
  });

  it("shows a reranking step only when reranking is on", () => {
    const stages = (rerankOn: boolean) =>
      ragSteps(params({ rerank: rerankOn })).map((s) => s.state.stage);
    expect(stages(true)).toContain("reranking");
    expect(stages(false)).not.toContain("reranking");
  });
});

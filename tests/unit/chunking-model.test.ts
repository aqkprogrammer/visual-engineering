import { describe, expect, it } from "vitest";
import {
  chunkDocument,
  DEFAULT_CHUNKING_PARAMS,
  layout,
  runChunking,
  type ChunkingParams,
} from "@/lib/simulation/models/chunking";

const run = (change: Partial<ChunkingParams>) =>
  runChunking({ ...DEFAULT_CHUNKING_PARAMS, ...change });
const verdicts = (change: Partial<ChunkingParams>) =>
  Object.fromEntries(run(change).questions.map((q) => [q.question.id, q.verdict]));

describe("chunking model", () => {
  it("covers every word of the runbook, in order, with every strategy", () => {
    const { words } = layout();
    for (const strategy of ["fixed", "sentence", "structure"] as const) {
      for (const size of [30, 60, 120]) {
        const chunks = chunkDocument({ strategy, size, overlap: 10, headings: false });
        expect(chunks[0]!.start).toBe(0);
        expect(chunks.at(-1)!.end).toBe(words.length);
        for (const [a, b] of chunks.slice(1).map((c, i) => [chunks[i]!, c] as const)) {
          expect(b.start).toBeLessThanOrEqual(a.end); // no gaps
          expect(b.start).toBeGreaterThan(a.start); // always progresses
        }
        for (const c of chunks) expect(c.end - c.start).toBeLessThanOrEqual(size);
      }
    }
  });

  it("only fixed-size chunks cut sentences", () => {
    expect(run({}).cutSentences).toBe(run({}).chunks.length);
    expect(run({ strategy: "sentence" }).cutSentences).toBe(0);
    expect(run({ strategy: "structure" }).cutSentences).toBe(0);
  });

  it("structure-aware chunks never cross a section", () => {
    const { units } = layout();
    for (const chunk of chunkDocument({
      strategy: "structure",
      size: 120,
      overlap: 0,
      headings: false,
    })) {
      const sections = new Set(
        units.filter((u) => u.start < chunk.end && u.end > chunk.start).map((u) => u.section),
      );
      expect(sections.size).toBe(1);
    }
  });

  it("is 178 words long, and 20 words of overlap on 30-word chunks index almost three times that", () => {
    const result = run({ overlap: 20 });
    expect(result.documentWords).toBe(178);
    expect(result.indexedWords / result.documentWords).toBeGreaterThan(2.5);
    expect(result.indexedWords / result.documentWords).toBeLessThan(3);
  });

  // The demo's "things to try", in order.
  it("fixed 30-word chunks lose the retry warning and miss the approval", () => {
    expect(verdicts({})).toEqual({ retry: "partial", approval: "missed", escalate: "answerable" });
  });

  it("overlap brings the retry instruction and its warning together in 60-word chunks", () => {
    expect(verdicts({ size: 60 }).retry).toBe("partial");
    expect(verdicts({ size: 60, overlap: 10 }).retry).toBe("answerable");
  });

  it("section headings make the approval chunk findable", () => {
    expect(verdicts({ strategy: "structure" }).approval).toBe("missed");
    expect(verdicts({ strategy: "structure", headings: true }).approval).toBe("answerable");
  });

  it("small, well-cut chunks answer the retry question with a third of the words", () => {
    const big = run({ size: 120 }).questions.find((q) => q.question.id === "retry")!;
    const small = run({ strategy: "structure", size: 30, topK: 2 }).questions.find(
      (q) => q.question.id === "retry",
    )!;
    expect(big.verdict).toBe("answerable");
    expect(small.verdict).toBe("answerable");
    expect(big.sentWords / small.sentWords).toBeGreaterThanOrEqual(3);
    expect(small.relevantShare).toBe(1);
  });
});

import { describe, expect, it } from "vitest";
import {
  analyze,
  ARTICLES,
  bm25Search,
  compareSearch,
  embed,
  recallAt,
  reciprocalRank,
  reciprocalRankFusion,
  SEARCH_QUERIES,
  vectorSearch,
} from "@/lib/simulation/models/hybrid-search";

const query = (id: string) => SEARCH_QUERIES.find((q) => q.id === id)!;
const ids = (hits: { id: string }[], n = 5) => hits.slice(0, n).map((h) => h.id);

describe("BM25", () => {
  it("analyses like a standard analyzer: lower case, split on punctuation, no stemming", () => {
    expect(analyze("Two-factor Refunds, E1042!")).toEqual(["two", "factor", "refunds", "e1042"]);
  });

  it("matches the textbook formula for a single-term query", () => {
    const docs = ARTICLES.map((a) => analyze(`${a.title} ${a.body}`));
    const avgdl = docs.reduce((n, d) => n + d.length, 0) / docs.length;
    const doc = docs[ARTICLES.findIndex((a) => a.id === "e1042")]!;
    const tf = doc.filter((w) => w === "e1042").length;
    const idf = Math.log(1 + (10 - 1 + 0.5) / (1 + 0.5));
    const expected = (idf * tf * 2.2) / (tf + 1.2 * (1 - 0.75 + (0.75 * doc.length) / avgdl));
    const [hit] = bm25Search("e1042");
    expect(hit!.id).toBe("e1042");
    expect(hit!.score).toBeCloseTo(expected, 10);
  });

  it("weights rare words above common ones", () => {
    const hit = bm25Search("the E1042").find((h) => h.id === "e1042")!;
    const weight = Object.fromEntries(hit.terms.map((t) => [t.term, t.idf]));
    expect(weight.e1042).toBeGreaterThan(3 * weight.the!);
  });

  it("returns only documents that share a word with the query", () => {
    expect(bm25Search("zebra")).toEqual([]);
  });
});

describe("toy embedding", () => {
  it("prefers phrases to single words", () => {
    expect(embed("money back").matched).toEqual(["money back"]);
    expect(embed("money back").vector.refund).toBe(1);
    expect(embed("money back").vector.transfer).toBe(0);
  });

  it("ignores words it doesn't know, such as error codes", () => {
    expect(embed("E1042").matched).toEqual([]);
    expect(vectorSearch("E1042")).toEqual([]);
  });
});

describe("reciprocal rank fusion", () => {
  it("scores 1/(k + rank) per list and rewards agreement", () => {
    const fused = reciprocalRankFusion([
      [
        { id: "a", score: 9, rank: 1 },
        { id: "b", score: 5, rank: 2 },
      ],
      [
        { id: "b", score: 0.9, rank: 1 },
        { id: "c", score: 0.5, rank: 2 },
      ],
    ]);
    expect(fused.map((f) => f.id)).toEqual(["b", "a", "c"]);
    expect(fused[0]!.score).toBeCloseTo(1 / 62 + 1 / 61, 12);
    expect(fused[1]!.score).toBeCloseTo(1 / 61, 12);
  });

  it("ranks a document second in both lists above one first in only one, as the quiz says", () => {
    const fused = reciprocalRankFusion([
      [
        { id: "only-keyword", score: 1, rank: 1 },
        { id: "both", score: 1, rank: 2 },
      ],
      [
        { id: "x", score: 1, rank: 1 },
        { id: "both", score: 1, rank: 2 },
      ],
    ]);
    expect(fused[0]!.id).toBe("both");
  });
});

describe("the demo's example questions", () => {
  it("error code: keyword search ranks the exact article first, vector search doesn't", () => {
    const r = compareSearch(query("code").text);
    expect(r.keyword[0]!.id).toBe("e1042");
    expect(r.vector[0]!.id).toBe("payment-failed");
    expect(r.hybrid[0]!.id).toBe("e1042");
  });

  it("paraphrase: keyword search never finds the refunds article; vector ranks it first; fusion second", () => {
    const r = compareSearch(query("paraphrase").text);
    expect(ids(r.keyword, 99)).not.toContain("refunds");
    expect(ids(r.keyword, 2)).toEqual(["send-money", "export"]);
    expect(r.vector[0]!.id).toBe("refunds");
    expect(ids(r.hybrid, 2)).toEqual(["send-money", "refunds"]);
  });

  it("two needs: keyword search misses the refund; fusion ranks both relevant articles first", () => {
    const q = query("two-needs");
    const r = compareSearch(q.text);
    expect(recallAt(r.keyword, q.relevant, 3)).toBe(0.5);
    expect(ids(r.hybrid, 2).sort()).toEqual([...q.relevant].sort());
  });

  it("common words: an unrelated article sits between keyword search's two relevant ones", () => {
    const r = compareSearch(query("common-words").text);
    expect(ids(r.keyword, 3)).toEqual(["send-money", "refunds", "fees"]);
    const refunds = r.keyword[1]!.terms.map((t) => t.term).sort();
    expect(refunds).toEqual(["it", "to"]);
  });

  it("hybrid never has lower recall@3 than either method on the examples", () => {
    for (const q of SEARCH_QUERIES) {
      const r = compareSearch(q.text);
      const hybrid = recallAt(r.hybrid, q.relevant, 3);
      expect(hybrid).toBeGreaterThanOrEqual(recallAt(r.keyword, q.relevant, 3));
      expect(hybrid).toBeGreaterThanOrEqual(recallAt(r.vector, q.relevant, 3));
      expect(reciprocalRank(r.hybrid, q.relevant)).toBeGreaterThan(0);
    }
  });
});

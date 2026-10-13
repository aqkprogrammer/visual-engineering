import { describe, expect, it } from "vitest";
import {
  angleBetween,
  cosine,
  dot,
  euclidean,
  ITEMS,
  rank,
} from "@/lib/simulation/models/embeddings";

const item = (word: string) => ITEMS.find((i) => i.word === word)!;

describe("vector maths", () => {
  it("computes cosine, dot and euclidean correctly", () => {
    expect(dot([1, 2], [3, 4])).toBe(11);
    expect(cosine([1, 0], [0, 1])).toBeCloseTo(0);
    expect(cosine([2, 0], [5, 0])).toBeCloseTo(1);
    expect(euclidean([0, 0], [3, 4])).toBe(5);
    expect(angleBetween([1, 0], [0, 1])).toBeCloseTo(90);
  });

  it("cosine ignores length; dot product does not", () => {
    expect(cosine([1, 1], [10, 10])).toBeCloseTo(1);
    expect(dot([1, 1], [10, 10])).toBe(20);
  });
});

describe("ranking", () => {
  it("ranks related words first by cosine", () => {
    const top = rank(item("cat"), "cosine")
      .slice(0, 4)
      .map((r) => r.item.group);
    expect(top).toEqual(["animal", "animal", "animal", "animal"]);
    expect(rank(item("apple"), "cosine")[0]!.item.group).toBe("fruit");
  });

  it("the long 'animals' vector wins under dot product but not under euclidean distance", () => {
    expect(rank(item("cat"), "dot")[0]!.item.word).toBe("animals");
    const byDistance = rank(item("cat"), "euclidean").map((r) => r.item.word);
    expect(byDistance.indexOf("animals")).toBeGreaterThan(byDistance.indexOf("kitten"));
  });

  it("never includes the query itself and numbers ranks from 1", () => {
    const ranked = rank(item("car"), "cosine");
    expect(ranked).toHaveLength(ITEMS.length - 1);
    expect(ranked.map((r) => r.item.word)).not.toContain("car");
    expect(ranked[0]!.rank).toBe(1);
  });
});

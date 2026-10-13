import { describe, expect, it } from "vitest";
import {
  highlight,
  normalize,
  prepare,
  queryTerms,
  search,
  stem,
  withinOneEdit,
  type SearchDoc,
} from "@/lib/search/search";

function doc(overrides: Partial<SearchDoc> & Pick<SearchDoc, "title">): SearchDoc {
  return {
    kind: "lesson",
    href: `/${overrides.title.toLowerCase().replace(/\W+/g, "-")}`,
    summary: "",
    context: "",
    aliases: [],
    keywords: [],
    body: "",
    ...overrides,
  };
}

const docs = prepare([
  doc({
    title: "Message queues and backpressure",
    summary: "How queues decouple producers from consumers.",
    keywords: ["queues", "idempotency"],
  }),
  doc({
    title: "Caching: hits, eviction and stale data",
    summary: "Why caches go stale and how eviction works.",
    keywords: ["cache", "ttl"],
  }),
  doc({
    kind: "term",
    title: "Idempotency",
    summary: "Doing it twice has the same effect as once.",
    context: "Glossary",
    aliases: ["Idempotent"],
  }),
  doc({
    title: "How database indexes work",
    summary: "B-trees let the database skip reading the whole table.",
    body: "Why might the planner choose a sequential scan?",
  }),
  doc({ kind: "demo", title: "Kubernetes self-healing", summary: "Crash a pod and watch it." }),
]);

const titles = (query: string) => search(docs, query).map((r) => r.doc.title);

describe("text normalisation", () => {
  it("lowercases, strips accents and punctuation", () => {
    expect(normalize("  Café — B+ Tree!  ")).toBe("cafe b tree");
  });

  it("maps common word forms onto one stem", () => {
    const same = (...forms: string[]) => expect(new Set(forms.map(stem)).size).toBe(1);
    same("cache", "caches", "cached", "caching");
    same("queue", "queues", "queued");
    same("index", "indexes", "indexing");
    same("balance", "balancing");
    expect(stem("access")).toBe("access");
    expect(stem("dns")).toBe("dns");
  });

  it("drops stopwords unless the query is only stopwords", () => {
    expect(queryTerms("How does the cache work")).toEqual(["cache", "work"]);
    expect(queryTerms("how")).toEqual(["how"]);
    expect(queryTerms("queue queues")).toEqual(["queue"]);
    expect(queryTerms("Caching")).toEqual(["caching"]);
  });

  it("detects single edits", () => {
    expect(withinOneEdit("kubernetes", "kubernets")).toBe(true);
    expect(withinOneEdit("cache", "cachr")).toBe(true);
    expect(withinOneEdit("cache", "cahce")).toBe(false);
    expect(withinOneEdit("index", "indexes")).toBe(false);
  });
});

describe("search", () => {
  it("returns nothing for an empty query", () => {
    expect(search(docs, "   ")).toEqual([]);
  });

  it("ranks a title match above a summary or keyword match", () => {
    expect(titles("idempotency")).toEqual(["Idempotency", "Message queues and backpressure"]);
  });

  it("requires every query word to match", () => {
    expect(titles("queue stale")).toEqual([]);
    expect(titles("stale cache")).toEqual(["Caching: hits, eviction and stale data"]);
  });

  it("matches word prefixes while typing", () => {
    expect(titles("kube")).toEqual(["Kubernetes self-healing"]);
    expect(titles("evic")).toEqual(["Caching: hits, eviction and stale data"]);
    expect(titles("backpress")).toEqual(["Message queues and backpressure"]);
  });

  it("matches other forms of a word in the title", () => {
    expect(titles("cache")[0]).toBe("Caching: hits, eviction and stale data");
  });

  it("matches singular and plural forms", () => {
    expect(titles("index")).toContain("How database indexes work");
    expect(titles("queue")).toContain("Message queues and backpressure");
  });

  it("tolerates a one-letter typo in longer words", () => {
    expect(titles("kubernets")).toEqual(["Kubernetes self-healing"]);
  });

  it("searches the body with the lowest weight", () => {
    expect(titles("sequential scan")).toEqual(["How database indexes work"]);
  });

  it("caps the number of results", () => {
    expect(search(docs, "a", 1).length).toBeLessThanOrEqual(1);
  });
});

describe("highlight", () => {
  it("marks words that start with a query word", () => {
    expect(highlight("Message queues and backpressure", "queue")).toEqual([
      { text: "Message ", match: false },
      { text: "queues", match: true },
      { text: " and backpressure", match: false },
    ]);
  });

  it("marks other forms of the same word", () => {
    expect(highlight("Caching: hits", "cache")[0]).toEqual({ text: "Caching:", match: true });
  });

  it("returns the text unmarked when the query has no usable words", () => {
    expect(highlight("How caches work", "the")).toEqual([
      { text: "How caches work", match: false },
    ]);
  });
});

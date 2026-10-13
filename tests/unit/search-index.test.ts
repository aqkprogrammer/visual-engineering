import { describe, expect, it } from "vitest";
import { buildSearchIndex } from "@/lib/search/build";
import { SEARCH_KINDS, prepare, search } from "@/lib/search/search";

/** Real queries against the real index: guards both the content and the ranking rules. */
describe("search over the real catalog", () => {
  const docs = buildSearchIndex();
  const prepared = prepare(docs);
  const top = (query: string) => search(prepared, query)[0]?.doc;

  it("indexes every lesson, path, demo, incident, question and glossary term once", () => {
    const hrefs = docs.map((d) => d.href);
    expect(new Set(hrefs).size).toBe(hrefs.length);
    expect(new Set(docs.map((d) => d.kind))).toEqual(new Set(SEARCH_KINDS));
  });

  it.each([
    ["load balancing", "/system-design/load-balancing"],
    ["cache", "/system-design/caching"],
    ["queues", "/system-design/message-queues"],
    ["kubernetes", "/containers/kubernetes-self-healing"],
    ["tls handshake", "/networking/tls-handshake"],
    ["dlq", "/glossary/#dead-letter-queue"],
    ["idempotent", "/glossary/#idempotency"],
    ["bpe", "/glossary/#byte-pair-encoding"],
    ["web request", "/paths/how-a-web-request-is-served"],
    ["stampede", "/glossary/#cache-stampede"],
    ["node failure", "/incidents/pods-missing-after-node-failure"],
  ])("“%s” ranks %s first", (query, href) => {
    expect(top(query)?.href).toBe(href);
  });

  it("finds lessons through their section headings and tags", () => {
    const hrefs = search(prepared, "health checks").map((r) => r.doc.href);
    expect(hrefs).toContain("/system-design/load-balancing");
  });

  it("returns nothing for nonsense", () => {
    expect(search(prepared, "zzqxv")).toEqual([]);
  });
});

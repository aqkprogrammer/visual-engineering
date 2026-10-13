import { defineLesson } from "@/lib/content/schema";

export default defineLesson({
  slug: "caching",
  domain: "system-design",
  module: "data",
  order: 10,
  title: "Caching: hits, eviction and stale data",
  description:
    "How a cache makes reads fast, how LRU, LFU and FIFO decide what to evict, and why invalidation and stale data are the hard part.",
  difficulty: "beginner",
  related: ["system-design/load-balancing", "system-design/rate-limiting"],
  tags: ["caching", "performance", "redis", "eviction", "consistency"],
  references: [
    {
      title: "Key eviction",
      url: "https://redis.io/docs/latest/develop/reference/eviction/",
      publisher: "Redis",
      kind: "official-docs",
    },
    {
      title: "Caching strategies (Amazon ElastiCache)",
      url: "https://docs.aws.amazon.com/AmazonElastiCache/latest/dg/Strategies.html",
      publisher: "Amazon Web Services",
      kind: "official-docs",
    },
    {
      title: "HTTP caching",
      url: "https://developer.mozilla.org/en-US/docs/Web/HTTP/Guides/Caching",
      publisher: "MDN Web Docs",
      kind: "official-docs",
    },
    {
      title: "RFC 9111: HTTP Caching",
      url: "https://www.rfc-editor.org/rfc/rfc9111",
      publisher: "IETF",
      kind: "specification",
    },
  ],
  lastReviewed: "2026-10-12",
  status: "published",
});

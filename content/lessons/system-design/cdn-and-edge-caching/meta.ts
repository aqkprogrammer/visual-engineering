import { defineLesson } from "@/lib/content/schema";

export default defineLesson({
  slug: "cdn-and-edge-caching",
  domain: "system-design",
  module: "traffic",
  order: 30,
  title: "CDNs and edge caching",
  description:
    "How a CDN serves content from caches near users, how TTLs trade freshness against origin load, and what purges, stale-while-revalidate and origin shields change.",
  difficulty: "intermediate",
  prerequisites: ["system-design/caching"],
  related: ["system-design/load-balancing", "networking/dns-resolution"],
  tags: ["cdn", "edge-caching", "http-caching", "cache-invalidation", "latency"],
  references: [
    {
      title: "RFC 9111: HTTP Caching",
      url: "https://www.rfc-editor.org/rfc/rfc9111",
      publisher: "IETF",
      kind: "specification",
    },
    {
      title: "RFC 5861: HTTP Cache-Control Extensions for Stale Content",
      url: "https://www.rfc-editor.org/rfc/rfc5861",
      publisher: "IETF",
      kind: "specification",
    },
    {
      title: "Use Amazon CloudFront Origin Shield",
      url: "https://docs.aws.amazon.com/AmazonCloudFront/latest/DeveloperGuide/origin-shield.html",
      publisher: "Amazon Web Services",
      kind: "official-docs",
    },
    {
      title: "Invalidate files to remove content",
      url: "https://docs.aws.amazon.com/AmazonCloudFront/latest/DeveloperGuide/Invalidation.html",
      publisher: "Amazon Web Services",
      kind: "official-docs",
    },
  ],
  lastReviewed: "2026-10-24",
  status: "published",
});

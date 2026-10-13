import { defineLesson } from "@/lib/content/schema";

export default defineLesson({
  slug: "rate-limiting",
  domain: "system-design",
  module: "traffic",
  order: 20,
  title: "How rate limiting works",
  description:
    "How token buckets, fixed windows and sliding windows cap request rates, why fixed windows let bursts through, and how to apply limits fairly in production.",
  difficulty: "intermediate",
  prerequisites: ["system-design/load-balancing"],
  related: ["system-design/caching"],
  tags: ["rate-limiting", "api", "throttling", "reliability", "security"],
  references: [
    {
      title: "RFC 6585: Additional HTTP Status Codes (429 Too Many Requests)",
      url: "https://www.rfc-editor.org/rfc/rfc6585",
      publisher: "IETF",
      kind: "specification",
    },
    {
      title: "Module ngx_http_limit_req_module",
      url: "https://nginx.org/en/docs/http/ngx_http_limit_req_module.html",
      publisher: "nginx.org",
      kind: "official-docs",
    },
    {
      title: "Throttle requests to your REST APIs in API Gateway",
      url: "https://docs.aws.amazon.com/apigateway/latest/developerguide/api-gateway-request-throttling.html",
      publisher: "Amazon Web Services",
      kind: "official-docs",
    },
    {
      title: "How we built rate limiting capable of scaling to millions of domains",
      url: "https://blog.cloudflare.com/counting-things-a-lot-of-different-things/",
      publisher: "Cloudflare",
      kind: "article",
    },
    {
      title: "Scaling your API with rate limiters",
      url: "https://stripe.com/blog/rate-limiters",
      publisher: "Stripe",
      kind: "article",
    },
    {
      title: "INCR (pattern: rate limiter)",
      url: "https://redis.io/docs/latest/commands/incr/",
      publisher: "Redis",
      kind: "official-docs",
    },
    {
      title: "Timeouts, retries, and backoff with jitter",
      url: "https://aws.amazon.com/builders-library/timeouts-retries-and-backoff-with-jitter/",
      publisher: "Amazon Web Services",
      kind: "article",
    },
  ],
  lastReviewed: "2026-10-12",
  status: "published",
});

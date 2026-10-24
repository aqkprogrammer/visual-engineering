import { defineLesson } from "@/lib/content/schema";

export default defineLesson({
  slug: "timeouts-retries-and-circuit-breakers",
  domain: "system-design",
  module: "resilience",
  order: 10,
  title: "Timeouts, retries and circuit breakers",
  description:
    "How timeouts, retries, backoff, jitter, retry budgets and circuit breakers keep a slow dependency from taking your service down — and how retries can cause the outage.",
  difficulty: "intermediate",
  related: [
    "software-architecture/monoliths-and-microservices",
    "system-design/rate-limiting",
    "system-design/message-queues",
  ],
  tags: ["timeouts", "retries", "circuit-breaker", "backoff", "resilience"],
  references: [
    {
      title: "Timeouts, retries, and backoff with jitter",
      url: "https://builder.aws.com/content/3EumjoZascWd1oZiEgL8ORlv3qE/timeouts-retries-and-backoff-with-jitter",
      publisher: "Amazon Builders' Library",
      kind: "article",
    },
    {
      title: "Circuit Breaker pattern",
      url: "https://learn.microsoft.com/en-us/azure/architecture/patterns/circuit-breaker",
      publisher: "Microsoft",
      kind: "official-docs",
    },
    {
      title: "CircuitBreaker",
      url: "https://martinfowler.com/bliki/CircuitBreaker.html",
      publisher: "Martin Fowler",
      kind: "article",
    },
    {
      title: "Exponential Backoff And Jitter",
      url: "https://aws.amazon.com/blogs/architecture/exponential-backoff-and-jitter/",
      publisher: "Amazon Web Services",
      kind: "article",
    },
  ],
  lastReviewed: "2026-10-24",
  status: "published",
});

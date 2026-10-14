import { defineLesson } from "@/lib/content/schema";

export default defineLesson({
  slug: "monoliths-and-microservices",
  domain: "software-architecture",
  module: "styles",
  order: 20,
  title: "Monoliths and microservices",
  description:
    "What microservices buy you and what they cost: independent teams and deploys, against remote calls whose failures and slowness compound with every hop.",
  difficulty: "intermediate",
  related: ["software-architecture/hexagonal-architecture", "system-design/message-queues"],
  tags: ["microservices", "monolith", "distributed-systems", "latency", "architecture"],
  references: [
    {
      title: "Microservices",
      url: "https://martinfowler.com/articles/microservices.html",
      publisher: "Martin Fowler and James Lewis",
      kind: "article",
    },
    {
      title: "MonolithFirst",
      url: "https://martinfowler.com/bliki/MonolithFirst.html",
      publisher: "Martin Fowler",
      kind: "article",
    },
    {
      title: "The Tail at Scale",
      url: "https://research.google/pubs/pub40801/",
      publisher: "Google Research (Communications of the ACM)",
      kind: "paper",
    },
  ],
  lastReviewed: "2026-10-13",
  status: "published",
});

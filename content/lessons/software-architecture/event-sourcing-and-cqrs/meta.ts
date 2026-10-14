import { defineLesson } from "@/lib/content/schema";

export default defineLesson({
  slug: "event-sourcing-and-cqrs",
  domain: "software-architecture",
  module: "domain-modeling",
  order: 10,
  title: "Event sourcing and CQRS",
  description:
    "Storing every change as an immutable event, rebuilding state by replaying them, and serving reads from separate models that are eventually consistent.",
  difficulty: "advanced",
  prerequisites: ["system-design/message-queues"],
  related: ["software-architecture/hexagonal-architecture", "computer-science/database-indexes"],
  tags: ["event-sourcing", "cqrs", "eventual-consistency", "audit", "architecture"],
  references: [
    {
      title: "Event Sourcing pattern",
      url: "https://learn.microsoft.com/en-us/azure/architecture/patterns/event-sourcing",
      publisher: "Microsoft",
      kind: "official-docs",
    },
    {
      title: "CQRS",
      url: "https://martinfowler.com/bliki/CQRS.html",
      publisher: "Martin Fowler",
      kind: "article",
    },
  ],
  lastReviewed: "2026-10-13",
  status: "published",
});

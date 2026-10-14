import { defineLesson } from "@/lib/content/schema";

export default defineLesson({
  slug: "hexagonal-architecture",
  domain: "software-architecture",
  module: "styles",
  order: 10,
  title: "Hexagonal architecture (ports and adapters)",
  description:
    "How keeping business logic independent of databases, frameworks and delivery mechanisms makes changes smaller and tests faster — and when it is overkill.",
  difficulty: "intermediate",
  related: [
    "software-architecture/monoliths-and-microservices",
    "software-architecture/event-sourcing-and-cqrs",
  ],
  tags: [
    "hexagonal-architecture",
    "ports-and-adapters",
    "clean-architecture",
    "testing",
    "dependencies",
  ],
  references: [
    {
      title: "Hexagonal architecture",
      url: "https://alistair.cockburn.us/hexagonal-architecture/",
      publisher: "Alistair Cockburn",
      kind: "article",
    },
    {
      title: "The Clean Architecture",
      url: "https://blog.cleancoder.com/uncle-bob/2012/08/13/the-clean-architecture.html",
      publisher: "Robert C. Martin",
      kind: "article",
    },
  ],
  lastReviewed: "2026-10-13",
  status: "published",
});

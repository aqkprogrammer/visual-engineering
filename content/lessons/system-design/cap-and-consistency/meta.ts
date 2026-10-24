import { defineLesson } from "@/lib/content/schema";

export default defineLesson({
  slug: "cap-and-consistency",
  domain: "system-design",
  module: "consistency",
  order: 10,
  title: "CAP, PACELC and consistency models",
  description:
    "What a network partition forces a replicated system to choose, why latency is the everyday trade-off, and how last-writer-wins and CRDTs differ when replicas disagree.",
  difficulty: "advanced",
  prerequisites: ["system-design/replication"],
  related: [
    "system-design/sharding-and-consistent-hashing",
    "software-architecture/event-sourcing-and-cqrs",
  ],
  tags: ["cap-theorem", "pacelc", "eventual-consistency", "crdt", "quorum"],
  references: [
    {
      title: 'CAP Twelve Years Later: How the "Rules" Have Changed',
      url: "https://www.infoq.com/articles/cap-twelve-years-later-how-the-rules-have-changed/",
      publisher: "Eric Brewer (IEEE Computer, 2012)",
      kind: "article",
    },
    {
      title:
        "Brewer's Conjecture and the Feasibility of Consistent, Available, Partition-Tolerant Web Services",
      url: "https://groups.csail.mit.edu/tds/papers/Gilbert/Brewer2.pdf",
      publisher: "Gilbert and Lynch, ACM SIGACT News 2002",
      kind: "paper",
    },
    {
      title: "Consistency Tradeoffs in Modern Distributed Database System Design",
      url: "https://www.cs.umd.edu/~abadi/papers/abadi-pacelc.pdf",
      publisher: "Daniel Abadi, IEEE Computer 2012",
      kind: "paper",
    },
    {
      title: "Conflict-free Replicated Data Types",
      url: "https://inria.hal.science/inria-00609399",
      publisher: "Shapiro, Preguiça, Baquero and Zawirski, SSS 2011",
      kind: "paper",
    },
    {
      title: "DynamoDB read consistency",
      url: "https://docs.aws.amazon.com/amazondynamodb/latest/developerguide/HowItWorks.ReadConsistency.html",
      publisher: "Amazon Web Services",
      kind: "official-docs",
    },
  ],
  lastReviewed: "2026-10-24",
  status: "published",
});

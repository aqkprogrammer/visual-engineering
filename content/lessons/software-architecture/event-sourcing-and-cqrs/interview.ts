import { defineInterview } from "@/lib/content/schema";

export default defineInterview([
  {
    id: "event-sourcing-explained",
    question: "What is event sourcing, and what do you gain and lose by using it?",
    level: "mid",
    kind: "trade-off",
    answer:
      "Instead of storing current state, you store every change as an immutable event in an append-only log and derive state by replaying events. You gain a complete audit trail, the ability to reconstruct state at any point in time, and the ability to build new read models from history. You lose simplicity: querying needs projections, reads become eventually consistent, event schemas must be versioned forever, and deleting personal data is harder.",
    rubric: {
      core: [
        "Stores changes as immutable events and derives state by replaying them",
        "Gains: audit trail, point-in-time reconstruction, new views from history",
        "Costs: projections, eventual consistency, event versioning",
      ],
      strong: ["Mentions the tension with data-deletion requirements"],
      redFlags: ["Describes it as simply logging changes alongside a normal database"],
    },
  },
  {
    id: "cqrs-vs-event-sourcing",
    question: "What is CQRS, and how does it relate to event sourcing?",
    level: "mid",
    kind: "concept",
    answer:
      "CQRS separates the model that handles commands, which enforces rules and changes data, from the models that serve queries, which are shaped for reading. It doesn't require event sourcing; both models could use the same database. They combine naturally because events from the write side can update the read models. Both should be applied selectively, to parts of a system where the extra complexity pays off.",
    rubric: {
      core: [
        "Separates write (command) models from read (query) models",
        "Can be used without event sourcing",
        "Events can feed read models when they are combined",
      ],
      strong: ["Warns to apply it only to parts of a system"],
      redFlags: ["Says CQRS and event sourcing are the same thing"],
    },
  },
  {
    id: "read-your-writes-es",
    question:
      "Users complain they don't see their changes right after saving in an event-sourced system. How do you fix it?",
    level: "senior",
    kind: "debugging",
    answer:
      "The read model is eventually consistent and hasn't applied the new event yet. Options: return the result of the command directly and render it, have the client wait until the projection reaches the event's sequence number, or read that user's own data from the write side for a short time. Also check the projection isn't falling behind permanently: measure its lag and scale or fix it if events arrive faster than it processes them.",
    rubric: {
      core: [
        "Identifies read-model lag (eventual consistency) as the cause",
        "Returns the command result or waits for the projection to reach a known position",
        "Monitors projection lag",
      ],
      strong: ["Mentions reading from the write side for the user's own recent changes"],
      redFlags: [
        "Suggests editing the read model directly from the command handler without events",
      ],
    },
  },
  {
    id: "projection-correctness",
    question: "How do you keep projections correct when events can be delivered more than once?",
    level: "senior",
    kind: "design",
    answer:
      "Make projections idempotent. Each read model records the sequence number of the last event it applied and ignores events at or below it, or its updates are designed to be safe to repeat. If a projection does drift because of a bug, rebuild it by replaying the log into a new copy and switching over once it has caught up.",
    rubric: {
      core: [
        "Makes projections idempotent",
        "Tracks the last applied sequence number per read model",
        "Rebuilds a drifted projection by replaying the log",
      ],
      strong: ["Rebuilds into a new copy and switches over, rather than wiping the live one"],
      redFlags: ["Assumes events are delivered exactly once"],
    },
  },
]);

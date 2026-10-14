import { defineQuiz } from "@/lib/content/schema";

export default defineQuiz([
  {
    id: "current-state",
    prompt: "In an event-sourced system, how is an account's current balance obtained?",
    options: [
      {
        id: "a",
        text: "By replaying the account's events, usually from the latest snapshot.",
        correct: true,
        explanation:
          "The event stream is the source of truth; state is derived from it (rehydration).",
      },
      {
        id: "b",
        text: "By reading a balance column that every event overwrites.",
        explanation: "That is the traditional current-state model event sourcing replaces.",
      },
      {
        id: "c",
        text: "From the first event only.",
        explanation: "Every event since the account was opened contributes to the current state.",
      },
    ],
  },
  {
    id: "fix-mistake",
    prompt: "A withdrawal was recorded by mistake. How do you correct it?",
    options: [
      {
        id: "a",
        text: "Append a compensating event that reverses it; the original stays in the log.",
        correct: true,
        explanation:
          "Events are immutable. The history then shows both the mistake and the correction.",
      },
      {
        id: "b",
        text: "Edit the original event's amount.",
        explanation: "Editing events breaks the audit trail and every projection built from them.",
      },
      {
        id: "c",
        text: "Delete the event from the store.",
        explanation: "Events are never deleted in normal operation; the log is append-only.",
      },
    ],
  },
  {
    id: "eventual-consistency",
    prompt:
      "Right after a deposit, a user's balance screen still shows the old balance. What's the most likely reason?",
    options: [
      {
        id: "a",
        text: "The read model hasn't applied the new event yet; it is eventually consistent.",
        correct: true,
        explanation:
          "Projections follow the log with a small delay. Interfaces should allow for it.",
      },
      {
        id: "b",
        text: "The deposit was lost.",
        explanation:
          "If the command was accepted, its event is in the log; the read model is just behind.",
      },
      {
        id: "c",
        text: "Event sourcing can't show balances.",
        explanation: "It can — through read models or by replaying events.",
      },
    ],
  },
  {
    id: "cqrs-meaning",
    prompt: "What does CQRS separate?",
    options: [
      {
        id: "a",
        text: "The model used to change data from the models used to read it.",
        correct: true,
        explanation:
          "Commands go to a write model; queries are served by read models shaped for them.",
      },
      {
        id: "b",
        text: "The database from the application server.",
        explanation:
          "That separation exists in most architectures; CQRS is about models for reads and writes.",
      },
      {
        id: "c",
        text: "Events from snapshots.",
        explanation:
          "Snapshots are an optimisation in event sourcing, unrelated to CQRS's definition.",
      },
    ],
  },
  {
    id: "new-view",
    prompt:
      "Six months in, the business wants a report of spending by category. What does event sourcing make possible?",
    options: [
      {
        id: "a",
        text: "Building a new read model by replaying all past events, so the report covers the full history.",
        correct: true,
        explanation:
          "Because every change was kept, new views can be built for the past, not just from now on.",
      },
      {
        id: "b",
        text: "Nothing: the report can only include future transactions.",
        explanation:
          "That would be true if only current state were stored. Events keep the history.",
      },
      {
        id: "c",
        text: "Editing old events to add the category.",
        explanation:
          "Events aren't edited. If a category was never recorded, it can't be invented — which is why rich events matter.",
      },
    ],
  },
]);

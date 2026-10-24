import { defineQuiz } from "@/lib/content/schema";

export default defineQuiz([
  {
    id: "retry-storm",
    prompt:
      "A dependency slowed down for five seconds, then recovered — but errors continued for an hour. Clients retry three times immediately. What happened?",
    options: [
      {
        id: "a",
        text: "Retries multiplied the load, so even at full capacity the dependency kept getting more calls than it could serve.",
        correct: true,
        explanation:
          "A retry storm sustains overload after its cause has gone. Shedding load — fewer retries, a budget or a breaker — breaks the cycle.",
      },
      {
        id: "b",
        text: "The dependency never really recovered.",
        explanation: "It recovered its capacity; the extra load from retries kept it overloaded.",
      },
      {
        id: "c",
        text: "The timeout was too long.",
        explanation: "Short timeouts make this worse: more calls time out and are retried.",
      },
    ],
  },
  {
    id: "backoff-volume",
    prompt: "Why doesn't exponential backoff on its own stop a retry storm?",
    options: [
      {
        id: "a",
        text: "It spreads retries out over time but doesn't reduce how many there are.",
        correct: true,
        explanation:
          "To reduce volume, limit retries with a budget or stop them with a circuit breaker.",
      },
      {
        id: "b",
        text: "Backoff makes retries happen sooner.",
        explanation: "Backoff waits longer after each attempt.",
      },
      {
        id: "c",
        text: "Backoff only works with circuit breakers.",
        explanation: "Backoff works on its own; it just doesn't limit total retries.",
      },
    ],
  },
  {
    id: "layered-retries",
    prompt:
      "Five services call each other in a chain, and each retries failed calls three times. How many times can one failing database call be attempted?",
    options: [
      {
        id: "a",
        text: "243 (3⁵)",
        correct: true,
        explanation: "Attempts multiply at every layer. Retry at one layer only.",
      },
      {
        id: "b",
        text: "15 (3 × 5)",
        explanation: "Retries don't add up across layers; they multiply.",
      },
      {
        id: "c",
        text: "3",
        explanation:
          "Each layer retries the whole call below it, including that layer's own retries.",
      },
    ],
  },
  {
    id: "half-open",
    prompt: "What happens in a circuit breaker's half-open state?",
    options: [
      {
        id: "a",
        text: "A limited number of trial calls go through; success closes the breaker, and a failure opens it again.",
        correct: true,
        explanation: "This tests recovery without flooding a dependency that is just coming back.",
      },
      {
        id: "b",
        text: "Half of all calls are allowed through permanently.",
        explanation: "Half-open is a short trial period, not a permanent split.",
      },
      {
        id: "c",
        text: "Calls are queued until the dependency recovers.",
        explanation: "The breaker fails or trials calls; it doesn't queue them.",
      },
    ],
  },
  {
    id: "safe-retry",
    prompt: "Which request is unsafe to retry automatically unless it is made idempotent?",
    options: [
      {
        id: "a",
        text: "Charging a customer's card.",
        correct: true,
        explanation:
          "The first attempt may have succeeded even though the response was lost. An idempotency key makes retries safe.",
      },
      {
        id: "b",
        text: "Reading a product's price.",
        explanation: "Reads don't change anything, so repeating them is safe.",
      },
      {
        id: "c",
        text: "Fetching a user's profile.",
        explanation: "Also a read, and safe to repeat.",
      },
    ],
  },
]);

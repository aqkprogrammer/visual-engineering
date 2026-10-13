import { defineQuiz } from "@/lib/content/schema";

export default defineQuiz([
  {
    id: "fixed-window-edge",
    prompt:
      "A fixed window limiter allows 100 requests per minute. A client sends 100 requests at 10:00:59 and another 100 at 10:01:00. How many are accepted?",
    options: [
      {
        id: "a",
        text: "100 — the limiter knows they all arrived within one second.",
        explanation:
          "A fixed window only counts per calendar window; it has no memory of the previous window once it resets.",
      },
      {
        id: "b",
        text: "200 — each batch falls in a different window.",
        correct: true,
        explanation:
          "This is the boundary burst: twice the limit within about a second. Sliding windows prevent it.",
      },
      {
        id: "c",
        text: "None — the burst is detected as an attack.",
        explanation: "Rate limiters count requests; they don't classify intent.",
      },
    ],
  },
  {
    id: "token-bucket-burst",
    prompt:
      "A token bucket has capacity 20 and refills at 5 tokens per second. A client has been idle for a minute and then sends 30 requests at once. What happens?",
    options: [
      {
        id: "a",
        text: "5 are accepted, matching the refill rate.",
        explanation:
          "The bucket filled up to its capacity while the client was idle, so it can absorb more than the per-second rate.",
      },
      {
        id: "b",
        text: "20 are accepted immediately and 10 are rejected.",
        correct: true,
        explanation:
          "The full bucket's 20 tokens are spent at once; the rest find it empty. Over time the client is held to 5 per second.",
      },
      {
        id: "c",
        text: "All 30 are accepted because the client was idle.",
        explanation:
          "Idle time only refills the bucket up to its capacity — tokens don't accumulate beyond it.",
      },
    ],
  },
  {
    id: "many-instances",
    prompt:
      "Each of your 10 API servers enforces '100 requests per minute per key' with an in-memory counter. What limit does a client effectively get?",
    options: [
      {
        id: "a",
        text: "100 per minute, as configured.",
        explanation: "Each server only sees the requests the load balancer sends to it.",
      },
      {
        id: "b",
        text: "Up to about 1,000 per minute, if its requests are spread across all servers.",
        correct: true,
        explanation:
          "Independent counters multiply the limit by the number of instances. Share counters in a common store to enforce a global limit.",
      },
      {
        id: "c",
        text: "10 per minute, because the limit is divided between servers.",
        explanation: "Nothing divides the limit; each server applies the full 100 on its own.",
      },
    ],
  },
  {
    id: "client-429",
    prompt: "Your client receives 429 Too Many Requests with Retry-After: 30. What should it do?",
    options: [
      {
        id: "a",
        text: "Retry immediately, in case it was a transient error.",
        explanation:
          "Immediate retries add load to an already-limited service and will almost certainly be rejected again.",
      },
      {
        id: "b",
        text: "Wait at least 30 seconds before retrying, and back off further with jitter if it happens again.",
        correct: true,
        explanation:
          "Retry-After tells the client when to come back; backoff with jitter stops many clients retrying in lockstep.",
      },
      {
        id: "c",
        text: "Switch to a different API key to bypass the limit.",
        explanation:
          "That usually violates the API's terms, and well-designed limits often apply per account, not only per key.",
      },
    ],
  },
]);

import { defineInterview } from "@/lib/content/schema";

export default defineInterview([
  {
    id: "design-retry-policy",
    question: "Design a retry policy for calls from one service to another.",
    level: "mid",
    kind: "design",
    answer:
      "Retry only idempotent operations, or ones made idempotent with keys. Set a timeout per attempt from the dependency's measured latency percentiles. Use a small number of attempts with exponential backoff and full jitter, cap retries with a budget — for example a token bucket allowing about 10% extra traffic — and honour Retry-After, 429 and 503 responses. Retry at one layer of the stack only, and combine it with a circuit breaker so retries stop when the dependency is clearly down.",
    rubric: {
      core: [
        "Retries only idempotent operations",
        "Timeouts per attempt from measured latency",
        "Backoff with jitter and a limited number of attempts",
        "A retry budget or circuit breaker to cap total retries",
      ],
      strong: ["Retries at a single layer", "Honours Retry-After and throttling responses"],
      redFlags: ["Retries every failure immediately and indefinitely"],
    },
  },
  {
    id: "circuit-breaker-states",
    question: "Explain how a circuit breaker works and why you would use one.",
    level: "junior",
    kind: "concept",
    answer:
      "It wraps calls to a dependency. While closed, calls pass through and failures are counted. When failures cross a threshold, it opens: calls fail immediately without reaching the dependency, which stops threads piling up and gives the dependency room to recover. After a timeout it goes half-open and lets a few trial calls through; success closes it, failure opens it again. It is used to prevent cascading failures and to fail fast, ideally with a fallback.",
    rubric: {
      core: [
        "Closed, open and half-open states",
        "Opens after a failure threshold and fails fast",
        "Half-open trials decide whether to close",
      ],
      strong: ["Pairs it with a fallback such as cached data"],
      redFlags: ["Thinks the breaker retries calls for you"],
    },
  },
  {
    id: "retry-storm-debugging",
    question:
      "After a brief database slowdown, your service keeps failing even though the database is healthy. What's happening and how do you fix it?",
    level: "senior",
    kind: "debugging",
    answer:
      "Likely a retry storm, a metastable failure: retries during the slowdown multiplied load, calls time out, and their retries keep the database overloaded even at full capacity — much of its work is for callers that already gave up. Confirm by comparing call volume to user traffic and capacity, and looking at retry and timeout rates. Shed load to break the cycle: disable or cap retries, open circuit breakers, or rate-limit at the edge; then fix the policy with retry budgets, single-layer retries and jitter.",
    rubric: {
      core: [
        "Identifies retries sustaining the overload",
        "Compares call volume with traffic and capacity",
        "Sheds load to recover",
        "Fixes the retry policy afterwards",
      ],
      strong: ["Names it a metastable failure or notes wasted work on timed-out calls"],
      redFlags: ["Only adds database capacity without addressing retries"],
    },
  },
  {
    id: "choosing-timeouts",
    question: "How would you choose a timeout for a call to a dependency?",
    level: "mid",
    kind: "trade-off",
    answer:
      "From data: measure the dependency's latency distribution, choose an acceptable rate of false timeouts — say 0.1% — and set the timeout at that percentile, p99.9, plus some padding, accounting for network distance. Too long and callers tie up resources and users wait; too short and healthy calls fail and get retried. The caller's own deadline matters too: a timeout longer than the time the user will wait is wasted.",
    rubric: {
      core: [
        "Uses measured latency percentiles",
        "Explains the cost of too long and too short",
        "Considers the overall request deadline",
      ],
      strong: ["Mentions an acceptable false-timeout rate such as 0.1% at p99.9"],
      redFlags: ["Picks a round number without data"],
    },
  },
]);

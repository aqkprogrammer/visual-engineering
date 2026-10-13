import { defineInterview } from "@/lib/content/schema";

export default defineInterview([
  {
    id: "token-bucket-vs-fixed-window",
    question: "Compare the token bucket and fixed window algorithms.",
    level: "junior",
    kind: "trade-off",
    answer:
      "A fixed window counts requests per key in fixed intervals and resets at each boundary. It is cheap, but a client can send its full quota at the end of one window and again at the start of the next, briefly getting twice the limit. A token bucket refills tokens continuously up to a capacity and spends one per request, so it enforces an average rate while allowing controlled bursts up to the bucket size. Token buckets give smoother, more predictable behaviour; fixed windows are simpler to implement in a shared store.",
    rubric: {
      core: [
        "A fixed window counts requests per interval and resets at each boundary",
        "A client can briefly get twice the limit across a window boundary",
        "A token bucket refills steadily, enforcing an average rate while allowing bursts up to its capacity",
      ],
      strong: ["Notes that fixed windows are simpler to implement in a shared store"],
      redFlags: ["Says the two algorithms behave the same"],
    },
  },
  {
    id: "rate-limiting-many-instances",
    question: "How would you rate limit an API served by 50 instances behind a load balancer?",
    level: "senior",
    kind: "design",
    answer:
      "Keep counters in a shared low-latency store such as Redis, keyed by client and window or bucket, and update them atomically (a single command, a transaction or a server-side script). Apply coarse limits at the gateway to reject excess traffic cheaply, decide on fail-open versus fail-closed if the store is unavailable, and return 429 with Retry-After. For very high volumes, a sliding window counter keeps memory to two counters per key.",
    rubric: {
      core: [
        "Keeps counters in a shared low-latency store such as Redis, keyed by client",
        "Updates counters atomically: a single command, a transaction or a server-side script",
        "Decides between failing open and failing closed if the store is unavailable",
        "Returns 429 with Retry-After",
      ],
      strong: [
        "Rejects excess traffic cheaply at the gateway first",
        "Uses a sliding window counter to keep memory small",
      ],
      redFlags: [
        "Keeps per-instance counters, effectively multiplying the limit by the instance count",
      ],
    },
  },
  {
    id: "handling-429",
    question: "What should a client do when it receives a 429?",
    level: "junior",
    kind: "concept",
    answer:
      "Stop sending immediately, wait for the Retry-After duration if one is given, and otherwise retry with exponential backoff plus random jitter, up to a maximum number of attempts. It should never retry instantly in a tight loop, and should surface persistent limiting to the caller rather than hiding it.",
    rubric: {
      core: [
        "Stops sending and waits for Retry-After when it is given",
        "Otherwise retries with exponential backoff and random jitter",
        "Caps the number of attempts",
      ],
      strong: ["Surfaces persistent limiting to the caller instead of hiding it"],
      redFlags: ["Retries immediately in a tight loop"],
    },
  },
  {
    id: "rate-limits-and-overload",
    question: "Why isn't rate limiting enough to protect a service from overload?",
    level: "senior",
    kind: "concept",
    answer:
      "Limits are per client. If many clients each stay within their limits, their combined traffic can still exceed the service's capacity, and a distributed attack can spread across many identities. You also need capacity planning, autoscaling, load shedding or admission control based on the server's own health, and edge protections.",
    rubric: {
      core: [
        "Limits are per client, so many well-behaved clients can still exceed capacity",
        "Distributed attacks spread across many identities",
        "Also needs capacity planning, autoscaling, load shedding or admission control",
      ],
      strong: ["Bases load shedding on the server's own health signals"],
      redFlags: ["Believes a lower limit alone prevents overload"],
    },
  },
]);

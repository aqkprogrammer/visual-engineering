import { defineQuiz } from "@/lib/content/schema";

export default defineQuiz([
  {
    id: "scan",
    prompt:
      "A 4-slot LRU cache serves a job that reads keys A, B, C, D, E, A, B, C, D, E, … in a loop. What hit ratio do you expect?",
    options: [
      {
        id: "a",
        text: "About 80%, because four of the five keys fit.",
        explanation:
          "LRU always evicts the key used longest ago — which is exactly the key the scan needs next.",
      },
      {
        id: "b",
        text: "0% — every request misses.",
        correct: true,
        explanation:
          "Each new key evicts the one that will be requested soonest. Sequential scans larger than the cache defeat LRU and FIFO.",
      },
      {
        id: "c",
        text: "100% after the first pass.",
        explanation: "Five distinct keys can never all fit in four slots.",
      },
    ],
  },
  {
    id: "stale-after-write",
    prompt:
      "With cache-aside and no TTL, a product price is updated in the database but the cache entry is never deleted. What happens?",
    options: [
      {
        id: "a",
        text: "The cache notices the change and refreshes itself.",
        explanation: "A cache has no idea the database changed unless something tells it.",
      },
      {
        id: "b",
        text: "Readers keep getting the old price until that entry happens to be evicted.",
        correct: true,
        explanation:
          "That could be minutes or forever for a hot key. Invalidate on write, and use a TTL as a backstop.",
      },
      {
        id: "c",
        text: "The next read fails with an error.",
        explanation: "Stale data is served silently — which is what makes it dangerous.",
      },
    ],
  },
  {
    id: "stampede",
    prompt:
      "Every minute, latency spikes and database CPU jumps just after a very popular cache key expires. What is this, and what helps?",
    options: [
      {
        id: "a",
        text: "A cache stampede — coalesce misses so one request rebuilds the value, and add jitter or early refresh.",
        correct: true,
        explanation:
          "Many concurrent misses for the same key all hit the database at once. Letting one request rebuild it removes the spike.",
      },
      {
        id: "b",
        text: "Memory fragmentation — restart the cache every minute.",
        explanation: "Restarting would empty the cache and make the problem worse.",
      },
      {
        id: "c",
        text: "A hot key — shard the database.",
        explanation:
          "The spike is tied to expiry, not to the key's normal traffic, and sharding wouldn't stop duplicate rebuilds.",
      },
    ],
  },
  {
    id: "when-not",
    prompt: "Which of these is the weakest case for adding a cache?",
    options: [
      {
        id: "a",
        text: "Product pages that are read thousands of times between edits.",
        explanation:
          "Read-heavy, repeated reads, and brief staleness is acceptable — an ideal case.",
      },
      {
        id: "b",
        text: "The result of an expensive report that changes once an hour.",
        explanation:
          "Expensive to compute, rarely changes, read often — a good case, with a TTL matching the refresh.",
      },
      {
        id: "c",
        text: "Account balances that must reflect the very latest transaction on every read.",
        correct: true,
        explanation:
          "Strong freshness requirements make caching risky. Read these from the source of truth.",
      },
    ],
  },
]);

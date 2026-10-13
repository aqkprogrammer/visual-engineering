import { defineInterview } from "@/lib/content/schema";

export default defineInterview([
  {
    id: "caching-patterns",
    question: "Explain cache-aside, write-through and write-behind, and when you'd choose each.",
    level: "mid",
    kind: "trade-off",
    answer:
      "Cache-aside: the application reads the cache, loads misses from the database and populates the cache; writes go to the database and invalidate the cache. It is simple and only caches what is read. Write-through: every write updates the cache and the database together, keeping written keys fresh at the cost of slower writes. Write-behind: writes go to the cache and are persisted asynchronously, giving fast writes but risking data loss if the cache fails before flushing. Cache-aside is the usual default; write-through suits read-after-write freshness; write-behind suits write-heavy workloads that can tolerate the risk.",
    rubric: {
      core: [
        "Cache-aside: read the cache, load misses from the database, invalidate on write",
        "Write-through: writes update the cache and database together, at the cost of slower writes",
        "Write-behind: writes are persisted asynchronously, so they are fast but can be lost",
        "Gives a situation where each fits",
      ],
      strong: ["Names cache-aside as the usual default"],
      redFlags: ["Ignores what happens to unflushed writes if a write-behind cache fails"],
    },
  },
  {
    id: "cache-stampede",
    question: "What is a cache stampede and how do you prevent it?",
    level: "mid",
    kind: "debugging",
    answer:
      "When a popular entry expires or is evicted, many concurrent requests miss at the same moment and all query the backing store for the same value, potentially overloading it. Prevent it by coalescing requests so only one rebuilds the value, adding jitter to TTLs, refreshing hot keys before they expire, or serving the slightly stale value while one request refreshes it in the background.",
    rubric: {
      core: [
        "Many requests miss the same hot key at once, often when it expires",
        "They all query the backing store together and can overload it",
        "Gives at least one fix: request coalescing, TTL jitter, early refresh or serving stale data",
      ],
      strong: ["Combines fixes, for example coalescing plus jittered TTLs"],
      redFlags: ["Proposes removing the cache, which moves all of the load to the database"],
    },
  },
  {
    id: "lru-sequential-scan",
    question: "Why can LRU perform worse than no cache at all for some workloads?",
    level: "senior",
    kind: "concept",
    answer:
      "A sequential scan over more keys than the cache holds evicts each entry just before it would be reused, so every access misses and the cache still pays the cost of storing and evicting. It also pushes out the genuinely hot data, hurting other traffic. Scan-resistant policies, LFU, or bypassing the cache for batch jobs avoid this.",
    rubric: {
      core: [
        "A sequential scan over more keys than the cache holds evicts each entry just before it is reused",
        "Every access misses while the cache still pays to store and evict",
        "The scan also pushes out genuinely hot data",
      ],
      strong: ["Suggests scan-resistant policies, LFU, or bypassing the cache for batch jobs"],
      redFlags: ["Says LRU is always the best policy"],
    },
  },
  {
    id: "read-your-writes",
    question:
      "How would you make sure users see their own edits immediately when reads are cached?",
    level: "mid",
    kind: "design",
    answer:
      "Invalidate or update the cached entry as part of the write path, and for the user who just wrote, read from the source of truth (read-your-writes) for a short period or bypass the cache for that key. Keep TTLs as a backstop for missed invalidations, and be explicit about which data may be eventually consistent.",
    rubric: {
      core: [
        "Invalidates or updates the cached entry on the write path",
        "Lets the writing user read from the source of truth for a short time",
        "Keeps TTLs as a backstop for missed invalidations",
      ],
      strong: ["Is explicit about which data may be eventually consistent"],
      redFlags: ["Relies on short TTLs alone"],
    },
  },
]);

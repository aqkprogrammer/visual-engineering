import { defineInterview } from "@/lib/content/schema";

export default defineInterview([
  {
    id: "consistent-hashing-explained",
    question: "Explain consistent hashing and why it's used.",
    level: "mid",
    kind: "concept",
    answer:
      "Nodes and keys are hashed onto the same ring of values, and each key belongs to the first node clockwise from its hash. When a node joins it takes over part of one arc, and when one leaves its arc passes to its neighbour, so only a small share of keys move — unlike hash modulo N, where changing N moves almost every key. With one position per node the arcs are uneven, so systems give each node many virtual nodes, which balances data and spreads a departing node's load across many others.",
    rubric: {
      core: [
        "Nodes and keys on a ring; key owned by the next node clockwise",
        "Adding or removing a node moves only a small share of keys",
        "Contrasts with hash modulo N moving almost everything",
        "Virtual nodes for balance",
      ],
      strong: ["Mentions weighting nodes by capacity with more tokens"],
      redFlags: ["Claims it balances a single hot key"],
    },
  },
  {
    id: "choose-shard-key",
    question: "How would you choose a shard key for an orders table?",
    level: "mid",
    kind: "design",
    answer:
      "Start from the access patterns. If most queries are a customer's orders, shard by customer id: it has many values, spreads load, and keeps each customer's orders together so their queries hit one shard. Avoid low-cardinality or skewed keys such as country or status, and sequential keys such as order time with range partitioning, which send all new writes to one shard. Plan for queries that don't include the key — such as by order id or by date for reporting — with a secondary index, a lookup table or a separate analytics store.",
    rubric: {
      core: [
        "Chooses from access patterns",
        "Many values and even traffic",
        "Keeps data queried together on one shard",
        "Avoids skewed, low-cardinality or sequential keys",
      ],
      strong: ["Plans for queries without the shard key"],
      redFlags: ["Chooses a key with a handful of values"],
    },
  },
  {
    id: "hot-shard-debugging",
    question:
      "One shard's CPU is at 95% while the others are at 30%. What would you check, and how would you fix it?",
    level: "senior",
    kind: "debugging",
    answer:
      "Check whether the imbalance is in data or in traffic. Uneven data points to too few ring positions or a poor shard key; uneven traffic with even data points to hot keys. Look at per-key request rates on that shard. For a hot key, cache it in front of the database, split it into sub-keys and merge on read, or isolate it. For uneven placement, add virtual nodes or split the partition. For a skewed shard key, plan a migration to a better one.",
    rubric: {
      core: [
        "Distinguishes uneven data from uneven traffic",
        "Looks at per-key traffic for hot keys",
        "Fixes hot keys with caching or key splitting",
        "Fixes placement with virtual nodes or partition splits",
      ],
      strong: ["Notes that adding nodes doesn't fix a single hot key"],
      redFlags: ["Only suggests adding more nodes"],
    },
  },
  {
    id: "when-to-shard",
    question: "When should a team shard its database?",
    level: "junior",
    kind: "trade-off",
    answer:
      "When writes or data size outgrow what one machine can handle, after cheaper steps — better indexes and queries, caching, read replicas and a bigger machine — are exhausted. Sharding makes cross-shard queries, transactions, schema changes and operations harder permanently, so it should solve a real, measured limit.",
    rubric: {
      core: [
        "When writes or storage outgrow one machine",
        "After indexes, caching, replicas and vertical scaling",
        "Recognises the lasting complexity it adds",
      ],
      strong: ["Mentions measuring the bottleneck first"],
      redFlags: ["Shards from day one by default"],
    },
  },
]);

import { defineQuiz } from "@/lib/content/schema";

export default defineQuiz([
  {
    id: "modulo-reshuffle",
    prompt:
      "Keys are placed with hash(key) mod N. You add a fifth node to four. Roughly how much data moves?",
    options: [
      {
        id: "a",
        text: "About 80%: hash mod 4 and hash mod 5 agree for only about one key in five.",
        correct: true,
        explanation:
          "Only about 20% needed to move — the new node's fair share. That gap is why consistent hashing exists.",
      },
      {
        id: "b",
        text: "About 20%, the new node's share.",
        explanation: "That's the ideal, which modulo placement doesn't achieve.",
      },
      {
        id: "c",
        text: "None: existing keys stay where they are.",
        explanation: "Changing N changes almost every key's remainder.",
      },
    ],
  },
  {
    id: "virtual-nodes",
    prompt: "Why do systems such as Dynamo give each node many positions on the hash ring?",
    options: [
      {
        id: "a",
        text: "With one random position each, arcs differ a lot in size, so some nodes own far more data; many positions average out.",
        correct: true,
        explanation:
          "Virtual nodes also let bigger machines take more tokens and spread a departing node's load across many others.",
      },
      {
        id: "b",
        text: "To store more copies of each key.",
        explanation:
          "Replication is a separate setting; virtual nodes are about how ownership is divided.",
      },
      {
        id: "c",
        text: "Because hashing needs at least 64 values to work.",
        explanation: "Hashing works with any number of positions; balance is what improves.",
      },
    ],
  },
  {
    id: "hot-key",
    prompt:
      "One product page receives 30% of all reads during a sale. How does consistent hashing with virtual nodes help?",
    options: [
      {
        id: "a",
        text: "It doesn't: one key lives on one node. Cache it or split it into several keys.",
        correct: true,
        explanation: "Sharding spreads keys; a single hot key needs an application-level fix.",
      },
      {
        id: "b",
        text: "Virtual nodes spread the hot key's requests across all nodes.",
        explanation: "Each key still has exactly one owner on the ring.",
      },
      {
        id: "c",
        text: "Adding nodes fixes it.",
        explanation: "The key's owner stays overloaded no matter how many other nodes exist.",
      },
    ],
  },
  {
    id: "range-vs-hash",
    prompt: "A table is range-partitioned by timestamp. What problem is likely?",
    options: [
      {
        id: "a",
        text: "All new writes land on the partition holding the latest time range.",
        correct: true,
        explanation:
          "Sequential keys concentrate writes. Hashing, or prefixing with a bucket, spreads them.",
      },
      {
        id: "b",
        text: "Range scans by time become slow.",
        explanation: "Range partitioning makes range scans fast; it's the writes that concentrate.",
      },
      {
        id: "c",
        text: "Old data can't be deleted.",
        explanation: "Range partitions often make deleting old data easier.",
      },
    ],
  },
  {
    id: "shard-key-choice",
    prompt: "Which is usually the best shard key for a social app's posts?",
    options: [
      {
        id: "a",
        text: "The author's user id: many values, spread traffic, and most queries ask for a user's posts.",
        correct: true,
        explanation: "A good key spreads load and keeps data queried together on one shard.",
      },
      {
        id: "b",
        text: "The post's country.",
        explanation: "Few values and very uneven traffic make shards badly unbalanced.",
      },
      {
        id: "c",
        text: "Whether the post is public or private.",
        explanation: "Two values can only ever make two shards.",
      },
    ],
  },
]);

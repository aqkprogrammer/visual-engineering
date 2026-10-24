import { defineQuiz } from "@/lib/content/schema";

export default defineQuiz([
  {
    id: "stale-profile",
    prompt:
      "A user updates their profile, reloads the page and sees the old version. Reads go to asynchronous followers. What is the most likely cause?",
    options: [
      {
        id: "a",
        text: "Replication lag: the follower that served the read hadn't applied the change yet.",
        correct: true,
        explanation:
          "Asynchronous followers are always a little behind. Read-your-writes routing fixes it for the writer.",
      },
      {
        id: "b",
        text: "The write was lost.",
        explanation: "It is on the leader; the follower simply hasn't caught up.",
      },
      {
        id: "c",
        text: "The browser cached the page.",
        explanation: "Possible in general, but with follower reads, lag is the classic cause.",
      },
    ],
  },
  {
    id: "async-failover-loss",
    prompt:
      "With asynchronous replication, the leader crashes and a follower is promoted. What can happen to writes the leader had already confirmed?",
    options: [
      {
        id: "a",
        text: "Any it hadn't yet sent to the promoted follower are lost.",
        correct: true,
        explanation:
          "PostgreSQL's documentation puts it plainly: data loss is proportional to the replication delay at failover.",
      },
      {
        id: "b",
        text: "Nothing: confirmed writes are always on every replica.",
        explanation: "Asynchronous replication confirms writes before followers have them.",
      },
      {
        id: "c",
        text: "They are replayed automatically when the old leader restarts.",
        explanation:
          "The old leader's unshipped writes conflict with the new history; they aren't simply replayed.",
      },
    ],
  },
  {
    id: "sync-cost",
    prompt: "What does synchronous replication to one follower cost?",
    options: [
      {
        id: "a",
        text: "At least one network round trip per commit, and writes wait if that follower is unavailable.",
        correct: true,
        explanation: "That is the price of not losing acknowledged writes when the leader fails.",
      },
      {
        id: "b",
        text: "Nothing: it only changes how reads work.",
        explanation: "It changes when a write is acknowledged, which adds latency.",
      },
      {
        id: "c",
        text: "It doubles the storage on the leader.",
        explanation: "Storage is the same; the cost is latency and dependency on the follower.",
      },
    ],
  },
  {
    id: "quorum-overlap",
    prompt:
      "A leaderless store keeps N = 3 copies. Which settings guarantee a read overlaps the latest acknowledged write?",
    options: [
      {
        id: "a",
        text: "W = 2 and R = 2, because R + W > N.",
        correct: true,
        explanation:
          "Any two replicas read must include at least one of the two that acknowledged the write.",
      },
      {
        id: "b",
        text: "W = 1 and R = 1.",
        explanation:
          "R + W = 2 is not greater than 3: the read may hit a replica that missed the write.",
      },
      {
        id: "c",
        text: "W = 1 and R = 2.",
        explanation: "R + W = 3 equals N, so the sets can still miss each other.",
      },
    ],
  },
  {
    id: "replicas-scale",
    prompt: "Which does adding more followers scale?",
    options: [
      {
        id: "a",
        text: "Read capacity — every follower still has to apply every write.",
        correct: true,
        explanation: "To scale writes, data has to be split across nodes, which is sharding.",
      },
      {
        id: "b",
        text: "Write capacity, because writes are spread across them.",
        explanation: "In leader-follower replication, all writes go through the leader.",
      },
      {
        id: "c",
        text: "Both reads and writes equally.",
        explanation: "Writes are not spread; every node does all of them.",
      },
    ],
  },
]);

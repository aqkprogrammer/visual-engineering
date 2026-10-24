import { defineInterview } from "@/lib/content/schema";

export default defineInterview([
  {
    id: "sync-vs-async-replication",
    question: "Compare synchronous and asynchronous replication. When would you choose each?",
    level: "mid",
    kind: "trade-off",
    answer:
      "Asynchronous replication acknowledges a write as soon as the leader has it, so writes are fast and don't depend on followers, but a leader crash can lose writes that hadn't shipped, and followers lag. Synchronous replication waits for at least one follower before acknowledging, so acknowledged writes survive the loss of the leader, at the cost of a network round trip per commit and writes stalling if the synchronous follower is unavailable. A common compromise is one synchronous follower nearby plus asynchronous followers elsewhere, with a fallback if the synchronous one fails.",
    rubric: {
      core: [
        "Async: fast, but can lose unshipped writes on failover and has lag",
        "Sync: no loss of acknowledged writes, but adds latency per commit",
        "Sync writes stall if the synchronous follower is unavailable",
      ],
      strong: ["Suggests one nearby synchronous follower plus asynchronous ones, with a fallback"],
      redFlags: ["Says synchronous replication has no performance cost"],
    },
  },
  {
    id: "replica-read-your-writes",
    question:
      "Users sometimes don't see changes they just made. Reads go to replicas. How would you fix it?",
    level: "mid",
    kind: "debugging",
    answer:
      "It is replication lag: the replica serving the read hasn't applied the user's write yet. Provide read-your-writes consistency: route a user's reads to the leader for a short window after they write, or record the log position of their last write and read only from replicas that have replayed past it, or use synchronous apply for that data. Also check whether lag has grown, since a fixed window only works while lag stays shorter than it.",
    rubric: {
      core: [
        "Identifies replication lag",
        "Provides read-your-writes: leader reads after writes, or log-position tracking",
        "Checks and monitors replica lag",
      ],
      strong: ["Notes that a fixed window fails once lag exceeds it"],
      redFlags: ["Proposes sending all reads to the leader without considering load"],
    },
  },
  {
    id: "failover-design",
    question: "Design automatic failover for a leader-follower database.",
    level: "senior",
    kind: "design",
    answer:
      "Health checks detect the leader's failure after a timeout chosen to balance false alarms against downtime. A coordinator — ideally backed by consensus — promotes the most up-to-date follower, fences the old leader so it can't accept writes if it returns (preventing split brain), repoints the other followers, and updates how clients find the leader, through DNS, a proxy or service discovery. The design should state how much data an asynchronous failover can lose, test failover regularly, and alert when lag makes that loss unacceptable.",
    rubric: {
      core: [
        "Detection with timeouts",
        "Promotes the most up-to-date follower",
        "Fences the old leader to prevent split brain",
        "Redirects clients to the new leader",
      ],
      strong: [
        "Uses consensus for leader election",
        "States the data-loss window and rehearses failover",
      ],
      redFlags: ["Ignores the possibility of two leaders"],
    },
  },
  {
    id: "quorum-basics",
    question:
      "What do N, R and W mean in a quorum-replicated store, and why does R + W > N matter?",
    level: "junior",
    kind: "concept",
    answer:
      "N is the number of copies of each item, W the number of replicas that must acknowledge a write, and R the number that must answer a read. If R + W > N, the set of replicas read always overlaps the set that acknowledged the latest write, so a read can see it. Lower R or W gives lower latency and higher availability but weaker guarantees; (3, 2, 2) is a common choice.",
    rubric: {
      core: [
        "Defines N, R and W correctly",
        "R + W > N makes read and write sets overlap",
        "Lower R or W trades consistency for latency and availability",
      ],
      strong: ["Gives (3, 2, 2) or majority quorums as a typical setting"],
      redFlags: ["Thinks R + W > N makes the store linearizable in all cases"],
    },
  },
]);

import { defineQuiz } from "@/lib/content/schema";

export default defineQuiz([
  {
    id: "cap-choice",
    prompt: "What does the CAP theorem actually force a replicated system to choose?",
    options: [
      {
        id: "a",
        text: "During a network partition, whether to refuse some requests (consistency) or answer them from possibly divergent data (availability).",
        correct: true,
        explanation:
          'Without a partition, a system can be both consistent and available. Brewer called the "2 of 3" framing misleading.',
      },
      {
        id: "b",
        text: "Any two of consistency, availability and partition tolerance, permanently.",
        explanation:
          "Partitions can't be designed away in a distributed system; the choice is what to do when one happens.",
      },
      {
        id: "c",
        text: "Between low latency and high throughput.",
        explanation:
          "That is a different trade-off. PACELC adds latency versus consistency when there's no partition.",
      },
    ],
  },
  {
    id: "pacelc",
    prompt:
      "A strongly consistent multi-region database is slow even when the network is healthy. Which idea explains it?",
    options: [
      {
        id: "a",
        text: "PACELC: else (no partition), the trade-off is latency versus consistency — consistent writes wait for other replicas.",
        correct: true,
        explanation:
          "Abadi's point: CAP only covers partitions; most of the time the cost of consistency is latency.",
      },
      {
        id: "b",
        text: "The CAP theorem says consistent systems are always slow.",
        explanation: "CAP doesn't mention latency at all.",
      },
      {
        id: "c",
        text: "It must be partitioned.",
        explanation: "The network is healthy; waiting for other regions is the normal cost.",
      },
    ],
  },
  {
    id: "minority-side",
    prompt: "Three replicas use majority quorums. A partition isolates one replica. What happens?",
    options: [
      {
        id: "a",
        text: "The two connected replicas keep serving; the isolated one refuses requests because it can't reach a majority.",
        correct: true,
        explanation: "Two of three is a majority, one of three isn't.",
      },
      {
        id: "b",
        text: "All three replicas stop.",
        explanation: "The majority side can still form quorums.",
      },
      {
        id: "c",
        text: "All three keep accepting writes.",
        explanation: "That would be AP behaviour; a quorum system refuses on the minority side.",
      },
    ],
  },
  {
    id: "lww-counter",
    prompt:
      "Two partitioned replicas both increment a counter. On healing, the system keeps the value with the newest timestamp. What happens?",
    options: [
      {
        id: "a",
        text: "One side's increments are lost.",
        correct: true,
        explanation:
          "Last-writer-wins keeps one value and discards the concurrent one. Counters need a mergeable type.",
      },
      {
        id: "b",
        text: "The increments are added together.",
        explanation: "That's what a CRDT counter does; last-writer-wins doesn't.",
      },
      {
        id: "c",
        text: "The system rejects both values.",
        explanation: "It keeps the newest one.",
      },
    ],
  },
  {
    id: "crdt",
    prompt: "What makes a grow-only counter CRDT safe to merge after a partition?",
    options: [
      {
        id: "a",
        text: "Each replica keeps its own tally; merging takes the larger tally per replica and the value is their sum, so nothing is double-counted or lost.",
        correct: true,
        explanation:
          "The merge is order-independent and idempotent, so replicas that have seen the same updates converge.",
      },
      {
        id: "b",
        text: "It uses synchronised clocks.",
        explanation: "CRDTs don't rely on clocks to merge.",
      },
      {
        id: "c",
        text: "It stops accepting writes during a partition.",
        explanation: "CRDTs are designed for the opposite: accept writes anywhere and merge later.",
      },
    ],
  },
]);

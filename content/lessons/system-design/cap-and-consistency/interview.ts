import { defineInterview } from "@/lib/content/schema";

export default defineInterview([
  {
    id: "explain-cap-properly",
    question: "Explain the CAP theorem, and what people often get wrong about it.",
    level: "mid",
    kind: "concept",
    answer:
      "When a network partition separates replicas, a system must choose between consistency — refusing requests it can't coordinate so every read sees the latest write — and availability — answering every request even though the sides may diverge. The common mistake is the \"pick two of three\" framing: partitions aren't optional, and without one a system can be both consistent and available. The choice can also differ per operation. PACELC adds the everyday trade-off: without a partition, stronger consistency costs latency.",
    rubric: {
      core: [
        "States the choice applies during a partition",
        "Consistency means refusing; availability means answering with possibly divergent data",
        'Rejects the "pick two" framing',
      ],
      strong: ["Mentions PACELC and latency", "Notes choices can differ per operation"],
      redFlags: ["Says a system can drop partition tolerance"],
    },
  },
  {
    id: "choose-consistency-per-feature",
    question:
      "For a social app, which features would you make strongly consistent and which eventually consistent?",
    level: "senior",
    kind: "design",
    answer:
      "Strong where a wrong or conflicting answer causes harm: unique usernames, payments and balances, account security settings, and anything with limited stock such as tickets. Eventual where staying fast and available matters more than exact agreement: like and view counts, feeds, follower counts, notifications. For the eventual ones, choose merge rules — counters as CRDTs, sets with add/remove semantics — and give users read-your-writes for their own changes. Measure the latency cost of strong consistency across regions before applying it widely.",
    rubric: {
      core: [
        "Strong for uniqueness, money and limited stock",
        "Eventual for counts, feeds and notifications",
        "Explicit merge rules for eventually consistent data",
      ],
      strong: ["Read-your-writes for the user's own changes", "Considers cross-region latency"],
      redFlags: ["Makes everything strongly consistent without considering latency"],
    },
  },
  {
    id: "lost-updates-after-partition",
    question:
      "After a network incident between regions, some users' likes and cart items disappeared. What happened and how would you prevent it?",
    level: "mid",
    kind: "debugging",
    answer:
      "Both regions accepted writes during the partition, and on healing the conflicts were resolved by last-writer-wins, which keeps one version of each item and discards concurrent changes. Prevent it with mergeable data types — a counter CRDT for likes, a set CRDT or per-item records for carts — or by storing changes as events and recomputing, or by routing each key's writes to a single home region.",
    rubric: {
      core: [
        "Identifies concurrent writes on both sides of the partition",
        "Identifies last-writer-wins discarding updates",
        "Proposes mergeable types, events or single-home writes",
      ],
      strong: ['Mentions clock skew making "last" unreliable'],
      redFlags: ["Blames replication lag alone"],
    },
  },
  {
    id: "quorum-partition",
    question:
      "Three replicas use majority quorum reads and writes. What happens to each side of a partition that isolates one replica?",
    level: "junior",
    kind: "concept",
    answer:
      "The two replicas that can still reach each other form a majority and keep serving consistent reads and writes. The isolated replica can't reach a majority, so it refuses them — the system chooses consistency over availability on that side. When the partition heals, the isolated replica catches up; nothing conflicts because it accepted nothing.",
    rubric: {
      core: [
        "Majority side keeps working",
        "Minority side refuses requests",
        "No conflicts to reconcile afterwards",
      ],
      strong: [
        "Notes latency may rise on the majority side if its nearest peer was the isolated one",
      ],
      redFlags: ["Thinks all replicas stop"],
    },
  },
]);

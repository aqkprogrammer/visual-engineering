import { defineInterview } from "@/lib/content/schema";

export default defineInterview([
  {
    id: "blue-green-vs-canary",
    question: "Compare blue-green and canary deployments. When would you choose each?",
    level: "mid",
    kind: "trade-off",
    answer:
      "Blue-green runs a full new environment beside the old one and switches all traffic at once; rollback is switching back while the old environment still runs. It is simple to reason about but exposes every user at the switch and briefly doubles capacity. A canary sends a small share of traffic to the new version, compares it with the old, and widens in stages, limiting how many users a bad release can reach, but it needs traffic splitting and per-version metrics. Choose canary when bad releases are costly and you can measure per version; blue-green when you need whole-environment switches.",
    rubric: {
      core: [
        "Blue-green switches all traffic at once and rolls back by switching back",
        "Canary exposes a small share first and widens only if it compares well",
        "Blue-green limits rollback time; canary limits blast radius",
      ],
      strong: [
        "Mentions the cost: double capacity for blue-green, traffic splitting and metrics for canary",
      ],
      redFlags: ["Claims blue-green limits how many users see a bug"],
    },
  },
  {
    id: "canary-analysis",
    question: "How do you decide automatically whether a canary is healthy?",
    level: "senior",
    kind: "design",
    answer:
      "Compare the canary population with a control population running the old version, over the same period, on error rate, latency and key business metrics, and roll back if the canary is meaningfully worse. Don't rely on service-wide totals: a small canary's errors are diluted, so 20% failures on 5% of traffic is only about one point overall. Also check absolute objectives, since both populations can degrade together. Make the canary large and long enough to be representative.",
    rubric: {
      core: [
        "Compares the canary with a control running the old version",
        "Explains that aggregate metrics dilute a small canary's problems",
        "Rolls back automatically when the canary is meaningfully worse",
      ],
      strong: ["Also checks absolute SLOs, and sizes the canary to be representative"],
      redFlags: ["Watches only the overall error rate"],
    },
  },
  {
    id: "safe-database-migrations",
    question:
      "Why can't you always roll back a release, and how do you make releases with database changes safe?",
    level: "senior",
    kind: "debugging",
    answer:
      "Rollback restores code, not data. If the new version changed the schema or wrote data the old version can't read, the old code fails after rollback. Make changes backward-compatible in steps: add new columns or tables, deploy code that works with both shapes, migrate data, switch reads, and only remove the old structure in a later release once nothing needs it. Then either version can run at any time, so rollbacks stay safe.",
    rubric: {
      core: [
        "Rollback reverts code but not data or schema changes",
        "Uses backward-compatible, multi-step migrations (expand then contract)",
        "Removes old structures only in a later release",
      ],
      strong: ["Separates schema migrations from code deployments"],
      redFlags: ["Assumes rollback always restores the previous state"],
    },
  },
  {
    id: "rolling-update-defaults",
    question: "What do maxSurge and maxUnavailable control in a Kubernetes rolling update?",
    level: "junior",
    kind: "concept",
    answer:
      "maxUnavailable is how many pods, below the desired count, may be unavailable during the update; maxSurge is how many extra pods may be created above it. Both default to 25%. Setting maxUnavailable to 0 and maxSurge above 0 keeps full capacity by starting new pods before removing old ones, at the cost of temporarily running more pods.",
    rubric: {
      core: [
        "maxUnavailable limits pods below the desired count during the update",
        "maxSurge limits extra pods above the desired count",
        "Both default to 25%",
      ],
      strong: ["Explains the trade-off of maxUnavailable 0: full capacity, more pods"],
      redFlags: ["Confuses rolling updates with the Recreate strategy"],
    },
  },
]);

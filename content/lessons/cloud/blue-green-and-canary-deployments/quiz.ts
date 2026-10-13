import { defineQuiz } from "@/lib/content/schema";

export default defineQuiz([
  {
    id: "canary-definition",
    prompt: "What is a canary release?",
    options: [
      {
        id: "a",
        text: "Sending a small share of real traffic to the new version and comparing its behaviour with the old version before widening it.",
        correct: true,
        explanation:
          "A canary is a partial, time-limited deployment whose metrics are evaluated against a control group before the rollout continues.",
      },
      {
        id: "b",
        text: "Running the new version in a staging environment with test traffic.",
        explanation: "That is pre-production testing. A canary uses real production traffic.",
      },
      {
        id: "c",
        text: "Replacing all instances in small batches without measuring anything.",
        explanation:
          "That is a rolling update. What makes a canary is evaluating it before continuing.",
      },
    ],
  },
  {
    id: "aggregate-dilution",
    prompt:
      "A canary takes 5% of traffic and fails 20% of its requests. Roughly how much does the service-wide error rate rise?",
    options: [
      {
        id: "a",
        text: "About 1 percentage point — easy to miss without comparing canary and control.",
        correct: true,
        explanation:
          "5% × 20% = 1%. That's why canary analysis compares populations instead of watching the total.",
      },
      {
        id: "b",
        text: "About 20 percentage points.",
        explanation:
          "Only 5% of traffic goes to the canary, so its errors are diluted twentyfold in the total.",
      },
      {
        id: "c",
        text: "Not at all, because canary traffic isn't counted.",
        explanation:
          "Canary requests are real requests and count towards the service's error rate.",
      },
    ],
  },
  {
    id: "blue-green-rollback",
    prompt: "What makes rollback fast with blue-green deployments?",
    options: [
      {
        id: "a",
        text: "The old environment is still running, so rolling back is just switching traffic back to it.",
        correct: true,
        explanation: "Nothing has to be rebuilt or restarted while the old fleet is kept.",
      },
      {
        id: "b",
        text: "Blue-green deployments can't contain bugs.",
        explanation:
          "The new version can be just as buggy; blue-green changes how quickly you can undo it, not whether it's correct.",
      },
      {
        id: "c",
        text: "Only a few users ever see the new version.",
        explanation: "That describes a canary. With blue-green, everyone switches at once.",
      },
    ],
  },
  {
    id: "recreate-downtime",
    prompt:
      "Why does an all-at-once (recreate) deployment cause downtime even for a healthy release?",
    options: [
      {
        id: "a",
        text: "Every old instance stops before the new ones are ready, so for a while nothing is serving.",
        correct: true,
        explanation:
          "Kubernetes' Recreate strategy, for example, kills all existing pods before creating new ones.",
      },
      {
        id: "b",
        text: "It doesn't — only buggy releases cause downtime.",
        explanation:
          "The gap between stopping the old and starting the new exists regardless of the code's quality.",
      },
      {
        id: "c",
        text: "Because it doubles the number of instances.",
        explanation: "That's blue-green's cost. All-at-once never runs both versions.",
      },
    ],
  },
  {
    id: "rollback-limits",
    prompt:
      "A release added a database migration that drops a column the old version reads. What happens on rollback?",
    options: [
      {
        id: "a",
        text: "The old code comes back but fails, because the data it needs is gone.",
        correct: true,
        explanation:
          "Rolling back code doesn't roll back data. Backward-compatible migrations avoid this: remove columns only in a later release.",
      },
      {
        id: "b",
        text: "The rollback restores the column automatically.",
        explanation: "Deployment tools roll back application versions, not database contents.",
      },
      {
        id: "c",
        text: "Nothing — the old version ignores missing columns.",
        explanation: "Code that reads a column usually fails when it no longer exists.",
      },
    ],
  },
]);

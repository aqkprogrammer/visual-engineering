import { defineLesson } from "@/lib/content/schema";

export default defineLesson({
  slug: "blue-green-and-canary-deployments",
  domain: "cloud",
  module: "delivery",
  order: 10,
  title: "Blue-green and canary deployments",
  description:
    "How all-at-once, rolling, blue-green and canary releases differ in risk, cost and rollback speed — and why canaries catch bugs before most users see them.",
  difficulty: "intermediate",
  prerequisites: ["system-design/load-balancing"],
  related: ["containers/kubernetes-self-healing", "cloud/autoscaling"],
  tags: ["deployment", "canary", "blue-green", "rollback", "continuous-delivery"],
  references: [
    {
      title: "Canarying Releases (The Site Reliability Workbook)",
      url: "https://sre.google/workbook/canarying-releases/",
      publisher: "Google",
      kind: "book",
    },
    {
      title: "Deployments",
      url: "https://kubernetes.io/docs/concepts/workloads/controllers/deployment/",
      publisher: "Kubernetes",
      kind: "official-docs",
    },
    {
      title: "Blue/Green Deployments on AWS",
      url: "https://docs.aws.amazon.com/whitepapers/latest/overview-deployment-options/bluegreen-deployments.html",
      publisher: "Amazon Web Services",
      kind: "article",
    },
  ],
  lastReviewed: "2026-10-13",
  status: "published",
});

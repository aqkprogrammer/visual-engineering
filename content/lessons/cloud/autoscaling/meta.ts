import { defineLesson } from "@/lib/content/schema";

export default defineLesson({
  slug: "autoscaling",
  domain: "cloud",
  module: "operations",
  order: 10,
  title: "How autoscaling works",
  description:
    "How target tracking adds and removes capacity, why new instances always arrive late, and how targets, start-up time and scale-in windows trade cost for reliability.",
  difficulty: "intermediate",
  prerequisites: ["system-design/load-balancing"],
  related: ["cloud/regions-and-availability-zones", "system-design/rate-limiting"],
  tags: ["autoscaling", "capacity", "target-tracking", "cost", "elasticity"],
  references: [
    {
      title: "Target tracking scaling policies for Amazon EC2 Auto Scaling",
      url: "https://docs.aws.amazon.com/autoscaling/ec2/userguide/as-scaling-target-tracking.html",
      publisher: "Amazon Web Services",
      kind: "official-docs",
    },
    {
      title: "Horizontal Pod Autoscaling",
      url: "https://kubernetes.io/docs/tasks/run-application/horizontal-pod-autoscale/",
      publisher: "Kubernetes",
      kind: "official-docs",
    },
    {
      title: "Scaling cooldowns for Amazon EC2 Auto Scaling",
      url: "https://docs.aws.amazon.com/autoscaling/ec2/userguide/ec2-auto-scaling-scaling-cooldowns.html",
      publisher: "Amazon Web Services",
      kind: "official-docs",
    },
  ],
  lastReviewed: "2026-10-13",
  status: "published",
});

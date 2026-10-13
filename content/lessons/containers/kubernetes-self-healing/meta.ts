import { defineLesson } from "@/lib/content/schema";

export default defineLesson({
  slug: "kubernetes-self-healing",
  domain: "containers",
  module: "operations",
  order: 30,
  title: "How Kubernetes heals itself",
  description:
    "What really happens when a container crashes, a pod is deleted or a node dies — and what Kubernetes guarantees, what it doesn't, and how long recovery takes.",
  difficulty: "intermediate",
  related: ["system-design/load-balancing"],
  tags: ["kubernetes", "reliability", "probes", "replicaset", "self-healing"],
  references: [
    {
      title: "Pod Lifecycle",
      url: "https://kubernetes.io/docs/concepts/workloads/pods/pod-lifecycle/",
      publisher: "Kubernetes",
      kind: "official-docs",
    },
    {
      title: "Configure Liveness, Readiness and Startup Probes",
      url: "https://kubernetes.io/docs/tasks/configure-pod-container/configure-liveness-readiness-startup-probes/",
      publisher: "Kubernetes",
      kind: "official-docs",
    },
    {
      title: "Deployments",
      url: "https://kubernetes.io/docs/concepts/workloads/controllers/deployment/",
      publisher: "Kubernetes",
      kind: "official-docs",
    },
    {
      title: "ReplicaSet",
      url: "https://kubernetes.io/docs/concepts/workloads/controllers/replicaset/",
      publisher: "Kubernetes",
      kind: "official-docs",
    },
    {
      title: "Taints and Tolerations",
      url: "https://kubernetes.io/docs/concepts/scheduling-eviction/taint-and-toleration/",
      publisher: "Kubernetes",
      kind: "official-docs",
    },
    {
      title: "Service",
      url: "https://kubernetes.io/docs/concepts/services-networking/service/",
      publisher: "Kubernetes",
      kind: "official-docs",
    },
  ],
  lastReviewed: "2026-10-12",
  status: "published",
});

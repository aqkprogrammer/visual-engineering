import { definePlayground } from "@/lib/content/schema";

/**
 * Interactive demos listed at /playground. Each `slug` must have a component registered in
 * components/visualizations/demo-registry.tsx (checked by tests).
 */
export default definePlayground([
  {
    slug: "load-balancer",
    title: "Load balancer simulator",
    summary:
      "Send traffic through a load balancer, crash servers, switch routing algorithms and watch health checks, queues and tail latency respond.",
    domain: "system-design",
    lesson: "system-design/load-balancing",
    kind: "simulation",
    tryThis: [
      "Press Play, then crash app-2. Requests to it fail until it has failed two health checks; after that, traffic flows only to the remaining servers.",
      "Turn health checks off and crash a server. The errors never stop — nothing tells the balancer the server is gone.",
      "Set traffic to High with 40% heavy requests, then switch between round robin and least connections and compare queues and p95 latency.",
      "Remove a server while traffic is flowing. It drains — finishing in-flight work without accepting new requests — so nothing fails.",
      "Under Medium traffic, crash two servers. Requests still succeed, but the survivor's queue and latency climb: availability survived, capacity did not.",
    ],
    references: [
      {
        title: "Using nginx as HTTP load balancer",
        url: "https://nginx.org/en/docs/http/load_balancing.html",
        publisher: "nginx.org",
        kind: "official-docs",
      },
      {
        title: "Health checks for Application Load Balancer target groups",
        url: "https://docs.aws.amazon.com/elasticloadbalancing/latest/application/target-group-health-checks.html",
        publisher: "Amazon Web Services",
        kind: "official-docs",
      },
    ],
  },
  {
    slug: "tls-handshake",
    title: "TLS 1.3 handshake, step by step",
    summary:
      "Walk through every message of a TLS 1.3 handshake, see what each side knows at each moment, and compare it with what an eavesdropper can read.",
    domain: "networking",
    kind: "walkthrough",
    tryThis: [
      "Step through slowly and watch the two ‘knows’ panels: both sides end up with the same shared secret, yet it never crosses the network.",
      "Switch to the eavesdropper's view. Only the two Hello messages are readable — in TLS 1.3 even the certificate is encrypted.",
      "Count the round trips before the browser sends its HTTP request: just one.",
    ],
    references: [
      {
        title: "RFC 8446: The Transport Layer Security (TLS) Protocol Version 1.3",
        url: "https://www.rfc-editor.org/rfc/rfc8446",
        publisher: "IETF",
        kind: "specification",
      },
      {
        title: "A Detailed Look at RFC 8446 (a.k.a. TLS 1.3)",
        url: "https://blog.cloudflare.com/rfc-8446-aka-tls-1-3/",
        publisher: "Cloudflare",
        kind: "article",
      },
    ],
  },
  {
    slug: "kubernetes-self-healing",
    title: "Kubernetes self-healing",
    summary:
      "Crash containers, delete pods and take down a node, then watch the kubelet, ReplicaSet, scheduler and node controller each play their part.",
    domain: "containers",
    kind: "simulation",
    tryThis: [
      "Crash a container. The same pod restarts in place — watch RESTARTS increase — and it leaves the Service's endpoints until its readiness probe passes again.",
      "Crash the same container again right away. The back-off doubles: this is what CrashLoopBackOff means.",
      "Delete a pod. The ReplicaSet creates a replacement with a new name before the old pod has even finished terminating.",
      "Fail a node. For a few steps the Service still routes to pods that are already dead; then the node is marked NotReady, and replacements appear only after the default toleration expires.",
      "Scale to 5 replicas, then back down to 2.",
    ],
    references: [
      {
        title: "Pod Lifecycle",
        url: "https://kubernetes.io/docs/concepts/workloads/pods/pod-lifecycle/",
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
    ],
  },
]);

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
    lesson: "networking/tls-handshake",
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
    lesson: "containers/kubernetes-self-healing",
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
  {
    slug: "cache",
    title: "Cache simulator",
    summary:
      "Watch hits, misses and evictions as you change the eviction policy, capacity, access pattern and expiry — then write to the database and catch a stale read.",
    domain: "system-design",
    lesson: "system-design/caching",
    kind: "simulation",
    tryThis: [
      "Switch to Sequential scan with LRU: eight keys cycling through four slots means every single request misses.",
      "Turn off Invalidate on write, press Play, then write a new version of A. The cache keeps serving the old value until A is evicted.",
      "With invalidation still off, set a TTL of 10 requests and repeat: the staleness now has an upper bound.",
      "Under Hot keys, compare LRU and LFU at capacity 2 and 4, and watch the hit ratio.",
    ],
    references: [
      {
        title: "Key eviction",
        url: "https://redis.io/docs/latest/develop/reference/eviction/",
        publisher: "Redis",
        kind: "official-docs",
      },
      {
        title: "Caching strategies (Amazon ElastiCache)",
        url: "https://docs.aws.amazon.com/AmazonElastiCache/latest/dg/Strategies.html",
        publisher: "Amazon Web Services",
        kind: "official-docs",
      },
    ],
  },
  {
    slug: "rate-limiter",
    title: "Rate limiter simulator",
    summary:
      "Compare token bucket, fixed window, sliding log and sliding window counter on the same traffic, and see a fixed window let twice the limit through.",
    domain: "system-design",
    lesson: "system-design/rate-limiting",
    kind: "simulation",
    tryThis: [
      "Choose Fixed window with Window-edge bursts and watch the peak in any one second reach twice the limit.",
      "Keep that traffic and switch to Sliding log: the peak never exceeds the limit.",
      "Choose Token bucket with Bursty traffic: a full bucket absorbs a burst, then the limiter settles to the refill rate.",
      "Try Sliding counter on the same bursts and compare it with the exact sliding log.",
    ],
    references: [
      {
        title: "How we built rate limiting capable of scaling to millions of domains",
        url: "https://blog.cloudflare.com/counting-things-a-lot-of-different-things/",
        publisher: "Cloudflare",
        kind: "article",
      },
      {
        title: "Throttle requests to your REST APIs in API Gateway",
        url: "https://docs.aws.amazon.com/apigateway/latest/developerguide/api-gateway-request-throttling.html",
        publisher: "Amazon Web Services",
        kind: "official-docs",
      },
    ],
  },
  {
    slug: "embeddings",
    title: "Embedding similarity explorer",
    summary:
      "Pick a word in a toy embedding space and compare how cosine similarity, dot product and Euclidean distance rank its nearest neighbours.",
    domain: "ai",
    lesson: "ai/embeddings",
    kind: "explorer",
    tryThis: [
      "Pick cat and switch from Cosine to Dot product: the deliberately long animals vector jumps to the top.",
      "Pick any fruit: its nearest neighbours are other fruit, while vehicles point in a different direction.",
      "Switch to Euclidean and notice that a vector can point the same way yet be far away.",
    ],
    references: [
      {
        title: "Embeddings (Machine Learning Crash Course)",
        url: "https://developers.google.com/machine-learning/crash-course/embeddings",
        publisher: "Google",
        kind: "official-docs",
      },
    ],
  },
]);

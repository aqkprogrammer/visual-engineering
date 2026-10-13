import { defineLearningPaths } from "@/lib/content/schema";

/**
 * Learning paths: ordered sequences of published lessons. Validated by `pnpm content` — every step
 * must be a published lesson and must come after its own prerequisites.
 */
export default defineLearningPaths([
  {
    slug: "how-a-web-request-is-served",
    title: "How a web request is served",
    summary:
      "Follow one request from a typed address to a database row: name lookup, encryption, load balancing, caching and the index that finds the data.",
    audience:
      "Anyone who uses the web and wants to know what happens between pressing Enter and seeing the page. No background needed.",
    outcomes: [
      "Explain each hop a request takes, in order, and why it exists",
      "Say where latency comes from and which layer caches or skips work",
      "Recognise which layer is failing from a symptom such as a certificate error or slow query",
    ],
    steps: [
      {
        lesson: "networking/dns-resolution",
        why: "Before anything else, the browser turns a name into an IP address it can connect to.",
      },
      {
        lesson: "networking/tls-handshake",
        why: "The connection is encrypted and the server proves its identity before any data is sent.",
      },
      {
        lesson: "system-design/load-balancing",
        why: "The request reaches a load balancer that picks one healthy server out of many.",
      },
      {
        lesson: "system-design/caching",
        why: "The server checks a cache first, so popular answers skip the slow work entirely.",
      },
      {
        lesson: "computer-science/database-indexes",
        why: "On a cache miss, the database uses an index to find the row without reading the whole table.",
      },
    ],
  },
  {
    slug: "system-design-foundations",
    title: "System design foundations",
    summary:
      "The building blocks behind most system design discussions: spreading load, caching, indexing, protecting capacity and decoupling work with queues.",
    audience:
      "Developers preparing for system design interviews or starting to own backend services, who want the trade-offs behind each building block.",
    outcomes: [
      "Choose between load-balancing, caching and queueing strategies and justify the trade-offs",
      "Predict how each component behaves when a dependency slows down or fails",
      "Answer common interview questions with the mechanism, not just the name",
    ],
    steps: [
      {
        lesson: "system-design/load-balancing",
        why: "Spreading traffic across servers is the first step to both scale and availability.",
      },
      {
        lesson: "system-design/caching",
        why: "Caches cut load and latency, and introduce the classic stale-data trade-off.",
      },
      {
        lesson: "computer-science/database-indexes",
        why: "Most slow endpoints end at a slow query; indexes are the first tool to reach for.",
      },
      {
        lesson: "system-design/rate-limiting",
        why: "Limits protect shared capacity from bursts, abuse and runaway retries.",
      },
      {
        lesson: "system-design/message-queues",
        why: "Queues absorb bursts and decouple services, and teach backpressure and idempotency.",
      },
    ],
  },
  {
    slug: "shipping-with-containers",
    title: "Shipping software with containers",
    summary:
      "From a Dockerfile to a self-healing deployment: how images are built and cached, how traffic is spread, and how Kubernetes keeps pods running.",
    audience:
      "Developers who build or deploy services and want to understand what their container image and Kubernetes cluster are actually doing.",
    outcomes: [
      "Write Dockerfiles that build quickly by making good use of the layer cache",
      "Explain how Kubernetes restarts, reschedules and replaces failed pods, and its limits",
      "Diagnose CrashLoopBackOff, unready pods and slow image builds",
    ],
    steps: [
      {
        lesson: "containers/docker-images-and-layers",
        why: "Everything starts with the image: what is in it and how layers make builds fast.",
      },
      {
        lesson: "system-design/load-balancing",
        why: "Health checks and traffic spreading are the ideas Kubernetes Services build on.",
      },
      {
        lesson: "containers/kubernetes-self-healing",
        why: "Controllers, probes and the scheduler keep the declared number of pods running.",
      },
      {
        lesson: "cloud/blue-green-and-canary-deployments",
        why: "Shipping a new version safely: rolling updates, blue-green and canaries, and rollback.",
      },
    ],
  },
  {
    slug: "running-in-the-cloud",
    title: "Running applications in the cloud",
    summary:
      "Keep a service up through failures, traffic swings and releases: spreading load, surviving zone outages, autoscaling and deploying safely.",
    audience:
      "Developers and new operators putting services on a cloud platform who want to understand what keeps them available, and what it costs.",
    outcomes: [
      "Design a deployment that survives losing an Availability Zone",
      "Choose autoscaling targets and settings and predict their failure modes",
      "Pick a deployment strategy and explain how it limits the damage of a bad release",
    ],
    steps: [
      {
        lesson: "system-design/load-balancing",
        why: "Every cloud architecture starts by spreading traffic across interchangeable servers.",
      },
      {
        lesson: "cloud/regions-and-availability-zones",
        why: "Where those servers run decides which failures you survive.",
      },
      {
        lesson: "cloud/autoscaling",
        why: "Capacity that follows demand — and the lag that comes with it.",
      },
      {
        lesson: "cloud/blue-green-and-canary-deployments",
        why: "Most incidents start with a change; the strategy decides how many users it reaches.",
      },
    ],
  },
  {
    slug: "ai-engineering-foundations",
    title: "AI engineering foundations",
    summary:
      "How language-model applications see and find text: tokens, embeddings and vector search, and retrieval-augmented generation built on top of them.",
    audience:
      "Engineers building with language models who want to understand cost, context limits, semantic search and why RAG answers go wrong.",
    outcomes: [
      "Estimate token usage and explain why it varies by language and content",
      "Explain how embeddings make semantic search work, and where they fail",
      "Debug a RAG system by separating retrieval problems from generation problems",
    ],
    steps: [
      {
        lesson: "ai/tokenization",
        why: "Models read tokens, not words; tokens set the cost and the size of the context window.",
      },
      {
        lesson: "ai/embeddings",
        why: "Embeddings turn text into vectors, so similar meanings can be found by distance.",
      },
      {
        lesson: "ai/how-rag-works",
        why: "RAG combines embedding search with a model to answer from your own documents.",
      },
    ],
  },
]);

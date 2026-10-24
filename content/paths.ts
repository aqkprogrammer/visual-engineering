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
      "The building blocks behind most system design discussions: spreading load, caching, indexing, replicating and sharding data, protecting capacity and queues.",
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
        lesson: "system-design/replication",
        why: "Copies of the data survive failures and scale reads — with lag, stale reads and failover to reason about.",
      },
      {
        lesson: "system-design/sharding-and-consistent-hashing",
        why: "When writes or data outgrow one machine, the data itself has to be split.",
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
    slug: "software-architecture-foundations",
    title: "Software architecture foundations",
    summary:
      "How to structure a system so it can change: keeping business logic independent, splitting into services, and recording history as events.",
    audience:
      "Developers moving from features to design decisions who want to understand the trade-offs behind common architectural styles.",
    outcomes: [
      "Keep business rules independent of frameworks and databases, and test them fast",
      "Decide whether and where to split a monolith, and design calls between services for failure",
      "Explain when event sourcing and CQRS are worth their complexity",
    ],
    steps: [
      {
        lesson: "software-architecture/hexagonal-architecture",
        why: "Good boundaries start inside one codebase: business logic in the middle, technology at the edges.",
      },
      {
        lesson: "software-architecture/monoliths-and-microservices",
        why: "Those boundaries can become services — and every network call has a cost.",
      },
      {
        lesson: "system-design/message-queues",
        why: "Asynchronous messaging decouples services and introduces at-least-once delivery.",
      },
      {
        lesson: "software-architecture/event-sourcing-and-cqrs",
        why: "Events as the source of truth, and read models that are eventually consistent.",
      },
    ],
  },
  {
    slug: "ai-engineering-foundations",
    title: "AI engineering foundations",
    summary:
      "How language-model applications see, find and act: tokens and context windows, embeddings, retrieval — chunking, hybrid search, RAG — and agents.",
    audience:
      "Engineers building with language models who want to understand cost, context limits, semantic search and why RAG answers go wrong.",
    outcomes: [
      "Estimate token usage and budget a context window as conversations grow",
      "Explain how embeddings make semantic search work, and where they fail",
      "Debug a RAG system by separating retrieval problems from generation problems",
      "Choose chunking and search methods, and measure them with recall@k",
      "Build a tool-calling agent with limits, validation and human approval",
    ],
    steps: [
      {
        lesson: "ai/tokenization",
        why: "Models read tokens, not words; tokens set the cost and the size of the context window.",
      },
      {
        lesson: "ai/context-windows",
        why: "Everything a model sees on a request has to fit in its window, and every token is paid for.",
      },
      {
        lesson: "ai/embeddings",
        why: "Embeddings turn text into vectors, so similar meanings can be found by distance.",
      },
      {
        lesson: "ai/how-rag-works",
        why: "RAG combines embedding search with a model to answer from your own documents.",
      },
      {
        lesson: "ai/chunking",
        why: "How documents are cut decides what retrieval can find in the first place.",
      },
      {
        lesson: "ai/hybrid-search",
        why: "Keyword and vector search fail in different ways; combining them covers both.",
      },
      {
        lesson: "ai/agents-and-tool-calling",
        why: "Agents put the rest together: a model that retrieves, calls tools and acts — safely, within limits.",
      },
    ],
  },
]);

import { defineDomains } from "@/lib/content/schema";

/**
 * The curriculum taxonomy: Domain → Module → Lesson.
 * Domain ids are permanent URL segments (`/<domain>`); do not rename them once published.
 * `plannedTopics` are shown on landing pages as "planned" until a lesson covers them.
 */
export default defineDomains([
  {
    id: "system-design",
    title: "System Design",
    tagline: "How large systems stay fast, available and correct under real traffic.",
    description:
      "Learn system design visually: load balancing, caching, queues, sharding, consistency and resilience patterns, explained with interactive simulations.",
    intro: [
      "System design is the practice of deciding how the parts of a software system are arranged so that it keeps working as traffic, data and teams grow. It is less about memorising diagrams and more about understanding why each component exists and what it costs.",
      "Lessons here start from a single server and add one idea at a time — spreading traffic, remembering answers, deferring work, splitting data — so you can see which problem each pattern solves and which new problems it introduces.",
    ],
    modules: [
      {
        id: "foundations",
        title: "Foundations",
        summary:
          "Requirements, scalability, and the vocabulary of availability, reliability and durability.",
        plannedTopics: [
          "System design fundamentals",
          "Functional and non-functional requirements",
          "Scalability and performance",
          "Availability, reliability, durability and consistency",
          "Horizontal versus vertical scaling",
        ],
      },
      {
        id: "traffic",
        title: "Traffic & Edge",
        summary:
          "Getting requests to the right place: load balancers, proxies, gateways, CDNs and rate limits.",
        plannedTopics: ["Reverse proxies", "API gateways", "Edge computing"],
      },
      {
        id: "data",
        title: "Data at Scale",
        summary:
          "Caching, indexing, replication and partitioning — and how to choose a data store.",
        plannedTopics: ["Database indexing and query optimization", "SQL versus NoSQL"],
      },
      {
        id: "consistency",
        title: "Consistency & Coordination",
        summary: "What 'correct' means once data lives in more than one place.",
        plannedTopics: [
          "Distributed transactions",
          "Saga pattern",
          "Idempotency",
          "Distributed locking",
        ],
      },
      {
        id: "messaging",
        title: "Messaging & Async",
        summary: "Queues, streams and the trade-offs between synchronous and asynchronous work.",
        plannedTopics: [
          "Event streaming (logs versus queues)",
          "Kafka fundamentals",
          "RabbitMQ fundamentals",
          "Synchronous versus asynchronous communication",
          "Event-driven architecture",
        ],
      },
      {
        id: "resilience",
        title: "Resilience",
        summary:
          "Designing for partial failure: timeouts, retries, circuit breakers, bulkheads and recovery.",
        plannedTopics: [
          "Bulkheads and load shedding",
          "High availability",
          "Disaster recovery",
          "Observability",
        ],
      },
      {
        id: "realtime-and-apis",
        title: "Real-time & APIs",
        summary: "Pushing updates to clients and evolving APIs without breaking them.",
        plannedTopics: [
          "WebSockets, polling and Server-Sent Events",
          "API versioning",
          "Service discovery",
          "Multi-tenancy",
        ],
      },
      {
        id: "case-studies",
        title: "Case Studies",
        summary:
          "End-to-end designs: requirements, data flow, storage, bottlenecks, failures and trade-offs.",
        plannedTopics: [
          "URL shortener",
          "Chat and messaging application",
          "Social media feed",
          "Video streaming platform",
          "E-commerce system",
          "Ride-booking platform",
          "Notification service",
          "File storage service",
          "Payment processing system",
          "Real-time analytics platform",
          "Search service",
          "AI-powered application",
        ],
      },
    ],
  },
  {
    id: "software-architecture",
    title: "Software Architecture",
    tagline: "Structuring code and services so they stay changeable.",
    description:
      "Software architecture explained: layered, clean and hexagonal architecture, DDD, CQRS, event sourcing, microservices and the trade-offs between them.",
    intro: [
      "Architecture is the set of decisions that are expensive to change later: where boundaries sit, which way dependencies point, and how parts of a system talk to each other.",
      "These lessons compare architectural styles side by side and focus on the forces behind each one — team size, rate of change, consistency needs — rather than declaring a single right answer.",
    ],
    modules: [
      {
        id: "styles",
        title: "Architectural Styles",
        summary: "Layered, clean, hexagonal, modular monoliths, microservices and micro-frontends.",
        plannedTopics: [
          "Layered architecture",
          "Clean architecture",
          "Modular monolith architecture",
          "Micro-frontends",
        ],
      },
      {
        id: "domain-modeling",
        title: "Domain Modeling",
        summary:
          "Finding boundaries in the business domain and modelling state changes explicitly.",
        plannedTopics: ["Domain-driven design", "Service boundaries"],
      },
      {
        id: "design-principles",
        title: "Design Principles",
        summary: "The principles and patterns that keep individual modules readable and testable.",
        plannedTopics: [
          "SOLID principles",
          "DRY, KISS and YAGNI",
          "Dependency injection",
          "Repository and unit-of-work patterns",
          "Design patterns",
          "Code organization",
        ],
      },
      {
        id: "apis",
        title: "API Design",
        summary: "Designing contracts between clients and services.",
        plannedTopics: [
          "API-first design",
          "REST versus GraphQL versus gRPC",
          "Backend-for-frontend",
        ],
      },
      {
        id: "evolution",
        title: "Evolving Systems",
        summary: "Changing architecture safely over time and recording why.",
        plannedTopics: [
          "Refactoring and technical debt",
          "Strangler migration pattern",
          "Architecture decision records",
        ],
      },
    ],
  },
  {
    id: "ai",
    title: "AI Engineering",
    tagline: "From tokens and embeddings to retrieval, agents and production LLM systems.",
    description:
      "AI engineering explained visually: tokens, embeddings, transformers, RAG, AI agents, MCP, evaluation and guardrails — with deterministic, key-free simulations.",
    intro: [
      "AI engineering is the work of turning machine-learning models — especially large language models — into dependable software. Most of that work happens around the model: preparing data, retrieving context, calling tools, evaluating output and controlling cost.",
      "Every simulation in this domain runs locally on fixed, illustrative data. Nothing calls a model API, and simplified teaching models are always labelled as such so you can tell them apart from production behaviour.",
    ],
    modules: [
      {
        id: "foundations",
        title: "Foundations",
        summary:
          "What AI, machine learning, deep learning and generative AI each mean, and how models learn.",
        plannedTopics: [
          "AI, ML, deep learning and generative AI",
          "Supervised, unsupervised and reinforcement learning",
          "Neural networks",
          "Training versus inference",
        ],
      },
      {
        id: "language-models",
        title: "Language Models",
        summary:
          "How text becomes numbers, and how transformers turn those numbers into predictions.",
        plannedTopics: [
          "Attention mechanisms",
          "Transformers",
          "Large language models",
          "Pretraining, fine-tuning and inference",
        ],
      },
      {
        id: "building-with-llms",
        title: "Building with LLMs",
        summary: "Prompting, structured output and letting models call your code.",
        plannedTopics: ["Prompt engineering", "Structured outputs"],
      },
      {
        id: "retrieval",
        title: "Retrieval & RAG",
        summary: "Grounding model answers in your own documents.",
        plannedTopics: ["Embedding pipelines", "Vector databases", "Reranking", "RAG evaluation"],
      },
      {
        id: "agents",
        title: "Agents",
        summary: "Loops of planning, tool use and memory — and how to keep them on track.",
        plannedTopics: ["Agent planning and memory", "Multi-agent systems", "Evaluating agents"],
      },
      {
        id: "production-ai",
        title: "Production AI",
        summary: "Serving models reliably: routing, caching, latency, cost and hardware.",
        plannedTopics: [
          "AI gateways and model routing",
          "Semantic caching",
          "Model latency, throughput and cost",
          "GPU inference fundamentals",
          "Quantization",
          "AI observability and tracing",
        ],
      },
      {
        id: "safety-and-quality",
        title: "Safety & Quality",
        summary: "Measuring and constraining model behaviour.",
        plannedTopics: [
          "Hallucinations and grounding",
          "Guardrails and prompt injection",
          "LLM evaluation",
          "AI security and privacy",
        ],
      },
      {
        id: "multimodal",
        title: "Multimodal AI",
        summary: "Models that see and hear as well as read.",
        plannedTopics: [
          "Multimodal AI",
          "Computer vision",
          "Speech recognition and text-to-speech",
        ],
      },
    ],
  },
  {
    id: "containers",
    title: "Containers & Kubernetes",
    tagline: "Packaging software and keeping it running across a fleet of machines.",
    description:
      "Docker and Kubernetes explained with animation: images and layers, containers, pods, deployments, services, probes, autoscaling and self-healing.",
    intro: [
      "Containers package an application together with everything it needs to run, so it behaves the same on a laptop and in production. Kubernetes then runs many containers across many machines and continuously works to keep them in the state you asked for.",
      "Lessons here animate what actually happens when an image is built, a container starts, a pod crashes or a deployment rolls out — and are explicit about what Kubernetes guarantees and what it leaves to you.",
    ],
    modules: [
      {
        id: "containers",
        title: "Containers & Docker",
        summary:
          "Images, layers, Dockerfiles, registries, storage, networking and container security.",
        plannedTopics: [
          "Virtual machines versus containers",
          "Container isolation",
          "Docker architecture",
          "Multi-stage builds",
          "Container registries",
          "Volumes and persistent storage",
          "Container networking",
          "Compose",
          "Environment variables and secrets",
          "Image optimization",
          "Container security",
        ],
      },
      {
        id: "kubernetes-core",
        title: "Kubernetes Core",
        summary: "The control plane, nodes, pods, deployments, services and configuration objects.",
        plannedTopics: [
          "Kubernetes architecture",
          "Control plane and worker nodes",
          "Pods",
          "Deployments and ReplicaSets",
          "Services",
          "Ingress and Gateway API concepts",
          "ConfigMaps and Secrets",
          "Namespaces",
          "Labels and selectors",
        ],
      },
      {
        id: "workloads",
        title: "Workloads & Storage",
        summary: "Stateful, per-node and batch workloads, and persistent storage.",
        plannedTopics: [
          "StatefulSets",
          "DaemonSets",
          "Jobs and CronJobs",
          "Persistent volumes and claims",
        ],
      },
      {
        id: "operations",
        title: "Kubernetes Operations",
        summary: "Scheduling, scaling, probes, rollouts, policies, packaging and troubleshooting.",
        plannedTopics: [
          "Resource requests and limits",
          "Health checks and probes",
          "Horizontal Pod Autoscaler",
          "Scheduling",
          "Rolling deployments and rollbacks",
          "Service discovery",
          "Network policies",
          "Helm",
          "Troubleshooting common Kubernetes failures",
        ],
      },
    ],
  },
  {
    id: "cloud",
    title: "Cloud & Infrastructure",
    tagline: "Networks, compute, storage and delivery pipelines in the cloud.",
    description:
      "Cloud architecture explained: regions and AZs, VPC networking, IAM, compute and storage services, Terraform, CI/CD, observability, SLOs and cost.",
    intro: [
      "Cloud platforms rent you computing building blocks — networks, machines, databases, queues — on demand. The engineering challenge is combining them securely, reliably and at a sensible cost.",
      "Provider-specific lessons are labelled, and every simulation here is local: nothing provisions, calls or bills real cloud resources.",
    ],
    modules: [
      {
        id: "foundations",
        title: "Cloud Foundations",
        summary: "What the cloud is and how providers are laid out physically.",
        plannedTopics: ["Cloud computing fundamentals", "AWS global infrastructure"],
      },
      {
        id: "networking",
        title: "Cloud Networking",
        summary: "Private networks, routing, firewalls, DNS and load balancing in AWS.",
        plannedTopics: [
          "VPCs, subnets, routing and NAT",
          "Security groups and network ACLs",
          "DNS and Route 53",
          "Load balancers",
          "CloudFront",
        ],
      },
      {
        id: "compute-and-data",
        title: "Compute & Data Services",
        summary:
          "Choosing between servers, containers and functions, and the managed data services around them.",
        plannedTopics: [
          "EC2",
          "Lambda",
          "ECS versus EKS versus Lambda",
          "S3",
          "RDS",
          "DynamoDB",
          "SQS and SNS",
          "API Gateway",
        ],
      },
      {
        id: "identity-and-security",
        title: "Identity & Security",
        summary: "Who can do what, and how secrets are handled.",
        plannedTopics: [
          "IAM users, roles and policies",
          "IAM least privilege",
          "Secrets management",
        ],
      },
      {
        id: "infrastructure-as-code",
        title: "Infrastructure as Code",
        summary: "Describing infrastructure in version-controlled files.",
        plannedTopics: ["Infrastructure as Code", "Terraform", "State files and modules"],
      },
      {
        id: "delivery",
        title: "Delivery",
        summary: "Getting changes to production safely.",
        plannedTopics: ["CI/CD", "GitHub Actions"],
      },
      {
        id: "operations",
        title: "Operations & Cost",
        summary: "Scaling, recovering, observing and paying for what you run.",
        plannedTopics: [
          "Backups and disaster recovery",
          "CloudWatch",
          "Metrics, logs, traces and alerting",
          "SLI, SLO and SLA",
          "Cost optimization",
          "FinOps fundamentals",
        ],
      },
    ],
  },
  {
    id: "networking",
    title: "Networking & Web",
    tagline: "What actually happens between typing a URL and seeing a page.",
    description:
      "Networking for developers, explained visually: DNS, TCP and UDP, HTTP versions, the TLS handshake, cookies, JWT, OAuth, CORS, proxies and CDNs.",
    intro: [
      "Every web request crosses several protocols, each solving one problem: finding an address, delivering bytes reliably, keeping them private, and describing what is being asked for.",
      "These lessons step through those protocols message by message, so the acronyms turn into a sequence of concrete, observable events.",
    ],
    modules: [
      {
        id: "internet-basics",
        title: "Internet Basics",
        summary: "Addresses, ports, packets and the two main transport protocols.",
        plannedTopics: [
          "How the internet works",
          "IP addressing and ports",
          "Packet routing",
          "TCP versus UDP",
          "Network latency",
        ],
      },
      {
        id: "naming",
        title: "Naming",
        summary: "Turning names into addresses.",
        plannedTopics: [],
      },
      {
        id: "web-protocols",
        title: "Web Protocols",
        summary: "HTTP in its versions, TLS, and how browsers put a request together.",
        plannedTopics: [
          "HTTP and HTTPS",
          "HTTP/1.1, HTTP/2 and HTTP/3",
          "Browser request lifecycle",
          "WebSockets",
          "Connection pooling",
        ],
      },
      {
        id: "identity",
        title: "Web Identity",
        summary: "Sessions, tokens and delegated authorization.",
        plannedTopics: ["Cookies and sessions", "JWT", "OAuth 2.0 and OpenID Connect", "CORS"],
      },
      {
        id: "edge-and-security",
        title: "Edge & Network Security",
        summary: "Proxies, CDNs, firewalls and zero-trust networks.",
        plannedTopics: [
          "Reverse proxy versus forward proxy",
          "CDN",
          "Firewalls",
          "Zero-trust networking",
        ],
      },
    ],
  },
  {
    id: "computer-science",
    title: "Computer Science",
    tagline: "The data structures, algorithms and systems concepts everything else is built on.",
    description:
      "Computer science fundamentals with interactive visualizations: data structures, algorithms, Big O, concurrency, memory, databases, testing and security.",
    intro: [
      "Underneath every framework and cloud service are a small number of ideas: how data is organised, how work is ordered, and how a computer shares its resources between tasks.",
      "These lessons animate those ideas step by step — a B-tree lookup, a sort, an event loop — so you can watch the cost of an operation instead of only reading its Big O.",
    ],
    modules: [
      {
        id: "data-structures",
        title: "Data Structures",
        summary: "Ways of organising data and what each makes cheap or expensive.",
        plannedTopics: [
          "Arrays, linked lists, stacks and queues",
          "Hash tables",
          "Trees and graphs",
          "Heaps and tries",
        ],
      },
      {
        id: "algorithms",
        title: "Algorithms",
        summary: "Classic techniques and how to reason about their cost.",
        plannedTopics: [
          "Big O notation",
          "Sorting and searching",
          "Recursion",
          "Dynamic programming",
          "Greedy algorithms",
        ],
      },
      {
        id: "concurrency",
        title: "Concurrency",
        summary: "Doing several things at once, and what goes wrong when you do.",
        plannedTopics: [
          "Concurrency and parallelism",
          "Threads and processes",
          "Async programming",
          "Race conditions and deadlocks",
        ],
      },
      {
        id: "systems",
        title: "Operating Systems",
        summary: "How the OS shares CPU and memory between programs.",
        plannedTopics: ["Operating system fundamentals", "Memory management", "Garbage collection"],
      },
      {
        id: "databases",
        title: "Database Internals",
        summary: "Transactions, guarantees and the structures that make lookups fast.",
        plannedTopics: ["Database transactions", "ACID properties", "Database isolation levels"],
      },
      {
        id: "engineering-practice",
        title: "Engineering Practice",
        summary: "Testing, security and performance habits that apply everywhere.",
        plannedTopics: [
          "Testing strategies",
          "Unit, integration, contract and end-to-end testing",
          "Security fundamentals",
          "OWASP concepts",
          "Performance profiling",
        ],
      },
    ],
  },
]);

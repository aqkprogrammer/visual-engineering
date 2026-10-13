import { defineGlossary } from "@/lib/content/schema";

/**
 * Glossary terms, written in plain language. Each links to the published lesson that explains it
 * in depth. Order here does not matter: the glossary page sorts terms alphabetically.
 */
export default defineGlossary([
  // System design — load balancing
  {
    id: "load-balancer",
    term: "Load balancer",
    definition:
      "A component that receives incoming requests or connections and spreads them across a pool of servers, skipping servers that fail health checks.",
    lesson: "system-design/load-balancing",
    related: ["health-check", "round-robin", "least-connections", "reverse-proxy"],
  },
  {
    id: "reverse-proxy",
    term: "Reverse proxy",
    definition:
      "A server that sits in front of application servers and forwards client requests to them. Clients only ever talk to the proxy, which can also balance load, terminate TLS and cache responses.",
    lesson: "system-design/load-balancing",
    related: ["load-balancer", "tls-termination"],
  },
  {
    id: "round-robin",
    term: "Round robin",
    definition:
      "A load-balancing algorithm that sends each new request to the next server in a fixed rotation. Simple and fair when requests cost about the same; uneven when they don't.",
    lesson: "system-design/load-balancing",
    related: ["least-connections", "load-balancer"],
  },
  {
    id: "least-connections",
    term: "Least connections",
    definition:
      "A load-balancing algorithm that sends each new request to the server with the fewest active connections, so slow or long-running requests are less likely to pile up on one server.",
    lesson: "system-design/load-balancing",
    related: ["round-robin", "load-balancer"],
  },
  {
    id: "health-check",
    term: "Health check",
    definition:
      "A regular test, such as an HTTP request to a status endpoint, that a load balancer or orchestrator uses to decide whether a server should receive traffic.",
    lesson: "system-design/load-balancing",
    related: ["load-balancer", "readiness-probe", "liveness-probe"],
  },
  {
    id: "connection-draining",
    term: "Connection draining",
    aliases: ["Deregistration delay"],
    definition:
      "Letting a server finish its in-flight requests before removing it from a load balancer's pool, so deployments and scale-downs don't cut users off mid-request.",
    lesson: "system-design/load-balancing",
    related: ["load-balancer"],
  },
  {
    id: "single-point-of-failure",
    term: "Single point of failure",
    aliases: ["SPOF"],
    definition:
      "Any one component whose failure takes down the whole system. Redundancy — several servers, several load balancers, several zones — is how systems remove them.",
    lesson: "system-design/load-balancing",
    related: ["load-balancer"],
  },

  // System design — caching
  {
    id: "cache",
    term: "Cache",
    definition:
      "A small, fast store that keeps copies of data that is expensive to fetch or compute, so repeated requests can be answered without doing the slow work again.",
    lesson: "system-design/caching",
    related: ["cache-hit-ratio", "cache-aside", "eviction", "ttl"],
  },
  {
    id: "cache-hit-ratio",
    term: "Cache hit ratio",
    aliases: ["Hit rate"],
    definition:
      "The share of lookups answered from the cache rather than from the slower source behind it. A cache with a low hit ratio adds a lookup without saving much work.",
    lesson: "system-design/caching",
    related: ["cache", "eviction"],
  },
  {
    id: "cache-aside",
    term: "Cache-aside",
    aliases: ["Lazy loading"],
    definition:
      "A caching pattern in which the application checks the cache first and, on a miss, reads from the database and stores the result in the cache for next time.",
    lesson: "system-design/caching",
    related: ["cache", "write-through"],
  },
  {
    id: "write-through",
    term: "Write-through cache",
    definition:
      "A caching pattern in which every write goes to the cache and the underlying store together, so the cache stays current at the cost of slower writes.",
    lesson: "system-design/caching",
    related: ["cache-aside", "cache"],
  },
  {
    id: "eviction",
    term: "Eviction",
    definition:
      "Removing entries from a full cache to make room for new ones. The eviction policy, such as LRU, decides which entry goes.",
    lesson: "system-design/caching",
    related: ["lru", "cache"],
  },
  {
    id: "lru",
    term: "Least recently used (LRU)",
    aliases: ["LRU"],
    definition:
      "An eviction policy that removes the entry that has gone unused for the longest time, on the bet that recently used data is likely to be used again soon.",
    lesson: "system-design/caching",
    related: ["eviction", "cache"],
  },
  {
    id: "ttl",
    term: "Time to live (TTL)",
    aliases: ["TTL", "Expiry"],
    definition:
      "How long a cached copy may be used before it must be fetched again. Shorter TTLs mean fresher data and more load on the source; DNS records and HTTP responses use TTLs too.",
    lesson: "system-design/caching",
    related: ["cache", "stale-data", "dns"],
  },
  {
    id: "stale-data",
    term: "Stale data",
    definition:
      "A cached copy that no longer matches the source because the source changed after the copy was made. Invalidation and TTLs limit how stale data can get.",
    lesson: "system-design/caching",
    related: ["ttl", "cache-invalidation"],
  },
  {
    id: "cache-invalidation",
    term: "Cache invalidation",
    definition:
      "Removing or updating cached entries when the underlying data changes, so readers don't keep receiving the old value.",
    lesson: "system-design/caching",
    related: ["stale-data", "ttl"],
  },
  {
    id: "cache-stampede",
    term: "Cache stampede",
    aliases: ["Thundering herd"],
    definition:
      "Many requests missing the cache for the same key at once — often when a popular entry expires — and all hitting the slow source together.",
    lesson: "system-design/caching",
    related: ["cache", "ttl"],
  },

  // System design — rate limiting
  {
    id: "rate-limiting",
    term: "Rate limiting",
    definition:
      "Capping how many requests a client, user or key may make in a period of time, to protect shared capacity and keep one caller from crowding out the rest.",
    lesson: "system-design/rate-limiting",
    related: ["token-bucket", "sliding-window", "backpressure"],
  },
  {
    id: "token-bucket",
    term: "Token bucket",
    definition:
      "A rate-limiting algorithm in which tokens refill at a steady rate up to a maximum, and each request spends one. It allows short bursts while enforcing an average rate.",
    lesson: "system-design/rate-limiting",
    related: ["rate-limiting", "sliding-window"],
  },
  {
    id: "sliding-window",
    term: "Sliding window",
    definition:
      "A family of rate-limiting algorithms that count requests over the most recent period rather than fixed clock intervals, avoiding the double-sized bursts possible at fixed window edges.",
    lesson: "system-design/rate-limiting",
    related: ["rate-limiting", "token-bucket"],
  },
  {
    id: "http-429",
    term: "429 Too Many Requests",
    aliases: ["HTTP 429"],
    definition:
      "The HTTP status code a server returns when a client has exceeded a rate limit. It may include a Retry-After header saying when to try again.",
    lesson: "system-design/rate-limiting",
    related: ["rate-limiting"],
  },

  // System design — message queues
  {
    id: "message-queue",
    term: "Message queue",
    definition:
      "A buffer that holds messages from producers until consumers are ready to process them, so the two sides can work at different speeds and fail independently.",
    lesson: "system-design/message-queues",
    related: ["backpressure", "dead-letter-queue", "at-least-once-delivery"],
  },
  {
    id: "backpressure",
    term: "Backpressure",
    definition:
      "Any way an overloaded system pushes back on incoming work — rejecting it, slowing producers or shedding low-priority tasks — instead of accepting it and failing later.",
    lesson: "system-design/message-queues",
    related: ["message-queue", "rate-limiting"],
  },
  {
    id: "at-least-once-delivery",
    term: "At-least-once delivery",
    definition:
      "A delivery guarantee under which every message is processed, but some may be delivered more than once — for example after a consumer crashes before acknowledging.",
    lesson: "system-design/message-queues",
    related: ["idempotency", "message-queue"],
  },
  {
    id: "idempotency",
    term: "Idempotency",
    aliases: ["Idempotent"],
    definition:
      "The property that doing an operation twice has the same effect as doing it once. Idempotent consumers make duplicate messages and retried requests harmless.",
    lesson: "system-design/message-queues",
    related: ["at-least-once-delivery"],
  },
  {
    id: "dead-letter-queue",
    term: "Dead-letter queue",
    aliases: ["DLQ"],
    definition:
      "A separate queue for messages that failed processing too many times, so they stop blocking healthy work and can be inspected and retried later.",
    lesson: "system-design/message-queues",
    related: ["message-queue", "visibility-timeout"],
  },
  {
    id: "visibility-timeout",
    term: "Visibility timeout",
    definition:
      "In Amazon SQS, how long a received message stays hidden from other consumers. If it isn't deleted in time, it becomes visible again and is redelivered.",
    lesson: "system-design/message-queues",
    related: ["at-least-once-delivery", "dead-letter-queue"],
  },

  // Networking
  {
    id: "dns",
    term: "DNS",
    aliases: ["Domain Name System"],
    definition:
      "The internet's distributed directory that translates names such as example.com into the IP addresses computers use to connect, with answers cached at many levels.",
    lesson: "networking/dns-resolution",
    related: ["recursive-resolver", "authoritative-name-server", "ttl"],
  },
  {
    id: "recursive-resolver",
    term: "Recursive resolver",
    definition:
      "The DNS server — usually run by your ISP, company or a public provider — that does the work of finding an answer by asking root, TLD and authoritative servers, then caches it.",
    lesson: "networking/dns-resolution",
    related: ["dns", "authoritative-name-server"],
  },
  {
    id: "authoritative-name-server",
    term: "Authoritative name server",
    definition:
      "A DNS server that holds the official records for a domain and gives definitive answers about it, rather than cached copies.",
    lesson: "networking/dns-resolution",
    related: ["dns", "recursive-resolver"],
  },
  {
    id: "tls",
    term: "TLS",
    aliases: ["Transport Layer Security"],
    definition:
      "The protocol that encrypts traffic between two parties and lets the client verify the server's identity. It is the S in HTTPS.",
    lesson: "networking/tls-handshake",
    related: ["tls-certificate", "tls-termination"],
  },
  {
    id: "tls-certificate",
    term: "TLS certificate",
    definition:
      "A signed document binding a public key to a domain name. Browsers trust it when it chains back to a certificate authority they already trust and the name matches.",
    lesson: "networking/tls-handshake",
    related: ["tls"],
  },
  {
    id: "tls-termination",
    term: "TLS termination",
    definition:
      "Decrypting TLS traffic at a load balancer or proxy, which then forwards the request to backend servers, either unencrypted on a private network or over a new TLS connection.",
    lesson: "system-design/load-balancing",
    related: ["tls", "load-balancer"],
  },

  // Containers
  {
    id: "container-image",
    term: "Container image",
    aliases: ["Docker image"],
    definition:
      "A read-only package of an application and everything it needs to run, built as a stack of layers plus configuration such as the default command.",
    lesson: "containers/docker-images-and-layers",
    related: ["image-layer", "build-cache", "multi-stage-build"],
  },
  {
    id: "image-layer",
    term: "Image layer",
    definition:
      "One set of filesystem changes in a container image, produced by an instruction such as COPY or RUN. Layers are identified by content and shared between images.",
    lesson: "containers/docker-images-and-layers",
    related: ["container-image", "build-cache"],
  },
  {
    id: "build-cache",
    term: "Build cache",
    definition:
      "Stored layers from earlier builds. If an instruction and its inputs haven't changed, the builder reuses the cached layer — until one instruction changes, after which every later one rebuilds.",
    lesson: "containers/docker-images-and-layers",
    related: ["image-layer"],
  },
  {
    id: "multi-stage-build",
    term: "Multi-stage build",
    definition:
      "A Dockerfile with several stages, where tools and intermediate files stay in earlier stages and only the finished output is copied into a small final image.",
    lesson: "containers/docker-images-and-layers",
    related: ["container-image"],
  },
  {
    id: "pod",
    term: "Pod",
    definition:
      "The smallest unit Kubernetes runs: one or more containers scheduled together on a node, sharing a network address and storage.",
    lesson: "containers/kubernetes-self-healing",
    related: ["replicaset", "crashloopbackoff"],
  },
  {
    id: "replicaset",
    term: "ReplicaSet",
    definition:
      "A Kubernetes controller that keeps a specified number of identical pods running, creating replacements when pods are deleted or lost.",
    lesson: "containers/kubernetes-self-healing",
    related: ["pod"],
  },
  {
    id: "crashloopbackoff",
    term: "CrashLoopBackOff",
    definition:
      "A Kubernetes pod status meaning a container keeps crashing and the kubelet is waiting longer and longer between restarts. The cause is in the container, not Kubernetes.",
    lesson: "containers/kubernetes-self-healing",
    related: ["pod", "liveness-probe"],
  },
  {
    id: "liveness-probe",
    term: "Liveness probe",
    definition:
      "A Kubernetes check that decides whether a container is stuck. If it fails repeatedly, the kubelet restarts the container.",
    lesson: "containers/kubernetes-self-healing",
    related: ["readiness-probe", "health-check"],
  },
  {
    id: "readiness-probe",
    term: "Readiness probe",
    definition:
      "A Kubernetes check that decides whether a pod should receive traffic. A failing pod is removed from Service endpoints but is not restarted.",
    lesson: "containers/kubernetes-self-healing",
    related: ["liveness-probe", "health-check"],
  },

  // AI
  {
    id: "token",
    term: "Token",
    definition:
      "The unit of text a language model reads and writes — often a common word, sometimes part of a word or a single character. Costs and context limits are counted in tokens.",
    lesson: "ai/tokenization",
    related: ["byte-pair-encoding", "context-window"],
  },
  {
    id: "byte-pair-encoding",
    term: "Byte-pair encoding",
    aliases: ["BPE"],
    definition:
      "A tokenization method that starts from single characters or bytes and repeatedly merges the most frequent adjacent pair into a new token, building a vocabulary of common pieces.",
    lesson: "ai/tokenization",
    related: ["token"],
  },
  {
    id: "context-window",
    term: "Context window",
    definition:
      "The maximum number of tokens a language model can take into account at once, covering the prompt, any retrieved documents, the conversation so far and the answer.",
    lesson: "ai/tokenization",
    related: ["token", "rag"],
  },
  {
    id: "embedding",
    term: "Embedding",
    definition:
      "A list of numbers — a vector — that represents a piece of text or other data so that items with similar meanings end up close together.",
    lesson: "ai/embeddings",
    related: ["cosine-similarity", "nearest-neighbour-search"],
  },
  {
    id: "cosine-similarity",
    term: "Cosine similarity",
    definition:
      "A measure of how closely two vectors point in the same direction, ignoring their length. Commonly used to compare embeddings.",
    lesson: "ai/embeddings",
    related: ["embedding"],
  },
  {
    id: "nearest-neighbour-search",
    term: "Nearest-neighbour search",
    aliases: ["Vector search", "Approximate nearest neighbour", "ANN"],
    definition:
      "Finding the stored vectors closest to a query vector. Large systems use approximate methods that trade a little accuracy for much faster searches.",
    lesson: "ai/embeddings",
    related: ["embedding", "rag"],
  },
  {
    id: "rag",
    term: "Retrieval-augmented generation",
    aliases: ["RAG"],
    definition:
      "Answering a question by first retrieving relevant passages from your own documents and giving them to a language model as context, so it answers from that material.",
    lesson: "ai/how-rag-works",
    related: ["chunking", "reranker", "embedding", "hallucination"],
  },
  {
    id: "chunking",
    term: "Chunking",
    definition:
      "Splitting documents into passages for retrieval. Chunks must be small enough to match a question precisely but large enough to make sense on their own.",
    lesson: "ai/how-rag-works",
    related: ["rag"],
  },
  {
    id: "reranker",
    term: "Reranker",
    definition:
      "A slower, more accurate model that re-scores candidates from a first retrieval pass, typically by reading the question and each passage together.",
    lesson: "ai/how-rag-works",
    related: ["rag", "nearest-neighbour-search"],
  },
  {
    id: "hallucination",
    term: "Hallucination",
    definition:
      "A fluent, confident model output that is not supported by its input or by fact. Grounding answers in retrieved sources reduces it but does not eliminate it.",
    lesson: "ai/how-rag-works",
    related: ["rag"],
  },
  {
    id: "prompt-injection",
    term: "Prompt injection",
    definition:
      "Text crafted to override a model's instructions, for example hidden inside a retrieved document or web page. Retrieved content should be treated as untrusted data.",
    lesson: "ai/how-rag-works",
    related: ["rag"],
  },

  // Computer science — databases
  {
    id: "database-index",
    term: "Database index",
    definition:
      "A separate, sorted structure that maps column values to the rows containing them, so the database can find matching rows without reading the whole table.",
    lesson: "computer-science/database-indexes",
    related: ["b-tree", "sequential-scan", "covering-index"],
  },
  {
    id: "b-tree",
    term: "B-tree",
    aliases: ["B+ tree"],
    definition:
      "A balanced tree of disk pages, each holding many sorted keys, used by most databases for indexes. Even huge tables need only a few page reads per lookup.",
    lesson: "computer-science/database-indexes",
    related: ["database-index"],
  },
  {
    id: "sequential-scan",
    term: "Sequential scan",
    aliases: ["Full table scan", "Seq Scan"],
    definition:
      "Reading every page of a table and checking every row. Cheap for small tables or broad filters, slow for selective queries on large tables.",
    lesson: "computer-science/database-indexes",
    related: ["database-index", "query-planner"],
  },
  {
    id: "covering-index",
    term: "Covering index",
    definition:
      "An index that contains every column a query needs, so the database can answer from the index alone without visiting the table.",
    lesson: "computer-science/database-indexes",
    related: ["database-index"],
  },
  {
    id: "query-planner",
    term: "Query planner",
    aliases: ["Query optimizer"],
    definition:
      "The part of a database that chooses how to run a query — which indexes to use, join order and so on — by estimating costs from table statistics. EXPLAIN shows its choice.",
    lesson: "computer-science/database-indexes",
    related: ["sequential-scan", "database-index"],
  },
]);

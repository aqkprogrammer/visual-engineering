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

  // System design — replication and sharding
  {
    id: "replication",
    term: "Replication",
    definition:
      "Keeping copies of the same data on several machines, so that it survives a failure and reads can be spread across the copies.",
    lesson: "system-design/replication",
    related: ["replication-lag", "failover", "sharding"],
  },
  {
    id: "replication-lag",
    term: "Replication lag",
    definition:
      "How far a follower is behind its leader. Reads from a lagging follower can return data older than a write that has already been confirmed.",
    lesson: "system-design/replication",
    related: ["replication", "read-after-write-consistency"],
  },
  {
    id: "synchronous-replication",
    term: "Synchronous replication",
    definition:
      "The leader waits for a follower to confirm a change before acknowledging the write, so acknowledged writes survive the leader's loss — at the cost of latency on every write.",
    lesson: "system-design/replication",
    related: ["replication", "failover"],
  },
  {
    id: "failover",
    term: "Failover",
    definition:
      "Promoting a follower to take over when the leader fails. With asynchronous replication, writes the old leader hadn't yet sent are lost.",
    lesson: "system-design/replication",
    related: ["replication", "split-brain"],
  },
  {
    id: "split-brain",
    term: "Split brain",
    definition:
      "Two nodes both acting as leader and accepting writes, usually after a network partition, so their data diverges. Failover systems use fencing and consensus to prevent it.",
    lesson: "system-design/replication",
    related: ["failover"],
  },
  {
    id: "read-after-write-consistency",
    term: "Read-your-writes consistency",
    aliases: ["Read-after-write consistency"],
    definition:
      "A guarantee that a user always sees their own changes, even when other reads may come from replicas that are slightly behind.",
    lesson: "system-design/replication",
    related: ["replication-lag"],
  },
  {
    id: "quorum",
    term: "Quorum",
    definition:
      "The number of replicas that must take part in a read (R) or write (W). With N copies, R + W > N makes every read overlap the latest acknowledged write.",
    lesson: "system-design/replication",
    related: ["replication"],
  },
  {
    id: "sharding",
    term: "Sharding",
    aliases: ["Partitioning", "Horizontal partitioning"],
    definition:
      "Splitting one dataset across several nodes, so each stores and serves only part of it. A shard key decides where each record lives.",
    lesson: "system-design/sharding-and-consistent-hashing",
    related: ["shard-key", "consistent-hashing", "replication"],
  },
  {
    id: "shard-key",
    term: "Shard key",
    aliases: ["Partition key"],
    definition:
      "The field that decides which shard owns a record. A good one has many values, spreads traffic evenly and appears in most queries.",
    lesson: "system-design/sharding-and-consistent-hashing",
    related: ["sharding", "hot-partition"],
  },
  {
    id: "consistent-hashing",
    term: "Consistent hashing",
    definition:
      "Placing nodes and keys on a ring of hash values, each key owned by the next node clockwise, so adding or removing a node moves only a small share of keys.",
    lesson: "system-design/sharding-and-consistent-hashing",
    related: ["virtual-nodes", "sharding"],
  },
  {
    id: "virtual-nodes",
    term: "Virtual nodes",
    aliases: ["Vnodes", "Tokens"],
    definition:
      "Giving each physical node many positions on a consistent-hashing ring, which evens out how much each node owns and spreads a departing node's load.",
    lesson: "system-design/sharding-and-consistent-hashing",
    related: ["consistent-hashing"],
  },
  {
    id: "hot-partition",
    term: "Hot partition",
    aliases: ["Hot key", "Hot shard"],
    definition:
      "A shard or key receiving a much larger share of traffic than the rest. Sharding can't split a single key; caching or splitting the key can.",
    lesson: "system-design/sharding-and-consistent-hashing",
    related: ["shard-key", "sharding"],
  },

  {
    id: "retry-storm",
    term: "Retry storm",
    aliases: ["Metastable failure"],
    definition:
      "Retries multiplying the load on a struggling dependency so that it stays overloaded even after the original problem has gone.",
    lesson: "system-design/timeouts-retries-and-circuit-breakers",
    related: ["circuit-breaker", "exponential-backoff", "retry-budget"],
  },
  {
    id: "exponential-backoff",
    term: "Exponential backoff",
    aliases: ["Jitter", "Backoff with jitter"],
    definition:
      "Waiting longer after each failed attempt before retrying, usually with random jitter so that many clients don't retry at the same moment.",
    lesson: "system-design/timeouts-retries-and-circuit-breakers",
    related: ["retry-storm", "retry-budget"],
  },
  {
    id: "retry-budget",
    term: "Retry budget",
    definition:
      "A limit on retries as a share of normal traffic, often a token bucket, so that retries can't snowball when most calls are failing.",
    lesson: "system-design/timeouts-retries-and-circuit-breakers",
    related: ["retry-storm", "token-bucket"],
  },
  {
    id: "circuit-breaker",
    term: "Circuit breaker",
    definition:
      "A wrapper around calls to a dependency that, after too many failures, fails calls immediately for a while instead of sending them, then lets a few trial calls through to test recovery.",
    lesson: "system-design/timeouts-retries-and-circuit-breakers",
    related: ["retry-storm"],
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
    lesson: "ai/context-windows",
    related: ["token", "rag", "prompt-caching"],
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
    lesson: "ai/chunking",
    related: ["rag", "chunk-overlap", "contextual-retrieval"],
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
      "Text crafted to override a model's instructions, for example hidden inside a retrieved document, web page or tool result. Retrieved content should be treated as untrusted data.",
    lesson: "ai/agents-and-tool-calling",
    related: ["rag", "ai-agent", "excessive-agency"],
  },
  {
    id: "chunk-overlap",
    term: "Chunk overlap",
    definition:
      "Repeating the end of one chunk at the start of the next, so text near a boundary appears whole in at least one chunk. It duplicates text, which costs storage and embedding work.",
    lesson: "ai/chunking",
    related: ["chunking"],
  },
  {
    id: "contextual-retrieval",
    term: "Contextual retrieval",
    aliases: ["Contextual chunks"],
    definition:
      "Adding context — such as the document title, section heading or a short generated description — to each chunk before indexing it, so chunks can be understood and found on their own.",
    lesson: "ai/chunking",
    related: ["chunking", "bm25"],
  },
  {
    id: "bm25",
    term: "BM25",
    aliases: ["Okapi BM25"],
    definition:
      "The standard keyword-ranking formula: rare query words weigh more, repeated words help less each time, and long documents are normalised. It is the default in Elasticsearch.",
    lesson: "ai/hybrid-search",
    related: ["inverse-document-frequency", "inverted-index", "hybrid-search"],
  },
  {
    id: "inverse-document-frequency",
    term: "Inverse document frequency",
    aliases: ["IDF"],
    definition:
      "A word's weight based on how few documents contain it. A word in almost every document says little about relevance; a word in one document says a lot.",
    lesson: "ai/hybrid-search",
    related: ["bm25"],
  },
  {
    id: "inverted-index",
    term: "Inverted index",
    definition:
      "The data structure behind keyword search: for every word, the list of documents (and positions) that contain it, so matching documents can be found without reading them all.",
    lesson: "ai/hybrid-search",
    related: ["bm25"],
  },
  {
    id: "hybrid-search",
    term: "Hybrid search",
    definition:
      "Running keyword and vector search for the same query and merging their results, so exact terms and paraphrases are both found.",
    lesson: "ai/hybrid-search",
    related: ["bm25", "nearest-neighbour-search", "reciprocal-rank-fusion"],
  },
  {
    id: "reciprocal-rank-fusion",
    term: "Reciprocal rank fusion",
    aliases: ["RRF"],
    definition:
      "A way to merge ranked lists: each document scores 1 ÷ (k + rank) in every list it appears in, and the sums are sorted. It uses only positions, so scores on different scales never need comparing.",
    lesson: "ai/hybrid-search",
    related: ["hybrid-search"],
  },
  {
    id: "recall-at-k",
    term: "Recall@k",
    definition:
      "The share of the relevant passages for a question that appear in the top k results. The usual way to measure whether retrieval found what the model needs.",
    lesson: "ai/hybrid-search",
    related: ["hybrid-search", "rag"],
  },
  {
    id: "prompt-caching",
    term: "Prompt caching",
    definition:
      "Reusing the processing of an identical prompt prefix across requests, billed at a discount. Cached tokens still take up space in the context window.",
    lesson: "ai/context-windows",
    related: ["context-window", "token"],
  },
  {
    id: "lost-in-the-middle",
    term: "Lost in the middle",
    definition:
      "The finding that language models often use information at the start or end of a long input more reliably than information in the middle.",
    lesson: "ai/context-windows",
    related: ["context-window"],
  },
  {
    id: "tool-calling",
    term: "Tool calling",
    aliases: ["Function calling"],
    definition:
      "A model replying with a structured request to run one of the functions it was given, instead of plain text. The application runs it and returns the result.",
    lesson: "ai/agents-and-tool-calling",
    related: ["ai-agent", "model-context-protocol"],
  },
  {
    id: "ai-agent",
    term: "AI agent",
    aliases: ["Agentic loop"],
    definition:
      "A language model running in a loop of tool calls, choosing its next step from the results so far, until it answers or a limit stops it.",
    lesson: "ai/agents-and-tool-calling",
    related: ["tool-calling", "prompt-injection"],
  },
  {
    id: "model-context-protocol",
    term: "Model Context Protocol",
    aliases: ["MCP"],
    definition:
      "An open protocol, built on JSON-RPC, through which applications discover and call tools exposed by servers: tools/list to find them, tools/call to use one.",
    lesson: "ai/agents-and-tool-calling",
    related: ["tool-calling"],
  },
  {
    id: "excessive-agency",
    term: "Excessive agency",
    definition:
      "Giving a model-driven system more tools, permissions or autonomy than its task needs, so a mistake or an injected instruction can do real damage.",
    lesson: "ai/agents-and-tool-calling",
    related: ["prompt-injection", "ai-agent"],
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

  // Cloud
  {
    id: "availability-zone",
    term: "Availability Zone",
    aliases: ["AZ"],
    definition:
      "One of several isolated locations within a cloud region: one or more data centres with their own power, networking and connectivity, close enough to the others for low-latency links.",
    lesson: "cloud/regions-and-availability-zones",
    related: ["cloud-region", "static-stability"],
  },
  {
    id: "cloud-region",
    term: "Region",
    aliases: ["Cloud region"],
    definition:
      "A geographic area where a cloud provider runs an isolated set of its services, made up of several Availability Zones. Most services and their data live in one region.",
    lesson: "cloud/regions-and-availability-zones",
    related: ["availability-zone"],
  },
  {
    id: "static-stability",
    term: "Static stability",
    definition:
      "Keeping a system working through a failure without having to change anything — for example, running enough spare capacity in advance that losing a zone needs no new instances.",
    lesson: "cloud/regions-and-availability-zones",
    related: ["availability-zone", "control-plane"],
  },
  {
    id: "control-plane",
    term: "Control plane",
    aliases: ["Data plane"],
    definition:
      "The parts of a system that create, configure and change resources, such as the APIs that launch instances. The data plane is what serves the actual traffic. Designs that depend on the control plane during an outage are fragile.",
    lesson: "cloud/regions-and-availability-zones",
    related: ["static-stability"],
  },
  {
    id: "blue-green-deployment",
    term: "Blue-green deployment",
    definition:
      "Running a new version in a complete second environment beside the old one, then switching all traffic to it at once. Rolling back is switching traffic back.",
    lesson: "cloud/blue-green-and-canary-deployments",
    related: ["canary-release", "rolling-update"],
  },
  {
    id: "canary-release",
    term: "Canary release",
    aliases: ["Canary deployment", "Canarying"],
    definition:
      "Sending a small share of real traffic to a new version and comparing it with the old version before widening the rollout, so a bad release reaches few users.",
    lesson: "cloud/blue-green-and-canary-deployments",
    related: ["blue-green-deployment", "rolling-update"],
  },
  {
    id: "rolling-update",
    term: "Rolling update",
    definition:
      "Replacing instances of an application in batches, so capacity stays up while the new version gradually takes over.",
    lesson: "cloud/blue-green-and-canary-deployments",
    related: ["canary-release", "blue-green-deployment"],
  },
  {
    id: "autoscaling",
    term: "Autoscaling",
    definition:
      "Automatically adding instances as demand rises and removing them as it falls, usually to keep a metric such as CPU utilisation near a target.",
    lesson: "cloud/autoscaling",
    related: ["target-tracking", "scale-in-stabilization"],
  },
  {
    id: "target-tracking",
    term: "Target tracking",
    definition:
      "An autoscaling policy that keeps a metric near a chosen value, scaling in proportion: desired instances = current instances × current metric ÷ target.",
    lesson: "cloud/autoscaling",
    related: ["autoscaling"],
  },
  {
    id: "scale-in-stabilization",
    term: "Scale-in stabilisation window",
    aliases: ["Stabilization window"],
    definition:
      "A period over which an autoscaler remembers its recommendations and scales in only to the highest of them, so brief dips in load don't remove capacity that is needed again minutes later.",
    lesson: "cloud/autoscaling",
    related: ["autoscaling", "target-tracking"],
  },

  // Software architecture
  {
    id: "monolith",
    term: "Monolith",
    definition:
      "An application built and deployed as a single unit, whose parts call each other inside one process. A modular monolith keeps clear internal boundaries.",
    lesson: "software-architecture/monoliths-and-microservices",
    related: ["microservices"],
  },
  {
    id: "microservices",
    term: "Microservices",
    definition:
      "An architecture of small, independently deployable services, each organised around a business capability and communicating over the network.",
    lesson: "software-architecture/monoliths-and-microservices",
    related: ["monolith", "tail-latency"],
  },
  {
    id: "tail-latency",
    term: "Tail latency",
    aliases: ["p99 latency"],
    definition:
      "The response time of the slowest requests, such as the 99th percentile. When a request depends on many calls, rare slow calls make the tail dominate.",
    lesson: "software-architecture/monoliths-and-microservices",
    related: ["microservices"],
  },
  {
    id: "hexagonal-architecture",
    term: "Hexagonal architecture",
    aliases: ["Ports and adapters"],
    definition:
      "Organising an application so business logic sits in a core that talks to the outside world only through interfaces it defines (ports), implemented by technology-specific adapters.",
    lesson: "software-architecture/hexagonal-architecture",
    related: ["port", "adapter"],
  },
  {
    id: "port",
    term: "Port",
    definition:
      "In hexagonal architecture, an interface the application defines in business terms for talking to the outside world, such as a repository or a notifier.",
    lesson: "software-architecture/hexagonal-architecture",
    related: ["adapter", "hexagonal-architecture"],
  },
  {
    id: "adapter",
    term: "Adapter",
    definition:
      "In hexagonal architecture, code that connects a port to a specific technology — a database, an email service, an HTTP framework or a test double.",
    lesson: "software-architecture/hexagonal-architecture",
    related: ["port", "hexagonal-architecture"],
  },
  {
    id: "event-sourcing",
    term: "Event sourcing",
    definition:
      "Storing every change to an object as an immutable event in an append-only log, and deriving its current state by replaying those events.",
    lesson: "software-architecture/event-sourcing-and-cqrs",
    related: ["cqrs", "projection", "compensating-event"],
  },
  {
    id: "cqrs",
    term: "CQRS",
    aliases: ["Command Query Responsibility Segregation"],
    definition:
      "Using one model to handle changes (commands) and separate models to answer queries. Often combined with event sourcing, but independent of it.",
    lesson: "software-architecture/event-sourcing-and-cqrs",
    related: ["event-sourcing", "projection"],
  },
  {
    id: "projection",
    term: "Projection",
    aliases: ["Read model", "Materialized view"],
    definition:
      "A read-optimised view built by applying events in order, such as a balance or a report. It lags the event log slightly: it is eventually consistent.",
    lesson: "software-architecture/event-sourcing-and-cqrs",
    related: ["event-sourcing", "eventual-consistency"],
  },
  {
    id: "compensating-event",
    term: "Compensating event",
    definition:
      "A new event that reverses or corrects the effect of an earlier one, used because events in an event-sourced system are never edited or deleted.",
    lesson: "software-architecture/event-sourcing-and-cqrs",
    related: ["event-sourcing"],
  },
  {
    id: "eventual-consistency",
    term: "Eventual consistency",
    definition:
      "A guarantee that, once updates stop, every copy or view of the data will converge to the same value — but reads may briefly return older data in the meantime.",
    lesson: "software-architecture/event-sourcing-and-cqrs",
    related: ["projection", "cqrs"],
  },
]);

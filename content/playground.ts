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
  {
    slug: "btree-index",
    title: "B+ tree index explorer",
    summary:
      "Search a table with and without an index, count the page reads, and insert keys to watch B+ tree pages split.",
    domain: "computer-science",
    lesson: "computer-science/database-indexes",
    kind: "walkthrough",
    tryThis: [
      "Search for 55 and compare the index's page reads with a full table scan.",
      "Search for 50, which isn't in the table: the index proves it's missing without touching the table at all.",
      "Insert several keys one after another and watch leaf pages split, sometimes all the way up to a new root.",
    ],
    references: [
      {
        title: "Index Types",
        url: "https://www.postgresql.org/docs/current/indexes-types.html",
        publisher: "PostgreSQL",
        kind: "official-docs",
      },
    ],
  },
  {
    slug: "dns-resolution",
    title: "DNS resolution, step by step",
    summary:
      "Follow a lookup from your browser through recursive, root, TLD and authoritative servers, then see how caching short-circuits repeat lookups.",
    domain: "networking",
    lesson: "networking/dns-resolution",
    kind: "walkthrough",
    tryThis: [
      "Step through the first lookup and count the name servers the resolver contacts.",
      "Switch to Repeat lookup: the answer comes straight from the resolver's cache.",
      "Try Another name, same domain: the cached delegation lets the resolver skip the root and .com servers.",
    ],
    references: [
      {
        title: "RFC 1034: Domain Names — Concepts and Facilities",
        url: "https://www.rfc-editor.org/rfc/rfc1034",
        publisher: "IETF",
        kind: "specification",
      },
    ],
  },
  {
    slug: "rag-pipeline",
    title: "RAG pipeline inspector",
    summary:
      "Inspect every stage of a retrieval-augmented generation pipeline and see how chunking, top-k and reranking decide whether the answer is right.",
    domain: "ai",
    lesson: "ai/how-rag-works",
    kind: "walkthrough",
    tryThis: [
      "Ask the deadline question with whole-document chunks and top k = 1: an outdated policy wins and the answer is confidently wrong.",
      "Turn on the reranker with the same settings and the answer becomes correct.",
      "Ask about the gym membership: retrieval returns something, but the right answer is that it isn't covered.",
    ],
    references: [
      {
        title: "Retrieval-Augmented Generation for Knowledge-Intensive NLP Tasks",
        url: "https://arxiv.org/abs/2005.11401",
        publisher: "Lewis et al., 2020",
        kind: "paper",
      },
    ],
  },
  {
    slug: "docker-build-cache",
    title: "Docker build cache simulator",
    summary:
      "Edit files and rebuild to see which Dockerfile steps hit the layer cache, why instruction order matters, and what gets pushed to a registry.",
    domain: "containers",
    lesson: "containers/docker-images-and-layers",
    kind: "walkthrough",
    tryThis: [
      "With COPY . . first, edit src/server.js and rebuild: the slow dependency install runs again.",
      "Switch to Dependencies first, rebuild, then edit src/server.js: only the final copy reruns.",
      "Edit README.md with and without .dockerignore and compare.",
    ],
    references: [
      {
        title: "Build cache invalidation",
        url: "https://docs.docker.com/build/cache/invalidation/",
        publisher: "Docker",
        kind: "official-docs",
      },
    ],
  },
  {
    slug: "tokenizer",
    title: "Byte-pair encoding explorer",
    summary:
      "Type any text and watch a toy BPE tokenizer split it into tokens, then change how many merges it has learned.",
    domain: "ai",
    lesson: "ai/tokenization",
    kind: "explorer",
    tryThis: [
      "Drag the merges slider to 0 and back up to see whole words emerge from characters.",
      "Type lowest, a word not in the training corpus, and see it built from learned pieces.",
      "Type a word with unseen letters, like zebra, to see why real tokenizers work on bytes.",
    ],
    references: [
      {
        title: "Neural Machine Translation of Rare Words with Subword Units",
        url: "https://arxiv.org/abs/1508.07909",
        publisher: "Sennrich, Haddow and Birch, 2016",
        kind: "paper",
      },
    ],
  },
  {
    slug: "message-queue",
    title: "Message queue simulator",
    summary:
      "Change producer rate, consumer count and downstream speed, and watch backlogs, message age, retries and the dead-letter queue respond.",
    domain: "system-design",
    lesson: "system-design/message-queues",
    kind: "simulation",
    tryThis: [
      "Turn on Slow downstream and watch the backlog and the oldest message's age grow.",
      "Add consumers to drain the backlog, then try a Spike with a bounded queue.",
      "Set poison messages to 5% and follow them into the dead-letter queue.",
    ],
    references: [
      {
        title: "Using dead-letter queues in Amazon SQS",
        url: "https://docs.aws.amazon.com/AWSSimpleQueueService/latest/SQSDeveloperGuide/sqs-dead-letter-queues.html",
        publisher: "Amazon Web Services",
        kind: "official-docs",
      },
    ],
  },
  {
    slug: "system-design-sandbox",
    title: "System design sandbox",
    summary:
      "Design a backend from app servers, a cache, read replicas and a write queue, then load-test it: watch utilisation, latency and the bottleneck move.",
    domain: "system-design",
    related: [
      "system-design/load-balancing",
      "system-design/caching",
      "system-design/message-queues",
      "computer-science/database-indexes",
    ],
    kind: "simulation",
    tryThis: [
      "In Free play at 1,000 requests/s, press Play with two app servers. Add servers until the bottleneck moves to the database.",
      "Raise the traffic to 4,000/s with 98% reads, then compare adding read replicas with turning on a cache.",
      "Notice that latency rises long before errors appear: at 80% utilisation a component is already five times slower than when idle.",
      "Pick a challenge and find the cheapest design that meets every goal — then fail a server mid-run to see how much headroom you left.",
    ],
    references: [
      {
        title: "Handling Overload (Site Reliability Engineering)",
        url: "https://sre.google/sre-book/handling-overload/",
        publisher: "Google",
        kind: "book",
      },
      {
        title: "Using load shedding to avoid overload",
        url: "https://aws.amazon.com/builders-library/using-load-shedding-to-avoid-overload/",
        publisher: "Amazon Web Services",
        kind: "article",
      },
    ],
  },
  {
    slug: "availability-zones",
    title: "Regions and Availability Zones",
    summary:
      "Run an application in one zone, three zones or two regions, then fail a zone, a region or the control plane, and see which layouts keep serving.",
    domain: "cloud",
    lesson: "cloud/regions-and-availability-zones",
    kind: "simulation",
    tryThis: [
      "With One zone, fail zone a1: every request fails, and auto-recovery can't help because there's nowhere healthy to launch.",
      "Switch to Three zones with Just enough capacity and fail a zone: a third of requests fail for five minutes while replacements launch.",
      "Choose Survive a zone, then fail a zone: nothing fails, because the spare capacity was already running.",
      "With Just enough capacity, impair the control plane before failing a zone: the errors never stop. That's why static stability matters.",
    ],
    references: [
      {
        title: "AWS Fault Isolation Boundaries: Availability Zones",
        url: "https://docs.aws.amazon.com/whitepapers/latest/aws-fault-isolation-boundaries/availability-zones.html",
        publisher: "Amazon Web Services",
        kind: "official-docs",
      },
      {
        title: "Static stability using Availability Zones",
        url: "https://builder.aws.com/content/3K9SiqiJ369TGkkGzqPM95BuYWI/static-stability-using-availability-zones",
        publisher: "Amazon Web Services",
        kind: "article",
      },
    ],
  },
  {
    slug: "deployment-strategies",
    title: "Deployment strategies",
    summary:
      "Ship the same buggy release all at once, rolling, blue-green or as a canary, with and without automated rollback, and count the failed requests.",
    domain: "cloud",
    lesson: "cloud/blue-green-and-canary-deployments",
    kind: "simulation",
    tryThis: [
      "Start with Canary: the bug is caught at 5% of traffic and rolled back within two minutes, before the overall error rate ever crosses the alarm.",
      "Switch to Blue-green: rollback is instant too, but every user hit the bug first, and you paid for two full fleets.",
      "Try All at once: there's downtime even when v2 is healthy — turn off the bug to see it.",
      "Turn off Automated rollback and compare the failed requests for each strategy.",
    ],
    references: [
      {
        title: "Canarying Releases (The Site Reliability Workbook)",
        url: "https://sre.google/workbook/canarying-releases/",
        publisher: "Google",
        kind: "book",
      },
      {
        title: "Deployments: strategy",
        url: "https://kubernetes.io/docs/concepts/workloads/controllers/deployment/#strategy",
        publisher: "Kubernetes",
        kind: "official-docs",
      },
    ],
  },
  {
    slug: "autoscaling",
    title: "Autoscaling",
    summary:
      "Watch a target tracking policy add and remove instances as traffic ramps, spikes and bursts — and see what start-up time and scale-in windows change.",
    domain: "cloud",
    lesson: "cloud/autoscaling",
    kind: "simulation",
    tryThis: [
      "Play the Ramp at a 60% target: capacity climbs ahead of demand, then steps back down gently.",
      "Raise the target to 90%: it's cheaper, but there's no room for the climb and requests fail.",
      "Pick Bursty traffic and set the scale-in window to None: capacity is removed in every lull, just before the next burst needs it.",
      "Set start-up to 6 minutes and add a traffic surge: new instances arrive after the surge has done its damage.",
    ],
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
    ],
  },
  {
    slug: "service-calls",
    title: "Monolith versus microservices",
    summary:
      "Split one request's work across services and watch failures and slow responses compound — then add timeouts, retries and a fallback.",
    domain: "software-architecture",
    lesson: "software-architecture/monoliths-and-microservices",
    kind: "simulation",
    tryThis: [
      "Compare 3, 5 and 10 services: each remote call adds its own small chance of failing and of being slow, and they multiply.",
      "Switch the calls to In parallel: the slowest answer decides, so ten parallel calls are slow about as often as ten in a row.",
      "Crash the recommendations service, then turn on the fallback: requests succeed without recommendations. Crash a module in the Monolith and everything stops.",
      "Slow down service 2 and turn on timeouts: slow responses become fast errors. Timeouts protect latency, not success.",
    ],
    references: [
      {
        title: "Microservices",
        url: "https://martinfowler.com/articles/microservices.html",
        publisher: "Martin Fowler and James Lewis",
        kind: "article",
      },
      {
        title: "The Tail at Scale",
        url: "https://research.google/pubs/pub40801/",
        publisher: "Google Research (Communications of the ACM)",
        kind: "paper",
      },
    ],
  },
  {
    slug: "event-sourcing",
    title: "Event sourcing and CQRS",
    summary:
      "Record every change as an event, rebuild state by replaying them, and watch read models fall behind, catch up, rebuild and appear from history.",
    domain: "software-architecture",
    lesson: "software-architecture/event-sourcing-and-cqrs",
    kind: "simulation",
    tryThis: [
      "Play, then stop the projector: events keep arriving, but the balance view shows an older balance until you restart it.",
      "Add a spending-by-category view mid-run: it is built from every past event, including ones recorded before it existed.",
      "Reverse the last withdrawal: a new event undoes it, and the original stays in the log.",
      "Turn off snapshots and compare how many events are replayed to load the account.",
    ],
    references: [
      {
        title: "Event Sourcing pattern",
        url: "https://learn.microsoft.com/en-us/azure/architecture/patterns/event-sourcing",
        publisher: "Microsoft",
        kind: "official-docs",
      },
      {
        title: "CQRS",
        url: "https://martinfowler.com/bliki/CQRS.html",
        publisher: "Martin Fowler",
        kind: "article",
      },
    ],
  },
  {
    slug: "hexagonal-architecture",
    title: "Hexagonal architecture explorer",
    summary:
      "Make the same five changes to a layered and a hexagonal version of one application, and see which modules each change touches and what its tests need.",
    domain: "software-architecture",
    lesson: "software-architecture/hexagonal-architecture",
    kind: "explorer",
    tryThis: [
      "Move the database to DynamoDB: in the hexagonal version only a new adapter appears; in the layered version the business layer changes too.",
      "Add a command-line tool: one new adapter, because the use case never knew about HTTP.",
      "Change a discount rule: the same small edit in both — the difference is whether its tests need a database.",
    ],
    references: [
      {
        title: "Hexagonal architecture",
        url: "https://alistair.cockburn.us/hexagonal-architecture/",
        publisher: "Alistair Cockburn",
        kind: "article",
      },
      {
        title: "The Clean Architecture",
        url: "https://blog.cleancoder.com/uncle-bob/2012/08/13/the-clean-architecture.html",
        publisher: "Robert C. Martin",
        kind: "article",
      },
    ],
  },
]);

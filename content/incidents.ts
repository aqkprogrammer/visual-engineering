import { defineIncidents } from "@/lib/content/schema";

/**
 * Incident lab scenarios. Charts and logs (`kind: "chart" | "log"`) come from simulation runs in
 * `lib/incidents/evidence.ts`; `pnpm content` checks every `ref` exists, and unit tests check the
 * evidence really shows what the briefing and answers claim.
 */
export default defineIncidents([
  {
    slug: "orders-arriving-late",
    title: "Order confirmations arrive later and later",
    summary:
      "Customers say confirmation emails are late, and the delay keeps growing. Nothing is erroring. Find out why the email queue is falling behind.",
    difficulty: "intermediate",
    lesson: "system-design/message-queues",
    demo: "message-queue",
    briefing: [
      "Support has forwarded a handful of complaints: order confirmation emails are arriving late. The first ones were seconds late; the latest are much worse.",
      "Orders go onto a queue, and three consumers take each one, record it in the payments database and send the email. No alerts have fired: there are no errors anywhere.",
    ],
    clues: [
      {
        kind: "chart",
        ref: "queue-rates",
        title: "Messages arriving and processed per second",
        caption: "Orders published to the queue, and orders the consumers finished, each second.",
      },
      {
        kind: "chart",
        ref: "queue-depth",
        title: "Messages waiting in the queue",
        caption: "How many orders are queued and not yet picked up by a consumer.",
      },
      {
        kind: "chart",
        ref: "queue-age",
        title: "Age of the oldest waiting message",
        caption:
          "How long the oldest queued order has been waiting — roughly how late its email will be.",
      },
      {
        kind: "chart",
        ref: "queue-busy",
        title: "Consumers busy",
        caption: "The share of consumers working on a message at that moment.",
      },
      {
        kind: "log",
        ref: "queue-dlq",
        title: "Queue and consumer status",
        caption: "Read from the queue's metrics at the end of the period above.",
      },
      {
        kind: "note",
        title: "Message from the database team",
        text: "“FYI: payments-db had a noisy neighbour on its storage this afternoon. Query latency is up about three times since around the time your charts change. We're on it.”",
      },
    ],
    questions: [
      {
        id: "orders-late-root-cause",
        prompt: "What is the root cause of the growing delay?",
        options: [
          {
            id: "a",
            text: "A traffic spike: more orders are arriving than usual.",
            explanation:
              "The arrival rate stays flat at 10 messages per second throughout. Nothing changed on the producer side.",
          },
          {
            id: "b",
            text: "Each message now takes about three times longer to process, because the database the consumers call slowed down, so processing capacity fell below the arrival rate.",
            correct: true,
            explanation:
              "Processed per second drops from 10 to about 5 while arrivals stay at 10, consumers go from partly to fully busy, and the database team reports 3× latency. The queue grows by the difference every second.",
          },
          {
            id: "c",
            text: "Poison messages are being retried and blocking the queue.",
            explanation:
              "The dead-letter queue is empty and nothing was retried. Poison messages would also show up as errors, and there are none.",
          },
          {
            id: "d",
            text: "Some consumers crashed, so fewer are running.",
            explanation:
              "All three consumers are running, and the busy chart shows them working all the time, not sitting idle or missing.",
          },
        ],
      },
      {
        id: "orders-late-first-fix",
        prompt: "What is the best first response?",
        options: [
          {
            id: "a",
            text: "Add twenty more consumers right away.",
            explanation:
              "The consumers are waiting on a database that is already struggling. Twenty more would multiply the load on it and could make every query slower. Add consumers only if the database has headroom.",
          },
          {
            id: "b",
            text: "Purge the queue so new orders are processed quickly.",
            explanation:
              "Purging deletes the backlog, so hundreds of customers would never get a confirmation. Fixing a delay by losing data is rarely acceptable.",
          },
          {
            id: "c",
            text: "Work with the database team to restore its latency, and alert on the age of the oldest message so this is caught early next time.",
            correct: true,
            explanation:
              "The bottleneck is the dependency, so that is what to fix; once latency recovers, three consumers drain the backlog. Queue age is the metric that would have shown the problem before customers did.",
          },
          {
            id: "d",
            text: "Increase the visibility timeout.",
            explanation:
              "The visibility timeout controls when an unacknowledged message is redelivered. Nothing is being redelivered here, so it would change nothing.",
          },
        ],
      },
    ],
    postmortem: {
      whatHappened:
        "The payments database slowed down by about three times. Each consumer took three times longer per order, so the three consumers could finish about 5 orders a second while 10 kept arriving. The queue grew by roughly 5 orders every second, and every new order waited longer than the last.",
      whyItHappened:
        "A queue is only stable when processing keeps up with arrivals over time. A slower dependency quietly cut processing capacity below the arrival rate. Because nothing failed, error-based alerts stayed silent; the delay was only visible in queue depth and message age.",
      prevention: [
        "Alert on the age of the oldest message, not just errors or queue length.",
        "Know each consumer's dependencies and their headroom before scaling consumers.",
        "Track processed-per-second against arrivals-per-second on one chart.",
        "Agree what to do when a backlog builds: shed low-priority work, slow producers, or scale.",
      ],
    },
    reproduce: [
      "Open the message queue demo and press Play at the Normal producer rate with 3 consumers.",
      "Turn on Slow downstream and watch Waiting and Oldest message age climb.",
      "Add consumers to see the backlog drain — in the model, the database never gets slower, which is exactly the assumption to question in real life.",
    ],
  },
  {
    slug: "errors-after-a-crash",
    title: "Errors after a server crash, then silence",
    summary:
      "A server died and about a third of requests failed for a while — then errors stopped on their own. Work out why they started, why they stopped, and what to change.",
    difficulty: "beginner",
    lesson: "system-design/load-balancing",
    demo: "load-balancer",
    briefing: [
      "A load balancer spreads traffic across three servers using round robin. One of them, app-2, crashed.",
      "The error dashboard shows a burst of failed requests right after the crash. Then, without anyone touching anything, errors went back to zero. Your manager asks two questions: why did users see errors at all, and why did they stop?",
    ],
    clues: [
      {
        kind: "chart",
        ref: "lb-errors",
        title: "Requests per 100 ms",
        caption: "Requests that succeeded and failed in each 100 ms of simulated time.",
      },
      {
        kind: "chart",
        ref: "lb-rotation",
        title: "Servers in rotation",
        caption: "How many servers the load balancer was sending new requests to.",
      },
      {
        kind: "log",
        ref: "lb-events",
        title: "Load balancer log for app-2",
        caption: "Every log line mentioning app-2, with simulated timestamps.",
      },
      {
        kind: "log",
        ref: "lb-config",
        title: "Load balancer configuration",
        caption: "The relevant settings, as deployed.",
      },
    ],
    questions: [
      {
        id: "lb-crash-root-cause",
        prompt: "Why did requests keep failing after the crash, and why did the errors stop?",
        options: [
          {
            id: "a",
            text: "The other two servers were overloaded until autoscaling added capacity.",
            explanation:
              "Every failure in the log is “app-2 unreachable”, and the number of servers never went up. The healthy servers kept succeeding throughout.",
          },
          {
            id: "b",
            text: "The balancer kept sending app-2 its share of requests until app-2 failed three health checks in a row, 500 ms apart; then it removed app-2 from rotation and errors stopped.",
            correct: true,
            explanation:
              "The log shows health-check failures 1, 2 and 3 of 3 at 1500, 2000 and 2500 ms, failures only on app-2 in between, and “removed from rotation” at 2500 ms — exactly when the rotation chart drops to two and errors end.",
          },
          {
            id: "c",
            text: "Clients cached the address of app-2 in DNS until the TTL expired.",
            explanation:
              "Clients talk to the load balancer, not to app-2 directly, so DNS caching of server addresses isn't involved. The balancer chose app-2 for each failed request.",
          },
          {
            id: "d",
            text: "Round robin has a bug that keeps choosing crashed servers.",
            explanation:
              "Round robin isn't meant to know about health. Any algorithm only chooses among servers in rotation; health checks decide who is in rotation.",
          },
        ],
      },
      {
        id: "lb-crash-fix",
        prompt: "Which change would most reduce the errors users see next time a server dies?",
        options: [
          {
            id: "a",
            text: "Switch from round robin to least connections.",
            explanation:
              "The algorithm still picks from the servers in rotation, and the dead server stays in rotation until health checks remove it, so the window of errors remains.",
          },
          {
            id: "b",
            text: "Disable health checks so they can't fail.",
            explanation:
              "Then the dead server would never be removed and a third of requests would fail until someone intervened.",
          },
          {
            id: "c",
            text: "Detect failure sooner — a shorter interval or lower threshold, plus passive checks on real traffic — and retry failed idempotent requests on another server.",
            correct: true,
            explanation:
              "The error window is roughly interval × threshold. Shrinking it, and noticing failures from real responses, removes dead servers faster; retries hide the remaining gap. The trade-off: too aggressive, and brief slowdowns eject healthy servers.",
          },
          {
            id: "d",
            text: "Add a fourth server.",
            explanation:
              "A fourth server lowers the share of traffic each one gets, so slightly fewer requests fail, but the dead server is still in rotation for the same length of time.",
          },
        ],
      },
    ],
    postmortem: {
      whatHappened:
        "app-2 crashed at 1500 ms. The balancer continued to send it every third request until its third consecutive failed health check at 2500 ms, when it was removed from rotation. For that second, about a third of requests failed.",
      whyItHappened:
        "Active health checks only run periodically and need several failures in a row, to avoid ejecting servers for brief blips. The window between a crash and its removal is roughly the check interval times the unhealthy threshold; with real settings such as every 10 seconds and 3 failures, that is 20–30 seconds.",
      prevention: [
        "Choose health-check interval and threshold deliberately, knowing the window they create.",
        "Enable passive health checks so real failed responses count immediately.",
        "Retry idempotent requests on a different server.",
        "Drain servers before planned shutdowns, so only unplanned crashes cause errors.",
      ],
    },
    reproduce: [
      "Open the load balancer demo with Health checks on and press Play.",
      "Press Crash app-2 and watch Errors (last 1 s) rise, then fall once app-2 leaves rotation.",
      "Restart app-2, turn Health checks off and crash it again: the errors never stop.",
    ],
  },
  {
    slug: "cache-collapse-at-night",
    title: "The cache stops working every night",
    summary:
      "Every night the cache hit ratio falls to zero and response times jump to the database's speed. The cache isn't down. Find what is evicting everything.",
    difficulty: "intermediate",
    lesson: "system-design/caching",
    demo: "cache",
    briefing: [
      "An API caches product records in front of a database. During the day the cache serves most reads and responses are fast.",
      "Each night at the same time the hit ratio collapses to zero and the database gets every request. The cache servers are healthy and nobody has deployed anything.",
    ],
    clues: [
      {
        kind: "chart",
        ref: "cache-hit-ratio",
        title: "Cache hit ratio",
        caption: "Share of the last 40 requests answered from the cache.",
      },
      {
        kind: "chart",
        ref: "cache-latency",
        title: "Average response time",
        caption:
          "1 ms for a cache hit and 40 ms for a database read, averaged over the last 40 requests.",
      },
      {
        kind: "log",
        ref: "cache-access-log",
        title: "Cache access log, a few seconds into the drop",
        caption:
          "Each request, the key it asked for, the outcome and any key evicted to make room.",
      },
      {
        kind: "log",
        ref: "cache-config",
        title: "Cache configuration",
        caption: "Settings, and what the export job reads.",
      },
    ],
    questions: [
      {
        id: "cache-collapse-root-cause",
        prompt: "Why does the hit ratio fall to zero?",
        options: [
          {
            id: "a",
            text: "The TTL is expiring every entry at the same moment.",
            explanation:
              "The outcomes are “miss”, not “expired”, and each miss evicts another key to make room. Entries are pushed out, not timing out.",
          },
          {
            id: "b",
            text: "The export job reads 8 keys in a repeating sequence through a 4-key LRU cache, so each key is evicted just before it is needed again.",
            correct: true,
            explanation:
              "The access log shows A, B, C … H in order, every one a miss that evicts the key read four requests earlier. With LRU, the next key needed is always the one just evicted — a sequential scan larger than the cache defeats it completely.",
          },
          {
            id: "c",
            text: "The cache server restarted and lost its contents.",
            explanation:
              "A restart would cause one miss per key and then hits again. Here misses continue indefinitely while the cache stays full.",
          },
          {
            id: "d",
            text: "Writes are invalidating the entries.",
            explanation:
              "Invalidation would remove entries without evicting others. The log shows evictions caused by new entries, on a read-only job.",
          },
        ],
      },
      {
        id: "cache-collapse-fix",
        prompt: "What is the most targeted fix?",
        options: [
          {
            id: "a",
            text: "Have the export job bypass the cache (or read from a replica), or use a scan-resistant eviction policy.",
            correct: true,
            explanation:
              "The batch job gains nothing from caching data it reads once, and it destroys the cache for everyone else. Bypassing the cache, or a policy that resists one-off scans, keeps daytime hot data cached.",
          },
          {
            id: "b",
            text: "Double the TTL.",
            explanation:
              "Expiry isn't the problem: entries are evicted for space long before they expire.",
          },
          {
            id: "c",
            text: "Switch to FIFO eviction.",
            explanation:
              "First-in-first-out has the same problem with a repeating sequence longer than the cache: each key is evicted before it comes round again.",
          },
          {
            id: "d",
            text: "Flush the cache before the job starts.",
            explanation:
              "That only makes the miss storm start sooner; the job still evicts everything.",
          },
        ],
      },
    ],
    postmortem: {
      whatHappened:
        "A nightly export job read every product key in order, repeatedly. The cache holds 4 keys and the job cycled through 8, so under LRU each read evicted the key that would be needed four requests later. The hit ratio fell to zero and every request paid the 40 ms database cost.",
      whyItHappened:
        "LRU assumes recently used data will be used again soon. A sequential scan breaks that assumption: it touches each key once per cycle, and when the cycle is longer than the cache, every access misses. The scan also evicts the hot data daytime traffic relies on.",
      prevention: [
        "Route batch and analytics reads around the shared cache.",
        "Consider scan-resistant policies when large sequential reads are expected.",
        "Alert on hit ratio, not only on cache server health.",
      ],
    },
    reproduce: [
      "Open the cache demo with Eviction policy LRU, Capacity 4 and Access pattern Hot keys, and press Play.",
      "Switch Access pattern to Sequential scan and watch Hit ratio (last 40) fall to zero.",
      "Try LFU and FIFO with the same scan, then return to Hot keys.",
    ],
  },
  {
    slug: "pods-missing-after-node-failure",
    title: "A node died and recovery took minutes",
    summary:
      "A node lost power. Kubernetes is meant to self-heal, yet one replica stayed missing for minutes. Find out what Kubernetes was waiting for.",
    difficulty: "advanced",
    lesson: "containers/kubernetes-self-healing",
    demo: "kubernetes-self-healing",
    briefing: [
      "A Deployment runs three replicas of a web service, spread across three nodes. One node, node-b, lost power.",
      "Capacity dropped to two of three replicas, and stayed there for what felt like ages before a replacement appeared. A teammate asks: isn't Kubernetes supposed to replace failed pods immediately?",
    ],
    clues: [
      {
        kind: "chart",
        ref: "k8s-ready",
        title: "Ready pods behind the Service",
        caption:
          "Pods passing readiness and receiving traffic. Each step stands for a few seconds of real time; the model compresses Kubernetes' real timings.",
      },
      {
        kind: "log",
        ref: "k8s-events",
        title: "Cluster events after the failure",
        caption: "Events recorded by the control plane, in order.",
      },
      {
        kind: "note",
        title: "Real defaults the model compresses",
        text: "Node monitor grace period: 40 seconds before a silent node is marked NotReady. Default toleration for not-ready and unreachable nodes: 300 seconds before pods are evicted.",
      },
    ],
    questions: [
      {
        id: "k8s-node-root-cause",
        prompt: "Why did the replacement pod take so long to appear?",
        options: [
          {
            id: "a",
            text: "The scheduler couldn't find room for the replacement.",
            explanation:
              "The scheduler placed the new pod on node-a in the same step it was created. Scheduling was quick.",
          },
          {
            id: "b",
            text: "Kubernetes first waited to be sure the node was gone, then waited out the pods' toleration for unreachable nodes before evicting them; only then did the ReplicaSet create a replacement.",
            correct: true,
            explanation:
              "The events show the node marked NotReady some steps after the power loss, the pod removed from endpoints, then “Toleration expired (default 300 s)” and only then a new pod. Those two waits avoid replacing pods during brief network blips.",
          },
          {
            id: "c",
            text: "The new image took minutes to download.",
            explanation:
              "The new pod started a few steps after creation. The long gap is before it was created, not after.",
          },
          {
            id: "d",
            text: "A liveness probe was misconfigured.",
            explanation:
              "Liveness probes are run by the kubelet on the node, which had no power. Node failures are handled by the node lifecycle controller instead.",
          },
        ],
      },
      {
        id: "k8s-node-fix",
        prompt: "What is the most robust way to stop node failures hurting users?",
        options: [
          {
            id: "a",
            text: "Set the default toleration to 0 seconds everywhere.",
            explanation:
              "Pods would be evicted during any brief network partition, causing needless churn across the cluster. Shorter tolerations can make sense for some workloads, but with care.",
          },
          {
            id: "b",
            text: "Run enough replicas, spread across nodes or zones, that losing one node leaves enough capacity while Kubernetes takes its time.",
            correct: true,
            explanation:
              "Self-healing is deliberately cautious. Designing for the loss of a node — spread constraints, spare replicas, PodDisruptionBudgets — means the wait doesn't matter.",
          },
          {
            id: "c",
            text: "Add a liveness probe that checks the node.",
            explanation:
              "Probes run on the node itself; a dead node can't run them or report the results.",
          },
          {
            id: "d",
            text: "Restart the control plane when a node fails.",
            explanation:
              "The control plane is working as designed; restarting it adds risk and doesn't speed up the timeouts.",
          },
        ],
      },
    ],
    postmortem: {
      whatHappened:
        "node-b lost power. After the node monitor grace period it was marked NotReady and its pod left the Service, leaving two of three replicas. The pod was only evicted once its toleration for unreachable nodes expired; then the ReplicaSet created a replacement, which was scheduled, started and became ready.",
      whyItHappened:
        "Kubernetes can't tell a dead node from a temporarily unreachable one, so it waits before acting: by default about 40 seconds to mark the node NotReady and 300 seconds before evicting its pods. Replacing pods on every short network blip would cause more harm than waiting.",
      prevention: [
        "Size replicas so the loss of any one node (or zone) leaves enough capacity.",
        "Spread replicas with topology spread constraints or anti-affinity.",
        "Tune tolerationSeconds per workload only when faster failover is worth the extra churn.",
      ],
    },
    reproduce: [
      "Open the Kubernetes self-healing demo with 3 replicas and press Play.",
      "Press Fail node-b and step through: watch Ready endpoints drop, then the node turn NotReady, the eviction and the replacement.",
      "Compare with Crash on a single pod, which the kubelet restarts within a few steps.",
    ],
  },
]);

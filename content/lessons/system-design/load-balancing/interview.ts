import { defineInterview } from "@/lib/content/schema";

export default defineInterview([
  {
    id: "layer-4-vs-layer-7",
    question:
      "What is the difference between layer 4 and layer 7 load balancing, and when would you choose each?",
    level: "mid",
    kind: "trade-off",
    answer:
      "A layer 4 balancer forwards TCP/UDP connections using addresses and ports, without reading the payload; it is fast and protocol-agnostic. A layer 7 balancer parses the application protocol (usually HTTP), so it can route by path or header, terminate TLS, and balance individual requests rather than whole connections. Choose layer 4 for raw throughput or non-HTTP protocols; choose layer 7 when you need content-based routing, or when long-lived multiplexed connections (HTTP/2, gRPC) would otherwise pin all of a client's traffic to one server.",
    rubric: {
      core: [
        "Layer 4 forwards connections by address and port without reading the payload",
        "Layer 7 parses HTTP, so it can route by path or header and balance individual requests",
        "Chooses layer 4 for raw throughput or non-HTTP protocols, layer 7 for content-based routing",
      ],
      strong: [
        "Notes that long-lived HTTP/2 or gRPC connections pin a client's traffic to one server under layer 4",
      ],
      redFlags: ["Claims layer 7 is always better, ignoring its cost and protocol limits"],
    },
  },
  {
    id: "detecting-failed-servers",
    question:
      "How does a load balancer know a server has failed, and what is the trade-off in configuring that?",
    level: "mid",
    kind: "concept",
    answer:
      "Through active health checks (periodic probes with failure and recovery thresholds) and/or passive checks (observing errors on real traffic). Shorter intervals and lower thresholds detect failures faster but risk removing healthy servers during brief slowdowns; longer settings are more stable but send traffic to dead servers for longer. Health endpoints should usually be shallow, so a shared dependency's blip does not remove every server simultaneously.",
    rubric: {
      core: [
        "Active health checks: periodic probes with failure and recovery thresholds",
        "Passive checks: watching errors on real traffic",
        "The trade-off: faster detection versus removing healthy servers during brief slowdowns",
      ],
      strong: [
        "Keeps health endpoints shallow so a shared dependency's blip doesn't remove every server",
      ],
      redFlags: ["Assumes failures are detected instantly"],
    },
  },
  {
    id: "round-robin-vs-least-connections",
    question:
      "Round robin versus least connections — which would you pick for an API where some requests take 10 ms and others 5 seconds?",
    level: "junior",
    kind: "trade-off",
    answer:
      "Least connections (or least outstanding requests, or power of two choices). Round robin would give each server the same number of requests regardless of cost, so a server that happens to receive several 5-second requests falls behind while still receiving its full share. Load-aware algorithms route new work away from servers with many requests in flight.",
    rubric: {
      core: [
        "Chooses least connections or another load-aware algorithm",
        "Round robin ignores how expensive each request is",
        "Slow requests pile up on servers that happen to receive several of them",
      ],
      strong: ["Mentions least outstanding requests or power of two choices"],
      redFlags: ["Picks round robin because it is fair"],
    },
  },
  {
    id: "load-balancer-single-point-of-failure",
    question: "Isn't the load balancer itself a single point of failure?",
    level: "mid",
    kind: "design",
    answer:
      "It can be. Managed cloud balancers run as many nodes across Availability Zones behind one DNS name. Self-managed setups run multiple balancer instances with a floating IP that moves on failure, multiple DNS records, or anycast. The goal is that no single machine's failure takes the entry point down.",
    rubric: {
      core: [
        "Acknowledges that a single balancer instance is a single point of failure",
        "Adds redundancy: several balancer nodes with a floating IP, multiple DNS records or anycast",
        "Spreads balancer nodes across availability zones",
      ],
      strong: ["Notes that managed cloud balancers already run as many nodes behind one name"],
      redFlags: ["Says the load balancer itself cannot fail"],
    },
  },
  {
    id: "sticky-sessions",
    question: "Why might sticky sessions be a bad idea?",
    level: "mid",
    kind: "trade-off",
    answer:
      "They tie a user to one server, so that server's failure or replacement disrupts its users, deploys must drain sessions, and load becomes uneven when a few users are very active. Moving session state to a shared store such as a database or cache keeps servers interchangeable, which is what makes balancing and scaling straightforward.",
    rubric: {
      core: [
        "Sticky sessions tie each user to one server",
        "That server's failure or replacement disrupts its users, and deploys must drain sessions",
        "Load becomes uneven when a few users are very active",
      ],
      strong: ["Moves session state to a shared store so servers stay interchangeable"],
      redFlags: ["Treats stickiness as free"],
    },
  },
]);

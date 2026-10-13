import { defineInterview } from "@/lib/content/schema";

export default defineInterview([
  {
    id: "region-vs-availability-zone",
    question:
      "What is the difference between a region and an Availability Zone, and why do both exist?",
    level: "junior",
    kind: "concept",
    answer:
      "A region is a geographic area with its own, isolated copy of the provider's services. An Availability Zone is one of several isolated locations inside a region, each with independent power, networking and connectivity, close enough for low-latency links. Zones let you survive the loss of a data centre without leaving the region; regions let you survive a region-wide event, serve users nearer to them, and meet data-residency rules.",
    rubric: {
      core: [
        "A region is a separate geographic area, isolated from other regions",
        "Zones are isolated locations within a region with independent power and networking",
        "Zones are close enough for low-latency, synchronous replication",
      ],
      strong: ["Mentions latency to users and data residency as reasons to choose regions"],
      redFlags: ["Says zones and regions are the same thing"],
    },
  },
  {
    id: "survive-a-zone-failure",
    question:
      "How would you design a web application to survive the loss of one Availability Zone?",
    level: "mid",
    kind: "design",
    answer:
      "Run every tier in at least two, preferably three zones: instances behind a load balancer that spans zones, a database with a standby in another zone, and no single-zone dependencies such as one NAT gateway. Size the fleet so the remaining zones can carry the full load — with three zones, 50% headroom — rather than relying on replacements launching during the incident. Test it by actually removing a zone.",
    rubric: {
      core: [
        "Spreads instances across zones behind a load balancer",
        "Makes every tier multi-zone, including the database and network dependencies",
        "Sizes capacity so the surviving zones can carry the load",
      ],
      strong: [
        "Names static stability and the 50% figure for three zones",
        "Tests failover with game days or fault injection",
      ],
      redFlags: ["Relies only on autoscaling to replace lost capacity"],
    },
  },
  {
    id: "static-stability",
    question: "What is static stability, and why do providers recommend it?",
    level: "senior",
    kind: "trade-off",
    answer:
      "A statically stable system keeps working through a failure without needing to change anything — no new instances, no configuration changes. For zones, that means provisioning enough capacity in advance that losing one leaves enough. It is recommended because reacting depends on the control plane at the moment it is most strained and takes minutes even when it works. The trade-off is paying for idle headroom all the time.",
    rubric: {
      core: [
        "Defines it as surviving a failure without having to take any action",
        "Pre-provisions capacity rather than launching it during the incident",
        "Explains the dependency on the control plane during incidents",
      ],
      strong: ["Acknowledges the cost of idle headroom and when it's worth it"],
      redFlags: ["Confuses it with a system that never changes or never scales"],
    },
  },
  {
    id: "multi-region-when",
    question: "When would you move from multi-zone to multi-region, and what gets harder?",
    level: "senior",
    kind: "trade-off",
    answer:
      "When a region-wide outage is unacceptable for the business, when users are spread across the world and need lower latency, or when regulations require data to stay in particular places. What gets harder: deploying and operating a full second stack, replicating data asynchronously and deciding what happens to writes during failover, routing users with DNS or a global load balancer, and testing it all. For many systems, multi-zone plus cross-region backups is enough.",
    rubric: {
      core: [
        "Gives business reasons: region-level outages, global latency, data residency",
        "Names data replication and consistency as the hard part",
        "Mentions routing and failover, such as DNS, and its delays",
      ],
      strong: ["Suggests multi-zone with cross-region backups as a cheaper middle ground"],
      redFlags: ["Treats multi-region as a simple extension of multi-zone"],
    },
  },
]);

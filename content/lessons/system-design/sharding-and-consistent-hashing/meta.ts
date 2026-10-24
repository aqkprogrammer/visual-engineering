import { defineLesson } from "@/lib/content/schema";

export default defineLesson({
  slug: "sharding-and-consistent-hashing",
  domain: "system-design",
  module: "data",
  order: 30,
  title: "Sharding and consistent hashing",
  description:
    "How sharding splits data across nodes, why hash-modulo placement reshuffles everything, how consistent hashing and virtual nodes fix it, and why hot keys still hurt.",
  difficulty: "intermediate",
  related: ["system-design/replication", "system-design/load-balancing"],
  tags: ["sharding", "partitioning", "consistent-hashing", "virtual-nodes", "hot-partition"],
  references: [
    {
      title: "Dynamo: Amazon's Highly Available Key-value Store",
      url: "https://www.allthingsdistributed.com/files/amazon-dynamo-sosp2007.pdf",
      publisher: "DeCandia et al., SOSP 2007",
      kind: "paper",
    },
    {
      title:
        "Consistent hashing and random trees: distributed caching protocols for relieving hot spots on the World Wide Web",
      url: "https://doi.org/10.1145/258533.258660",
      publisher: "Karger et al., STOC 1997",
      kind: "paper",
    },
    {
      title: "Dynamo (Cassandra architecture)",
      url: "https://cassandra.apache.org/doc/latest/cassandra/architecture/dynamo.html",
      publisher: "Apache Cassandra",
      kind: "official-docs",
    },
    {
      title: "Best practices for designing and using partition keys effectively",
      url: "https://docs.aws.amazon.com/amazondynamodb/latest/developerguide/bp-partition-key-design.html",
      publisher: "Amazon Web Services",
      kind: "official-docs",
    },
  ],
  lastReviewed: "2026-10-24",
  status: "published",
});

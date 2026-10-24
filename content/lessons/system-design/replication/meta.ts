import { defineLesson } from "@/lib/content/schema";

export default defineLesson({
  slug: "replication",
  domain: "system-design",
  module: "data",
  order: 20,
  title: "Database replication: leaders, followers and lag",
  description:
    "How leader-follower replication copies every change, why reads from replicas can be stale, what synchronous replication costs, and what failover can lose.",
  difficulty: "intermediate",
  related: ["system-design/caching", "system-design/sharding-and-consistent-hashing"],
  tags: ["replication", "replication-lag", "failover", "read-your-writes", "quorum"],
  references: [
    {
      title: "Log-Shipping Standby Servers (streaming and synchronous replication)",
      url: "https://www.postgresql.org/docs/current/warm-standby.html",
      publisher: "PostgreSQL",
      kind: "official-docs",
    },
    {
      title: "Dynamo: Amazon's Highly Available Key-value Store",
      url: "https://www.allthingsdistributed.com/files/amazon-dynamo-sosp2007.pdf",
      publisher: "DeCandia et al., SOSP 2007",
      kind: "paper",
    },
    {
      title: "Dynamo (Cassandra architecture)",
      url: "https://cassandra.apache.org/doc/latest/cassandra/architecture/dynamo.html",
      publisher: "Apache Cassandra",
      kind: "official-docs",
    },
  ],
  lastReviewed: "2026-10-24",
  status: "published",
});

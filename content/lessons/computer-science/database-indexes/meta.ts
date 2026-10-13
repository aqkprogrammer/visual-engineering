import { defineLesson } from "@/lib/content/schema";

export default defineLesson({
  slug: "database-indexes",
  domain: "computer-science",
  module: "databases",
  order: 10,
  title: "How database indexes work",
  description:
    "Why a lookup without an index reads the whole table, how a B+ tree index finds a row in a handful of page reads, and what indexes cost on every write.",
  difficulty: "beginner",
  related: ["system-design/caching"],
  tags: ["databases", "indexes", "b-tree", "sql", "performance"],
  references: [
    {
      title: "Indexes: Introduction",
      url: "https://www.postgresql.org/docs/current/indexes-intro.html",
      publisher: "PostgreSQL",
      kind: "official-docs",
    },
    {
      title: "Index Types",
      url: "https://www.postgresql.org/docs/current/indexes-types.html",
      publisher: "PostgreSQL",
      kind: "official-docs",
    },
    {
      title: "B-Tree Indexes (implementation)",
      url: "https://www.postgresql.org/docs/current/btree.html",
      publisher: "PostgreSQL",
      kind: "official-docs",
    },
    {
      title: "Multicolumn Indexes",
      url: "https://www.postgresql.org/docs/current/indexes-multicolumn.html",
      publisher: "PostgreSQL",
      kind: "official-docs",
    },
    {
      title: "Index-Only Scans and Covering Indexes",
      url: "https://www.postgresql.org/docs/current/indexes-index-only-scans.html",
      publisher: "PostgreSQL",
      kind: "official-docs",
    },
    {
      title: "Using EXPLAIN",
      url: "https://www.postgresql.org/docs/current/using-explain.html",
      publisher: "PostgreSQL",
      kind: "official-docs",
    },
    {
      title: "Anatomy of an SQL Index: the B-tree",
      url: "https://use-the-index-luke.com/sql/anatomy/the-tree",
      publisher: "Use The Index, Luke (Markus Winand)",
      kind: "book",
    },
  ],
  lastReviewed: "2026-10-13",
  status: "published",
});

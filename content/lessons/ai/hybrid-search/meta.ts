import { defineLesson } from "@/lib/content/schema";

export default defineLesson({
  slug: "hybrid-search",
  domain: "ai",
  module: "retrieval",
  order: 30,
  title: "Keyword, vector and hybrid search",
  description:
    "How BM25 keyword search and embedding search each fail, how reciprocal rank fusion combines them, and how to measure retrieval with recall@k.",
  difficulty: "intermediate",
  prerequisites: ["ai/embeddings", "ai/how-rag-works"],
  related: ["ai/chunking"],
  tags: ["hybrid-search", "bm25", "vector-search", "reciprocal-rank-fusion", "retrieval"],
  references: [
    {
      title: "Similarity settings (BM25)",
      url: "https://www.elastic.co/docs/reference/elasticsearch/index-settings/similarity",
      publisher: "Elastic",
      kind: "official-docs",
    },
    {
      title: "Reciprocal rank fusion",
      url: "https://www.elastic.co/docs/reference/elasticsearch/rest-apis/reciprocal-rank-fusion",
      publisher: "Elastic",
      kind: "official-docs",
    },
    {
      title: "Reciprocal Rank Fusion outperforms Condorcet and individual Rank Learning Methods",
      url: "https://plg.uwaterloo.ca/~gvcormac/cormacksigir09-rrf.pdf",
      publisher: "Cormack, Clarke and Büttcher, SIGIR 2009",
      kind: "paper",
    },
    {
      title: "The Probabilistic Relevance Framework: BM25 and Beyond",
      url: "https://doi.org/10.1561/1500000019",
      publisher: "Robertson and Zaragoza, 2009",
      kind: "paper",
    },
    {
      title: "Introducing Contextual Retrieval",
      url: "https://www.anthropic.com/news/contextual-retrieval",
      publisher: "Anthropic",
      kind: "article",
    },
  ],
  lastReviewed: "2026-10-24",
  status: "published",
});

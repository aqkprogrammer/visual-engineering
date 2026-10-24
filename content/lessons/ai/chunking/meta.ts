import { defineLesson } from "@/lib/content/schema";

export default defineLesson({
  slug: "chunking",
  domain: "ai",
  module: "retrieval",
  order: 20,
  title: "Chunking documents for retrieval",
  description:
    "How fixed-size, sentence and structure-aware chunking split documents for RAG, what overlap and headings fix, and how chunk size trades recall against cost.",
  difficulty: "intermediate",
  prerequisites: ["ai/how-rag-works"],
  related: ["ai/embeddings", "ai/hybrid-search"],
  tags: ["chunking", "rag", "retrieval", "text-splitting", "contextual-retrieval"],
  references: [
    {
      title: "Recursive text splitter",
      url: "https://docs.langchain.com/oss/python/integrations/splitters/recursive_text_splitter",
      publisher: "LangChain",
      kind: "official-docs",
    },
    {
      title: "Introducing Contextual Retrieval",
      url: "https://www.anthropic.com/news/contextual-retrieval",
      publisher: "Anthropic",
      kind: "article",
    },
    {
      title: "Lost in the Middle: How Language Models Use Long Contexts",
      url: "https://arxiv.org/abs/2307.03172",
      publisher: "Liu et al., 2023",
      kind: "paper",
    },
  ],
  lastReviewed: "2026-10-24",
  status: "published",
});

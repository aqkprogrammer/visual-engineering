import { defineLesson } from "@/lib/content/schema";

export default defineLesson({
  slug: "how-rag-works",
  domain: "ai",
  module: "retrieval",
  order: 10,
  title: "How retrieval-augmented generation (RAG) works",
  description:
    "How RAG grounds a language model in your own documents — chunking, retrieval, reranking, context — and why a wrong retrieval gives a confidently wrong answer.",
  difficulty: "intermediate",
  prerequisites: ["ai/embeddings"],
  related: ["ai/tokenization"],
  tags: ["rag", "llm", "retrieval", "vector-search", "grounding"],
  references: [
    {
      title: "Retrieval-Augmented Generation for Knowledge-Intensive NLP Tasks",
      url: "https://arxiv.org/abs/2005.11401",
      publisher: "Lewis et al., 2020",
      kind: "paper",
    },
    {
      title: "Lost in the Middle: How Language Models Use Long Contexts",
      url: "https://arxiv.org/abs/2307.03172",
      publisher: "Liu et al., 2023",
      kind: "paper",
    },
    {
      title: "Sentence-BERT: Sentence Embeddings using Siamese BERT-Networks",
      url: "https://arxiv.org/abs/1908.10084",
      publisher: "Reimers and Gurevych, 2019",
      kind: "paper",
    },
    {
      title:
        "Efficient and robust approximate nearest neighbor search using Hierarchical Navigable Small World graphs",
      url: "https://arxiv.org/abs/1603.09320",
      publisher: "Malkov and Yashunin",
      kind: "paper",
    },
  ],
  lastReviewed: "2026-10-13",
  status: "published",
});

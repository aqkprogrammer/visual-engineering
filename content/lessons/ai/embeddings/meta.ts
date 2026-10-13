import { defineLesson } from "@/lib/content/schema";

export default defineLesson({
  slug: "embeddings",
  domain: "ai",
  module: "language-models",
  order: 20,
  title: "Embeddings and vector similarity",
  description:
    "How models turn text into vectors that capture meaning, how cosine similarity, dot product and distance compare them, and how vector search uses them.",
  difficulty: "beginner",
  tags: ["embeddings", "vector-search", "cosine-similarity", "semantic-search", "rag"],
  references: [
    {
      title: "Embeddings (Machine Learning Crash Course)",
      url: "https://developers.google.com/machine-learning/crash-course/embeddings",
      publisher: "Google",
      kind: "official-docs",
    },
    {
      title: "Efficient Estimation of Word Representations in Vector Space (word2vec)",
      url: "https://arxiv.org/abs/1301.3781",
      publisher: "Mikolov et al., 2013",
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
  lastReviewed: "2026-10-12",
  status: "published",
});

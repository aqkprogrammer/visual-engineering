import { defineInterview } from "@/lib/content/schema";

export default defineInterview([
  {
    id: "cosine-vs-dot-product",
    question:
      "What is the difference between cosine similarity and the dot product, and when are they the same?",
    level: "mid",
    kind: "concept",
    answer:
      "The dot product depends on both the angle between two vectors and their lengths; cosine similarity divides out the lengths and depends only on the angle. They are equal when both vectors have length 1. Normalising vectors at indexing time therefore lets you use the cheaper dot product while getting cosine rankings.",
    rubric: {
      core: [
        "The dot product depends on the angle and the lengths; cosine similarity only on the angle",
        "They are equal when both vectors have length 1",
        "Normalising at index time allows the cheaper dot product with cosine rankings",
      ],
      strong: ["Notes that an unusually long vector can dominate dot-product rankings"],
      redFlags: ["Says the two always produce the same ranking"],
    },
  },
  {
    id: "embedding-model-upgrade",
    question:
      "You upgraded your embedding model and search quality collapsed. What probably happened?",
    level: "mid",
    kind: "debugging",
    answer:
      "The query is now embedded with the new model while the stored documents were embedded with the old one. Different models produce incompatible vector spaces, so distances between them are meaningless. Re-embed the whole collection with the new model, and store the model version with each vector so the mismatch can be detected.",
    rubric: {
      core: [
        "Queries and stored documents were embedded by different models",
        "Vectors from different models are not comparable",
        "Re-embeds the whole collection with the new model",
      ],
      strong: ["Stores the model version with each vector so mismatches can be detected"],
      redFlags: ["Tries to fix it by tuning a similarity threshold"],
    },
  },
  {
    id: "approximate-nearest-neighbour",
    question: "Why do vector databases use approximate nearest neighbour search?",
    level: "mid",
    kind: "concept",
    answer:
      "Exact search compares the query with every vector, which grows linearly with the collection and becomes too slow at millions or billions of items. ANN indexes such as HNSW navigate a graph or partitioned structure to find very likely neighbours in a small fraction of the comparisons, accepting a small loss of recall. Index parameters trade speed, memory and recall against each other.",
    rubric: {
      core: [
        "Exact search compares the query with every vector, which grows linearly with the collection",
        "ANN indexes such as HNSW find likely neighbours with far fewer comparisons",
        "They accept a small loss of recall",
      ],
      strong: ["Mentions that index parameters trade speed, memory and recall"],
      redFlags: ["Says ANN results are always exact"],
    },
  },
  {
    id: "hybrid-search",
    question: "Why might you combine keyword search with vector search?",
    level: "mid",
    kind: "trade-off",
    answer:
      "Vector search captures meaning and paraphrase but can miss exact tokens such as product codes, names or error messages, and can blur important small differences. Keyword search handles exact terms precisely but misses synonyms. Running both and merging the results (hybrid search) usually beats either alone.",
    rubric: {
      core: [
        "Vector search captures meaning but can miss exact tokens such as codes, names and error messages",
        "Keyword search matches exact terms but misses synonyms",
        "Hybrid search runs both and merges the results",
      ],
      strong: ["Mentions a merging method such as reciprocal rank fusion"],
      redFlags: ["Says embeddings make keyword search obsolete"],
    },
  },
]);

import { defineQuiz } from "@/lib/content/schema";

export default defineQuiz([
  {
    id: "cosine-meaning",
    prompt: "Two embedding vectors have a cosine similarity of about 0. What does that tell you?",
    options: [
      {
        id: "a",
        text: "The two texts are identical.",
        explanation: "Identical directions give a cosine similarity of 1, not 0.",
      },
      {
        id: "b",
        text: "The vectors are roughly perpendicular — the model sees the texts as unrelated.",
        correct: true,
        explanation:
          "Cosine depends only on the angle: 1 same direction, 0 perpendicular, −1 opposite.",
      },
      {
        id: "c",
        text: "One of the vectors has length zero.",
        explanation: "A zero-length vector makes cosine undefined (division by zero), not 0.",
      },
    ],
  },
  {
    id: "dot-vs-cosine",
    prompt:
      "Your vectors are not normalised. Why might the dot product rank a long, general document above a short, closely matching one?",
    options: [
      {
        id: "a",
        text: "The dot product grows with vector length as well as with direction.",
        correct: true,
        explanation:
          "A long vector pointing in a broadly similar direction can out-score a shorter one pointing in nearly the same direction. Cosine removes length.",
      },
      {
        id: "b",
        text: "The dot product only looks at the first dimension.",
        explanation: "It sums the products of all matching components.",
      },
      {
        id: "c",
        text: "The dot product measures distance, so larger means further away.",
        explanation:
          "For the dot product, larger means more similar; it's Euclidean distance where smaller is closer.",
      },
    ],
  },
  {
    id: "model-mismatch",
    prompt:
      "Documents were embedded with model A last year. Today you embed queries with a newer model B. What happens?",
    options: [
      {
        id: "a",
        text: "Results improve, because model B is better.",
        explanation:
          "Model B's vectors live in a different space from model A's, so comparisons between them are meaningless.",
      },
      {
        id: "b",
        text: "Results become unreliable; re-embed the documents with model B.",
        correct: true,
        explanation:
          "Queries and documents must come from the same model. Store the model version with each vector to catch this.",
      },
      {
        id: "c",
        text: "Nothing changes as long as both vectors have the same number of dimensions.",
        explanation:
          "Matching dimensions only makes the arithmetic possible; the meanings of the axes still differ between models.",
      },
    ],
  },
  {
    id: "exact-ids",
    prompt:
      "Users search a support site for an error code like ERR_4021. Which approach is most dependable?",
    options: [
      {
        id: "a",
        text: "Pure vector search over embeddings of the articles.",
        explanation:
          "Embeddings can blur exact tokens such as codes, so a near-miss like ERR_4012 may rank just as high.",
      },
      {
        id: "b",
        text: "Hybrid search: keyword matching for exact terms combined with vector search for meaning.",
        correct: true,
        explanation:
          "Keyword search nails the exact code; vector search still helps with descriptive queries. Merging both is the common production choice.",
      },
      {
        id: "c",
        text: "Increase the number of embedding dimensions.",
        explanation: "More dimensions don't make a model treat rare identifiers as exact matches.",
      },
    ],
  },
]);

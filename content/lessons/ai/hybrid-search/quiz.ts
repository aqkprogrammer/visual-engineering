import { defineQuiz } from "@/lib/content/schema";

export default defineQuiz([
  {
    id: "exact-code",
    prompt:
      "Users search for error codes such as “E1042”. Which search is most likely to find the article for that exact code?",
    options: [
      {
        id: "a",
        text: "Keyword search: the code is a rare term, so BM25 gives it a high weight.",
        correct: true,
        explanation:
          "Inverse document frequency rewards rare terms; an embedding model may not represent an unfamiliar code at all.",
      },
      {
        id: "b",
        text: "Vector search: embeddings capture the meaning of the code.",
        explanation:
          "Embeddings capture meaning they have learned; arbitrary codes often carry none for the model.",
      },
      {
        id: "c",
        text: "Neither can find exact codes.",
        explanation:
          "Keyword search on a field that isn't split or stemmed matches exact codes well.",
      },
    ],
  },
  {
    id: "paraphrase",
    prompt:
      "Why can't keyword search find “Refunds for cancelled orders” for the query “how do I get my money back”?",
    options: [
      {
        id: "a",
        text: "They share no significant word; BM25 only scores words that appear in both.",
        correct: true,
        explanation:
          "Matching meaning rather than words is what vector search, or a synonym list, adds.",
      },
      {
        id: "b",
        text: "BM25 ignores titles.",
        explanation:
          "Titles can be indexed and searched like any other text; the words simply don't match.",
      },
      {
        id: "c",
        text: "The query is too long.",
        explanation: "Query length isn't the issue; the absence of shared words is.",
      },
    ],
  },
  {
    id: "rrf",
    prompt:
      "With reciprocal rank fusion (k = 60), which document scores higher: one ranked 1st by keyword search only, or one ranked 2nd by both searches?",
    options: [
      {
        id: "a",
        text: "The one ranked 2nd by both: 2/62 ≈ 0.032 beats 1/61 ≈ 0.016.",
        correct: true,
        explanation: "Agreement between methods counts for more than a single top position.",
      },
      {
        id: "b",
        text: "The one ranked 1st: first place always wins.",
        explanation:
          "Each list contributes 1/(k + rank); appearing in two lists roughly doubles the score.",
      },
      {
        id: "c",
        text: "They tie.",
        explanation: "1/61 and 2/62 are not equal.",
      },
    ],
  },
  {
    id: "why-ranks",
    prompt: "Why does reciprocal rank fusion use ranks instead of adding the two methods' scores?",
    options: [
      {
        id: "a",
        text: "BM25 scores and cosine similarities are on different scales, so adding them would need normalisation and weighting.",
        correct: true,
        explanation: "Ranks are comparable across methods without any tuning.",
      },
      {
        id: "b",
        text: "Scores are secret inside search engines.",
        explanation: "Search engines report scores; they just aren't comparable between methods.",
      },
      {
        id: "c",
        text: "Ranks are more precise than scores.",
        explanation: "Ranks throw information away; their advantage is comparability.",
      },
    ],
  },
  {
    id: "recall-at-k",
    prompt:
      "A question has two relevant passages. One appears in the top 3 results and the other at position 8. What is recall@3?",
    options: [
      {
        id: "a",
        text: "0.5",
        correct: true,
        explanation: "One of the two relevant passages is in the top three.",
      },
      {
        id: "b",
        text: "1, because a relevant passage was found",
        explanation: "Recall counts every relevant passage, not just the first.",
      },
      {
        id: "c",
        text: "0.33, because one of the three results is relevant",
        explanation: "That is precision@3, the share of the top three that are relevant.",
      },
    ],
  },
]);

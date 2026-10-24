import { defineInterview } from "@/lib/content/schema";

export default defineInterview([
  {
    id: "choose-chunking-strategy",
    question: "How would you choose a chunking strategy for a new RAG system?",
    level: "mid",
    kind: "design",
    answer:
      "Start from the documents and the questions. Split along the documents' own structure — sections, paragraphs, list items — and fall back to sentences or words only when a unit is too long. Keep chunks well within the embedding model's input limit, add the document title or section heading to each chunk, and store source and position metadata. Then build a small evaluation set of real questions with the passages that answer them and compare strategies and sizes by recall@k before tuning anything else.",
    rubric: {
      core: [
        "Splits along document structure, falling back to smaller units when needed",
        "Keeps chunks within the embedding model's input limit",
        "Adds context such as titles or headings and keeps source metadata",
        "Evaluates strategies with labelled questions and a retrieval metric such as recall@k",
      ],
      strong: [
        "Uses different splitters for different document types (prose, tables, code)",
        "Mentions retrieving small chunks and expanding to their parent section",
      ],
      redFlags: ["Picks a fixed chunk size without measuring retrieval"],
    },
  },
  {
    id: "overlap-trade-off",
    question: "When is chunk overlap worth its cost?",
    level: "mid",
    kind: "trade-off",
    answer:
      "Overlap helps when answers often straddle chunk boundaries and the text has no reliable structure to split on, such as transcripts or extracted PDF text. It costs storage and embedding work for the duplicated text and can return near-duplicate chunks. When documents have clear structure, splitting on that structure avoids most boundary problems, so little or no overlap is needed.",
    rubric: {
      core: [
        "Overlap helps answers that span a boundary",
        "It duplicates text: more storage, embedding cost and duplicate results",
        "Structure-aware splitting reduces the need for it",
      ],
      strong: ["Suggests deduplicating or merging overlapping results before building the prompt"],
      redFlags: ["Claims overlap has no cost"],
    },
  },
  {
    id: "context-free-chunks",
    question:
      "Some chunks are never retrieved even though they contain the answer. What might be wrong, and how would you fix it?",
    level: "senior",
    kind: "debugging",
    answer:
      "The chunks may not make sense on their own: they rely on pronouns, a heading or earlier sentences for their subject, so neither their embedding nor their keywords match the question. Confirm it by looking at the chunk text and its scores for the failing questions. Fix it by adding context to each chunk — the document title and section heading, or a short generated summary of where the chunk sits — and re-index. Combining vector search with keyword search on the contextualised text helps further.",
    rubric: {
      core: [
        "Identifies chunks that lack their subject or context on their own",
        "Checks the chunk text and retrieval scores for failing questions",
        "Adds titles, headings or generated context to chunks and re-indexes",
      ],
      strong: ["Mentions measuring the change with recall@k on the failing questions"],
      redFlags: ["Responds only by increasing top k without diagnosing"],
    },
  },
  {
    id: "chunk-size-cost",
    question: "How does chunk size affect the cost and quality of a RAG system?",
    level: "junior",
    kind: "concept",
    answer:
      "Smaller chunks give sharper matches and use fewer prompt tokens per retrieved chunk, but can lose the context needed to answer. Larger chunks keep context but blend topics, match less precisely, and spend more tokens per chunk on text that isn't the answer. Larger contexts also cost more per request and can be used less reliably by the model, which tends to miss information in the middle of long inputs.",
    rubric: {
      core: [
        "Small chunks: precise matches but less context",
        "Large chunks: more context but diluted matches and more tokens",
        "Prompt size drives cost per request",
      ],
      strong: ["Mentions that models use information in the middle of long contexts less reliably"],
      redFlags: ["Says bigger chunks are always better"],
    },
  },
]);

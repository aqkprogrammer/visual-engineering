import { defineQuiz } from "@/lib/content/schema";

export default defineQuiz([
  {
    id: "why-rag",
    prompt: "Why use RAG instead of retraining a model on your company's documents?",
    options: [
      {
        id: "a",
        text: "Updating an index when documents change is far cheaper and faster than retraining, and answers can cite their sources.",
        correct: true,
        explanation:
          "RAG keeps the model fixed and looks information up at question time, so freshness is an indexing problem, not a training one.",
      },
      {
        id: "b",
        text: "RAG makes the model itself smarter.",
        explanation: "The model is unchanged; it simply receives better context.",
      },
      {
        id: "c",
        text: "RAG guarantees answers are always correct.",
        explanation:
          "Answers are only as good as what is retrieved — wrong or outdated passages produce wrong answers.",
      },
    ],
  },
  {
    id: "wrong-but-cited",
    prompt:
      "A RAG assistant confidently cites an outdated policy. Where is the problem most likely to be?",
    options: [
      {
        id: "a",
        text: "The language model is too small.",
        explanation: "The model did its job: it answered from the context it was given.",
      },
      {
        id: "b",
        text: "Retrieval: the outdated document is still indexed and ranked above the current one.",
        correct: true,
        explanation:
          "Remove or mark superseded documents and filter or rerank them out. Retrieval quality caps answer quality.",
      },
      {
        id: "c",
        text: "The prompt asked for citations.",
        explanation: "Citations are what let you notice the problem — keep them.",
      },
    ],
  },
  {
    id: "permissions",
    prompt: "What is the right way to keep users from seeing documents they lack access to?",
    options: [
      {
        id: "a",
        text: "Tell the model in the system prompt not to reveal restricted documents.",
        explanation:
          "Instructions are not a security boundary; the model can be tricked or simply make mistakes.",
      },
      {
        id: "b",
        text: "Filter retrieval by the user's permissions so restricted chunks never reach the prompt.",
        correct: true,
        explanation:
          "Enforce access control before the model sees anything; it cannot leak what it was never given.",
      },
      {
        id: "c",
        text: "Use a larger top-k so the model has more choices.",
        explanation: "More context makes leaks more likely, not less.",
      },
    ],
  },
  {
    id: "more-context",
    prompt: "Why isn't it always better to put more retrieved chunks into the context?",
    options: [
      {
        id: "a",
        text: "Extra chunks add cost, latency and noise, and models use information in the middle of long contexts less reliably.",
        correct: true,
        explanation:
          "Liu et al. (2023) observed this position effect. Choose top-k by measuring, not by maximising.",
      },
      {
        id: "b",
        text: "Models can only read one chunk at a time.",
        explanation: "Models read the whole context; the issue is how well they use it.",
      },
      {
        id: "c",
        text: "More chunks change the embedding model.",
        explanation: "The embedding model is fixed; context size doesn't affect it.",
      },
    ],
  },
]);

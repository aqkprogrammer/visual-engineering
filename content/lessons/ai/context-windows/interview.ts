import { defineInterview } from "@/lib/content/schema";

export default defineInterview([
  {
    id: "long-conversation-memory",
    question:
      "How would you keep a long-running chat assistant within its context window without losing important information?",
    level: "mid",
    kind: "design",
    answer:
      "Count the tokens in every part of each request and give each part a budget. Keep the system prompt and tools fixed, keep the most recent turns verbatim, and replace older turns with a summary. Extract facts that must never be lost — identifiers, the user's goal, decisions — into a pinned, structured section that is always included. Reserve space for the answer, and log token counts so you can see when conversations approach the limit.",
    rubric: {
      core: [
        "Counts tokens per part and sets budgets",
        "Keeps recent turns verbatim and summarises older ones",
        "Pins critical facts so they survive trimming",
        "Reserves space for the output",
      ],
      strong: [
        "Mentions that summaries lose exact wording and cost an extra call",
        "Mentions ordering stable content first for prompt caching",
      ],
      redFlags: ["Relies on the model to remember earlier requests"],
    },
  },
  {
    id: "bigger-window-tradeoff",
    question:
      "A teammate proposes switching to a model with a much larger context window so you can stop trimming conversations. What would you weigh?",
    level: "mid",
    kind: "trade-off",
    answer:
      "A larger window postpones failures but makes every request that uses it more expensive and slower, because input is billed and processed per token on every turn. Models also use long contexts unevenly — information in the middle is used less reliably — so answer quality can drop. Trimming, summarising and retrieving only relevant context often gives better answers at lower cost; a larger window is worth it when the task genuinely needs a lot of text at once.",
    rubric: {
      core: [
        "Cost and latency grow with tokens sent on every request",
        "Long contexts are used less reliably, especially in the middle",
        "Curation can beat raw size",
      ],
      strong: ["Suggests measuring quality and cost on real conversations before deciding"],
      redFlags: ["Says a bigger window has no downsides"],
    },
  },
  {
    id: "rising-llm-costs",
    question: "Your LLM bill doubled while traffic stayed flat. How would you investigate?",
    level: "senior",
    kind: "debugging",
    answer:
      "Break token usage down by request part and by feature: system prompt, tool definitions, retrieved documents, conversation history and output. Look for growth in any of them — longer conversations, more tools added to every request, more or larger retrieved documents, longer answers — and check the cache hit rate if prompt caching is used, since a change early in the prompt can invalidate it. Then fix the cause: trim or summarise history, load tools only when needed, retrieve fewer and better chunks, and restore a stable prompt prefix.",
    rubric: {
      core: [
        "Breaks token usage down by request part and feature",
        "Considers history length, tools, retrieved context and output",
        "Checks prompt-cache hit rates",
      ],
      strong: ["Tracks cost per conversation, not only per request"],
      redFlags: ["Only suggests switching to a cheaper model"],
    },
  },
  {
    id: "context-window-basics",
    question: "What is a context window, and what happens when a request doesn't fit?",
    level: "junior",
    kind: "concept",
    answer:
      "It is the maximum number of tokens a model can consider in one request, covering the input and the output it generates. If the input is too long, APIs typically reject the request with an error; if there isn't enough room left for the output, depending on the API, the request is rejected or the answer is cut off when the window fills. Applications avoid this by counting tokens and trimming, summarising or retrieving less before sending.",
    rubric: {
      core: [
        "Maximum tokens per request, including the output",
        "Too-long input is rejected",
        "Insufficient output room causes rejection or truncated answers, depending on the API",
      ],
      strong: ["Mentions counting tokens with the provider's tokenizer before sending"],
      redFlags: ["Thinks only the user's message counts"],
    },
  },
]);

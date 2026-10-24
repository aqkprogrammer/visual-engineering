import { defineLesson } from "@/lib/content/schema";

export default defineLesson({
  slug: "context-windows",
  domain: "ai",
  module: "building-with-llms",
  order: 10,
  title: "Context windows and token budgets",
  description:
    "What fills a language model's context window, what to cut when a conversation outgrows it, and why every turn of a chat costs more than the last.",
  difficulty: "beginner",
  prerequisites: ["ai/tokenization"],
  related: ["ai/how-rag-works", "ai/chunking"],
  tags: ["context-window", "tokens", "llm-cost", "prompt-caching", "conversation-memory"],
  references: [
    {
      title: "Context windows",
      url: "https://platform.claude.com/docs/en/build-with-claude/context-windows",
      publisher: "Anthropic",
      kind: "official-docs",
    },
    {
      title: "Prompt caching",
      url: "https://platform.claude.com/docs/en/build-with-claude/prompt-caching",
      publisher: "Anthropic",
      kind: "official-docs",
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

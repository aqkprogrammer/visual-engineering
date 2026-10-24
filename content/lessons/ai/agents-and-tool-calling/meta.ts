import { defineLesson } from "@/lib/content/schema";

export default defineLesson({
  slug: "agents-and-tool-calling",
  domain: "ai",
  module: "agents",
  order: 10,
  title: "AI agents, tool calling and MCP",
  description:
    "How a language model calls your code in a loop, how the Model Context Protocol standardises tools, and how to keep agents safe with limits, validation and approval.",
  difficulty: "intermediate",
  prerequisites: ["ai/context-windows"],
  related: ["ai/how-rag-works"],
  tags: ["agents", "tool-calling", "function-calling", "mcp", "prompt-injection"],
  references: [
    {
      title: "Model Context Protocol specification: Tools",
      url: "https://modelcontextprotocol.io/specification/latest/server/tools",
      publisher: "Model Context Protocol",
      kind: "specification",
    },
    {
      title: "Tool use with Claude",
      url: "https://platform.claude.com/docs/en/agents-and-tools/tool-use/overview",
      publisher: "Anthropic",
      kind: "official-docs",
    },
    {
      title: "Building effective agents",
      url: "https://www.anthropic.com/engineering/building-effective-agents",
      publisher: "Anthropic",
      kind: "article",
    },
    {
      title: "OWASP Top 10 for LLM Applications 2025",
      url: "https://genai.owasp.org/llm-top-10/",
      publisher: "OWASP",
      kind: "official-docs",
    },
  ],
  lastReviewed: "2026-10-24",
  status: "published",
});

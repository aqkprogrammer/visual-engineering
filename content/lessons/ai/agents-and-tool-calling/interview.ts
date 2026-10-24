import { defineInterview } from "@/lib/content/schema";

export default defineInterview([
  {
    id: "agent-loop-design",
    question: "Design the control loop for an agent that can read orders and issue refunds.",
    level: "senior",
    kind: "design",
    answer:
      "Loop: send the conversation and tool definitions to the model; if it requests a tool, validate the call, run it with a timeout and return the result — including errors — then call the model again, until it answers or a limit is reached. Give it only the tools it needs, with credentials scoped to the customer. Make issue_refund require human approval and validate on the server that the amount matches the order and goes to the original payment method; make it idempotent. Cap steps, time and spend, hand over to a person at a limit, and trace every call for audit.",
    rubric: {
      core: [
        "Describes the loop: model, tool call, result back, repeat until an answer or a limit",
        "Validates and gates the side-effecting tool (approval and server-side checks)",
        "Sets step, time or cost limits with a hand-over",
        "Returns tool errors to the model",
      ],
      strong: [
        "Least-privilege tools and scoped credentials",
        "Idempotent refunds and full tracing",
      ],
      redFlags: ["Lets the model execute refunds with no checks outside the model"],
    },
  },
  {
    id: "prompt-injection-agents",
    question: "What is prompt injection in an agent, and how do you defend against it?",
    level: "mid",
    kind: "concept",
    answer:
      "Prompt injection is text in the model's input — often content fetched by a tool, such as a web page, email or document — that tries to override its instructions. In an agent it can trigger real actions. Defences: treat tool output as untrusted data and label it; give the agent the least privilege it needs; validate actions on the server; and require human approval for consequential ones. Prompt-level instructions help but are not a reliable barrier on their own.",
    rubric: {
      core: [
        "Defines it as untrusted input that tries to override instructions",
        "Notes that tool results are a common source",
        "Relies on checks outside the model: least privilege, validation, approval",
      ],
      strong: ["Mentions OWASP listing prompt injection first in its LLM Top 10"],
      redFlags: ["Claims a system prompt alone prevents it"],
    },
  },
  {
    id: "what-is-mcp",
    question:
      "What problem does the Model Context Protocol solve, and how does it work at a high level?",
    level: "junior",
    kind: "concept",
    answer:
      "Without a standard, every AI application integrates every tool in its own way. MCP defines a common protocol, built on JSON-RPC 2.0: a server exposes tools, each with a name, description and JSON Schema for its inputs; a client in the application lists them with tools/list and invokes them with tools/call. Any MCP client can then use any MCP server's tools. It standardises the connection, not the safety of what the tools do.",
    rubric: {
      core: [
        "Standardises how applications connect to tools",
        "Servers expose tools with names, descriptions and input schemas",
        "Clients discover with tools/list and invoke with tools/call",
      ],
      strong: ["Notes that MCP doesn't make tools safe by itself"],
      redFlags: ["Describes MCP as a model or a hosting service"],
    },
  },
  {
    id: "agent-or-workflow",
    question: "When would you build a fixed workflow instead of an agent?",
    level: "mid",
    kind: "trade-off",
    answer:
      "When the steps are known in advance — extract, classify, look up, respond — a workflow that calls the model at fixed points is cheaper, faster, easier to test and more predictable. An agent earns its cost when the next step depends on what earlier steps found and can't be scripted. Start with the simplest design that meets the need and add autonomy only where it clearly helps.",
    rubric: {
      core: [
        "Workflows suit tasks with known steps",
        "Agents suit open-ended tasks where steps depend on results",
        "Workflows are cheaper, more predictable and easier to test",
      ],
      strong: ["Recommends starting simple and adding autonomy only where needed"],
      redFlags: ["Uses an agent for every LLM feature"],
    },
  },
]);

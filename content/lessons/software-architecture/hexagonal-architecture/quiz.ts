import { defineQuiz } from "@/lib/content/schema";

export default defineQuiz([
  {
    id: "port-definition",
    prompt: "In hexagonal architecture, what is a port?",
    options: [
      {
        id: "a",
        text: "An interface the application defines, in business terms, for a conversation with the outside world.",
        correct: true,
        explanation:
          "For example OrderRepository or Notifier. Adapters implement or call it with a specific technology.",
      },
      {
        id: "b",
        text: "A network port number the application listens on.",
        explanation: "The name is a metaphor; ports are interfaces in the code, not TCP ports.",
      },
      {
        id: "c",
        text: "A class that talks to a specific database.",
        explanation: "That is an adapter. The port is the interface it implements.",
      },
    ],
  },
  {
    id: "dependency-direction",
    prompt: "Which way do source code dependencies point in hexagonal architecture?",
    options: [
      {
        id: "a",
        text: "Inwards: adapters depend on the core's ports; the core depends on nothing outside it.",
        correct: true,
        explanation:
          "This is the dependency rule that keeps technology changes out of business code.",
      },
      {
        id: "b",
        text: "Outwards: the core imports the database and web framework it uses.",
        explanation: "That is the coupling hexagonal architecture removes.",
      },
      {
        id: "c",
        text: "Both ways, through a shared library.",
        explanation: "Two-way dependencies are exactly what the pattern avoids.",
      },
    ],
  },
  {
    id: "switch-database",
    prompt:
      "In a well-built hexagonal application, what changes when you move from PostgreSQL to DynamoDB?",
    options: [
      {
        id: "a",
        text: "A new adapter implementing the repository port, and the wiring that chooses it.",
        correct: true,
        explanation:
          "The use cases, rules and their tests depend only on the port and stay unchanged.",
      },
      {
        id: "b",
        text: "Every use case that saves orders.",
        explanation: "Use cases depend on the port, not on PostgreSQL, so they don't change.",
      },
      {
        id: "c",
        text: "Nothing at all.",
        explanation: "Someone still has to write the new adapter and plug it in.",
      },
    ],
  },
  {
    id: "testing-benefit",
    prompt: "Why are business-logic tests fast in a hexagonal application?",
    options: [
      {
        id: "a",
        text: "Tests plug in-memory adapters into the ports, so no database or network is needed.",
        correct: true,
        explanation:
          "The core receives its adapters from outside, so tests can choose simple ones.",
      },
      {
        id: "b",
        text: "Hexagonal applications have no tests that touch the database.",
        explanation:
          "Real adapters still need integration tests; the core's tests just don't need them.",
      },
      {
        id: "c",
        text: "Because the core is written in a faster language.",
        explanation: "Speed comes from avoiding infrastructure, not from the language.",
      },
    ],
  },
  {
    id: "when-overkill",
    prompt: "When is hexagonal architecture likely to be overkill?",
    options: [
      {
        id: "a",
        text: "A simple CRUD app with little business logic, or a short-lived prototype.",
        correct: true,
        explanation:
          "The interfaces and mapping cost more than they save when there's little logic to protect.",
      },
      {
        id: "b",
        text: "An application with complex pricing rules and several entry points.",
        explanation: "That is where the pattern pays off most.",
      },
      {
        id: "c",
        text: "Any application with a database.",
        explanation:
          "Having a database is normal; the question is how much business logic needs protecting.",
      },
    ],
  },
]);

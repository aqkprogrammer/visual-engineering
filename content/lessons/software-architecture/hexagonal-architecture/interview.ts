import { defineInterview } from "@/lib/content/schema";

export default defineInterview([
  {
    id: "ports-and-adapters-explained",
    question: "Explain hexagonal architecture and the difference between a port and an adapter.",
    level: "junior",
    kind: "concept",
    answer:
      "The business logic sits in the core and talks to the outside only through ports: interfaces the core defines in business terms, such as a repository for orders or a notifier. Adapters connect a port to a technology: a PostgreSQL repository, an email notifier, an HTTP controller that calls a use case. The core depends on nothing outside it, so technology can change without touching business rules.",
    rubric: {
      core: [
        "Business logic in a core that doesn't depend on technology",
        "A port is an interface the core defines",
        "An adapter connects a specific technology to a port",
      ],
      strong: ["Distinguishes driving adapters (callers) from driven adapters (dependencies)"],
      redFlags: ["Describes it as a network topology or as needing six ports"],
    },
  },
  {
    id: "layered-vs-hexagonal",
    question: "How does hexagonal architecture differ from a traditional layered architecture?",
    level: "mid",
    kind: "trade-off",
    answer:
      "In a typical layered design the business layer calls the data access layer directly, so business code depends on persistence code and often on ORM types. Hexagonal architecture inverts that dependency: the core defines the interfaces it needs and the infrastructure implements them, so dependencies point inwards. The practical results are smaller changes when technology changes, and business-logic tests that don't need a database.",
    rubric: {
      core: [
        "In layered designs the business layer depends on the data layer",
        "Hexagonal inverts the dependency: the core defines interfaces, infrastructure implements them",
        "Benefits: isolated technology changes and infrastructure-free tests",
      ],
      strong: ["Names dependency inversion or the dependency rule"],
      redFlags: ["Says they are the same thing with different names"],
    },
  },
  {
    id: "testing-with-ports",
    question:
      "How would you test a use case that saves orders and emails the customer, in a hexagonal design?",
    level: "mid",
    kind: "design",
    answer:
      "Construct the use case with an in-memory order repository and a fake notifier that records what it was asked to send. Run the use case and assert on the stored order and the recorded notification. No database or mail server is needed, so the tests are fast and deterministic. Separately, test each real adapter against its real technology in a smaller set of integration tests.",
    rubric: {
      core: [
        "Injects an in-memory repository and a fake notifier through the ports",
        "Asserts on the stored order and the recorded notification",
        "Tests real adapters separately with integration tests",
      ],
      strong: ["Explains why this makes tests fast and deterministic"],
      redFlags: ["Starts a real database and mail server for every business-rule test"],
    },
  },
  {
    id: "hexagonal-overuse",
    question: "What are the risks of applying hexagonal architecture everywhere?",
    level: "senior",
    kind: "trade-off",
    answer:
      "Indirection and mapping without benefit: interfaces with a single implementation, translation code between near-identical models, and more files to navigate for simple CRUD features. It slows prototypes and small apps. Use ports where the outside world varies or must be replaced in tests — storage, messaging, external services, time — and keep simple parts simple.",
    rubric: {
      core: [
        "Adds interfaces and mapping that may not pay for themselves",
        "Is overkill for simple CRUD or short-lived code",
        "Applies ports selectively where variation or testing needs them",
      ],
      strong: ["Gives examples of good port candidates such as storage, messaging or clocks"],
      redFlags: ["Says there are no downsides"],
    },
  },
]);

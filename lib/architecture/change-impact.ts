/**
 * Change impact in a layered design versus hexagonal architecture (ports and adapters), for one
 * small ordering application. For each change, which modules are edited or added, whether the
 * business core is touched, and whether its tests need real infrastructure.
 *
 * The layered design is the common way such codebases grow: the business layer calls the data
 * access layer and the email client directly, and uses the ORM's entity classes as its model.
 * A well-disciplined layered design can avoid some of this — the comparison is about where
 * dependencies point, which is what hexagonal architecture makes explicit.
 */

export type Style = "layered" | "hexagonal";

export type ModuleKind = "driving-adapter" | "core" | "port" | "driven-adapter" | "layer" | "test";

export type Module = {
  id: string;
  name: string;
  kind: ModuleKind;
  /** Part of the business logic, whose change risk matters most. */
  core: boolean;
};

export const MODULES: Record<Style, Module[]> = {
  layered: [
    { id: "http-controllers", name: "HTTP controllers", kind: "layer", core: false },
    { id: "cli", name: "Command-line tool", kind: "layer", core: false },
    { id: "order-service", name: "Order service", kind: "layer", core: true },
    { id: "pricing-rules", name: "Pricing rules", kind: "layer", core: true },
    { id: "orm-entities", name: "ORM entities (shared model)", kind: "layer", core: true },
    { id: "order-dao", name: "Order data access (PostgreSQL)", kind: "layer", core: false },
    { id: "email-client", name: "Email client", kind: "layer", core: false },
    { id: "tests", name: "Business-logic tests", kind: "test", core: false },
  ],
  hexagonal: [
    { id: "http-adapter", name: "HTTP adapter", kind: "driving-adapter", core: false },
    { id: "cli-adapter", name: "Command-line adapter", kind: "driving-adapter", core: false },
    { id: "place-order", name: "Place-order use case", kind: "core", core: true },
    { id: "pricing-rules", name: "Pricing rules", kind: "core", core: true },
    { id: "order-repository-port", name: "OrderRepository port", kind: "port", core: true },
    { id: "notifier-port", name: "Notifier port", kind: "port", core: true },
    { id: "postgres-adapter", name: "PostgreSQL adapter", kind: "driven-adapter", core: false },
    { id: "dynamodb-adapter", name: "DynamoDB adapter", kind: "driven-adapter", core: false },
    {
      id: "in-memory-adapter",
      name: "In-memory adapter (tests)",
      kind: "driven-adapter",
      core: false,
    },
    { id: "email-adapter", name: "Email adapter", kind: "driven-adapter", core: false },
    { id: "tests", name: "Business-logic tests", kind: "test", core: false },
  ],
};

/** Modules that don't exist until a change adds them. */
export const OPTIONAL: Record<Style, string[]> = {
  layered: ["cli"],
  hexagonal: ["cli-adapter", "dynamodb-adapter", "notifier-port", "email-adapter"],
};

export type ChangeId =
  "switch-database" | "add-cli" | "change-rule" | "add-notification" | "test-logic";

export type Impact = {
  edited: string[];
  added: string[];
  /** Tests of the business logic need a database, mail server or similar to run. */
  testsNeedInfrastructure: boolean;
  explanation: string;
};

export type Change = { id: ChangeId; title: string; impact: Record<Style, Impact> };

export const CHANGES: Change[] = [
  {
    id: "switch-database",
    title: "Move orders from PostgreSQL to DynamoDB",
    impact: {
      layered: {
        edited: ["order-dao", "orm-entities", "order-service", "tests"],
        added: [],
        testsNeedInfrastructure: true,
        explanation:
          "The business layer uses the ORM's entities and relies on SQL behaviour such as transactions and joins, so a different database reaches into the order service and its tests.",
      },
      hexagonal: {
        edited: [],
        added: ["dynamodb-adapter"],
        testsNeedInfrastructure: false,
        explanation:
          "The core only knows the OrderRepository port. A new adapter implements it for DynamoDB; the use case, the rules and their tests don't change. Only the wiring that picks the adapter does.",
      },
    },
  },
  {
    id: "add-cli",
    title: "Add a command-line tool for support staff",
    impact: {
      layered: {
        edited: ["http-controllers", "order-service"],
        added: ["cli"],
        testsNeedInfrastructure: true,
        explanation:
          "Validation and some ordering logic tend to grow in the HTTP controllers. A second entry point has to duplicate it or move it into the service first.",
      },
      hexagonal: {
        edited: [],
        added: ["cli-adapter"],
        testsNeedInfrastructure: false,
        explanation:
          "The use case is already an entry point that doesn't know about HTTP. The new adapter turns command-line arguments into calls to it — exactly as the HTTP adapter does.",
      },
    },
  },
  {
    id: "change-rule",
    title: "Change a discount rule",
    impact: {
      layered: {
        edited: ["pricing-rules", "tests"],
        added: [],
        testsNeedInfrastructure: true,
        explanation:
          "The rule itself is one module in both designs. But the tests exercise the business layer, which talks to the database directly, so they need one to run.",
      },
      hexagonal: {
        edited: ["pricing-rules", "tests"],
        added: [],
        testsNeedInfrastructure: false,
        explanation:
          "The same small edit. The tests run the core with the in-memory adapter, so they need no database and run in milliseconds.",
      },
    },
  },
  {
    id: "add-notification",
    title: "Email the customer when an order ships",
    impact: {
      layered: {
        edited: ["order-service", "tests"],
        added: [],
        testsNeedInfrastructure: true,
        explanation:
          "The order service calls the email client directly, so its tests must stub the network or a mail server, and the business logic now depends on an email library.",
      },
      hexagonal: {
        edited: ["place-order", "tests"],
        added: ["notifier-port", "email-adapter"],
        testsNeedInfrastructure: false,
        explanation:
          "The use case calls a Notifier port that the core defines. An email adapter implements it in production; tests pass a fake notifier and check what it was asked to send.",
      },
    },
  },
  {
    id: "test-logic",
    title: "Unit-test the ordering rules",
    impact: {
      layered: {
        edited: ["tests"],
        added: [],
        testsNeedInfrastructure: true,
        explanation:
          "The business layer creates its own data access objects, so a test of the rules either starts a database or replaces those objects with mocks of the persistence library.",
      },
      hexagonal: {
        edited: ["tests"],
        added: [],
        testsNeedInfrastructure: false,
        explanation:
          "The core receives its repository through the port, so a test hands it the in-memory adapter. Cockburn's original motivation: the application can be driven by tests as easily as by users.",
      },
    },
  },
];

export function getChange(id: string): Change {
  return CHANGES.find((c) => c.id === id) ?? CHANGES[0]!;
}

/** Counts for one change in one style, for the summary. */
export function summarise(style: Style, impact: Impact) {
  const byId = new Map(MODULES[style].map((m) => [m.id, m]));
  const touched = [...impact.edited, ...impact.added]
    .map((id) => byId.get(id))
    .filter(Boolean) as Module[];
  return {
    edited: impact.edited.length,
    added: impact.added.length,
    coreTouched: touched.some((m) => m.core && impact.edited.includes(m.id)),
    testsNeedInfrastructure: impact.testsNeedInfrastructure,
  };
}

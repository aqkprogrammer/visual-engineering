import { defineInterview } from "@/lib/content/schema";

export default defineInterview([
  {
    id: "microservices-trade-offs",
    question: "What are the main benefits and costs of microservices compared with a monolith?",
    level: "mid",
    kind: "trade-off",
    answer:
      "Benefits: teams can deploy, scale and choose technology for their services independently, and failures can be contained to one service. Costs: in-process calls become network calls that are slower and can fail, data is split across services so transactions and joins become hard, and you need automation, monitoring and tracing to operate many services. Failures and slow responses compound with the number of calls a request makes.",
    rubric: {
      core: [
        "Independent deployment and scaling, organised around teams and business capabilities",
        "Network calls add latency and failure modes that compound per hop",
        "Data ownership makes cross-service transactions and queries harder",
      ],
      strong: ["Mentions the operational cost: tracing, monitoring, deployment automation"],
      redFlags: ["Claims microservices are simply faster or more reliable"],
    },
  },
  {
    id: "when-to-split",
    question: "Your team runs a monolith. How do you decide whether and where to split it?",
    level: "senior",
    kind: "design",
    answer:
      "Split only for a concrete need: teams blocked by shared deployments, a part with very different scaling or reliability needs, or a part that must change at a different pace. Find boundaries along business capabilities with little shared data and few synchronous calls between them, ideally proven as modules inside the monolith first. Extract one service at a time behind a stable API, often with the strangler pattern, and avoid splits that would need distributed transactions.",
    rubric: {
      core: [
        "Splits only for concrete organisational or scaling reasons",
        "Chooses boundaries along business capabilities with low coupling",
        "Extracts incrementally rather than rewriting everything",
      ],
      strong: [
        "Proves boundaries as modules first (a modular monolith)",
        "Mentions the strangler pattern",
      ],
      redFlags: ["Splits by technical layer, such as a 'database service'"],
    },
  },
  {
    id: "cascading-failure",
    question:
      "One service in a call chain becomes slow, and soon the whole system is down. What happened and how do you prevent it?",
    level: "senior",
    kind: "debugging",
    answer:
      "Callers waited on the slow service without timeouts, so their threads and connections filled up; then their own callers waited on them, and the slowness spread up the chain. Retries may have multiplied the load. Prevent it with timeouts on every remote call, retries only with backoff and at one layer, circuit breakers that fail fast when a dependency is unhealthy, bulkheads that limit resources per dependency, and fallbacks for optional features.",
    rubric: {
      core: [
        "Explains resource exhaustion as callers wait without timeouts",
        "Adds timeouts on every remote call",
        "Uses circuit breakers or fallbacks so callers fail fast or degrade",
      ],
      strong: ["Notes that uncoordinated retries amplify the load on the failing service"],
      redFlags: ["Suggests adding more retries as the main fix"],
    },
  },
  {
    id: "tail-latency-fan-out",
    question: "Why does tail latency matter more as a request fans out to more services?",
    level: "mid",
    kind: "concept",
    answer:
      "A request that waits for several calls is as slow as the slowest of them. If each call is slow with a small probability, the chance that at least one is slow grows with the number of calls: one percent per call becomes about ten percent across ten calls, and Dean and Barroso show 63% for a hundred. So the overall latency is dominated by each dependency's tail, not its average.",
    rubric: {
      core: [
        "The request waits for the slowest of its calls",
        "The chance of hitting at least one slow call grows with the number of calls",
        "Percentiles like p99 matter more than averages",
      ],
      strong: ["Mentions mitigations such as hedged requests, timeouts or reducing fan-out"],
      redFlags: ["Says parallel calls make tail latency irrelevant"],
    },
  },
]);

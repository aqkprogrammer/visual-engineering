import { defineQuiz } from "@/lib/content/schema";

export default defineQuiz([
  {
    id: "compound-availability",
    prompt:
      "A request calls 10 services in turn, each succeeding 99.9% of the time independently. Roughly how often does the whole request succeed?",
    options: [
      {
        id: "a",
        text: "About 99.0% of the time.",
        correct: true,
        explanation: "0.999¹⁰ ≈ 0.990: every call is another independent chance to fail.",
      },
      {
        id: "b",
        text: "99.9% of the time — the same as one service.",
        explanation:
          "That would be true only if all ten failed together. Independent failures compound.",
      },
      {
        id: "c",
        text: "About 90% of the time.",
        explanation: "That would need each call to fail 1% of the time, not 0.1%.",
      },
    ],
  },
  {
    id: "fan-out-tail",
    prompt: "Why can calling many services in parallel still make a request slow?",
    options: [
      {
        id: "a",
        text: "The request waits for the slowest answer, so any one rare slow response delays it.",
        correct: true,
        explanation:
          "With one slow answer in a hundred per server, a request fanning out to a hundred servers is slow about 63% of the time.",
      },
      {
        id: "b",
        text: "Parallel calls always take the sum of their latencies.",
        explanation:
          "Parallel calls take as long as the slowest one, not the sum — but that slowest one is often slow.",
      },
      {
        id: "c",
        text: "It can't; parallelism removes latency problems.",
        explanation: "It removes waiting in sequence, not the effect of rare slow responses.",
      },
    ],
  },
  {
    id: "monolith-first",
    prompt: "Why does Martin Fowler suggest starting most new systems as a monolith?",
    options: [
      {
        id: "a",
        text: "Service boundaries are hard to get right early, and moving functionality between services is much harder than between modules.",
        correct: true,
        explanation:
          "A monolith lets you learn where the boundaries are before paying the microservice premium.",
      },
      {
        id: "b",
        text: "Monoliths can't be scaled, so you have to start with them.",
        explanation:
          "Monoliths can be scaled by running more copies; the argument is about boundaries and speed of learning.",
      },
      {
        id: "c",
        text: "Microservices can't run in the cloud.",
        explanation: "They run in the cloud routinely.",
      },
    ],
  },
  {
    id: "timeouts-tradeoff",
    prompt: "A dependency becomes slow. What do timeouts on calls to it achieve?",
    options: [
      {
        id: "a",
        text: "They cap how long callers wait, turning slow responses into fast errors that a fallback can handle.",
        correct: true,
        explanation:
          "Timeouts protect latency and stop requests piling up; success still depends on a fallback or retry.",
      },
      {
        id: "b",
        text: "They make the dependency faster.",
        explanation: "The dependency is unchanged; callers just stop waiting for it.",
      },
      {
        id: "c",
        text: "They guarantee every request succeeds.",
        explanation: "Timed-out calls fail. Without a fallback, the request fails too.",
      },
    ],
  },
  {
    id: "distributed-monolith",
    prompt: "Which sign suggests a system is a distributed monolith?",
    options: [
      {
        id: "a",
        text: "Services share one database and must be deployed together.",
        correct: true,
        explanation:
          "That keeps the coupling of a monolith while adding the network costs of microservices.",
      },
      {
        id: "b",
        text: "Each service has its own database.",
        explanation: "That is the usual microservice approach to data ownership.",
      },
      {
        id: "c",
        text: "Services communicate through an API.",
        explanation:
          "Communicating through APIs is expected; the problem is when changes can't be deployed independently.",
      },
    ],
  },
]);

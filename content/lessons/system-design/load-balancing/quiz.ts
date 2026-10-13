import { defineQuiz } from "@/lib/content/schema";

export default defineQuiz([
  {
    id: "detection-delay",
    prompt:
      "Health checks run every 10 seconds and a server is removed after 3 consecutive failures. A server crashes just after passing a check. Roughly how long can it keep receiving traffic?",
    options: [
      {
        id: "a",
        text: "Not at all — the load balancer notices immediately.",
        explanation:
          "Active health checks only run on a timer, so a crash between checks goes unnoticed until the next probes fail.",
      },
      {
        id: "b",
        text: "About 10 seconds.",
        explanation:
          "One failed check isn't enough here; the threshold requires three consecutive failures.",
      },
      {
        id: "c",
        text: "About 30 seconds.",
        correct: true,
        explanation:
          "Detection delay is roughly interval × threshold. Requests routed to it in the meantime fail — which is why passive checks and retries also matter.",
      },
      {
        id: "d",
        text: "Until someone restarts it.",
        explanation:
          "That would be true with health checks turned off, but here checks remove it after the threshold is reached.",
      },
    ],
  },
  {
    id: "uneven-costs",
    prompt:
      "Most requests to your API take 10 ms but some take 5 seconds. Which algorithm keeps the load most even?",
    options: [
      {
        id: "a",
        text: "Round robin",
        explanation:
          "Round robin balances the number of requests, not their cost, so a server that draws several slow requests falls behind.",
      },
      {
        id: "b",
        text: "Least connections (or least outstanding requests)",
        correct: true,
        explanation:
          "Servers busy with slow requests have more requests in flight, so new work is steered elsewhere.",
      },
      {
        id: "c",
        text: "IP hash",
        explanation:
          "Hashing gives affinity, not balance; a client making many slow requests always lands on the same server.",
      },
    ],
  },
  {
    id: "grpc-l4",
    prompt:
      "A gRPC service sits behind a layer 4 load balancer. One backend is overloaded while others are idle. What is the likely cause?",
    options: [
      {
        id: "a",
        text: "Layer 4 balancers pick a backend per connection, and gRPC multiplexes many requests over one long-lived connection.",
        correct: true,
        explanation:
          "All requests on a connection go to the backend chosen when it opened. Use request-level (layer 7) or client-side balancing instead.",
      },
      {
        id: "b",
        text: "gRPC requests can't be load balanced at all.",
        explanation:
          "They can — at layer 7 or on the client — just not effectively per connection when connections are long-lived.",
      },
      {
        id: "c",
        text: "The health checks are too frequent.",
        explanation:
          "Check frequency affects failure detection, not how evenly healthy servers receive traffic.",
      },
    ],
  },
  {
    id: "keepalive-502",
    prompt:
      "You see occasional 502 errors at low traffic. The load balancer's idle timeout is 60 s and your app closes idle keep-alive connections after 5 s. What should you change?",
    options: [
      {
        id: "a",
        text: "Lower the load balancer's idle timeout below 5 s.",
        explanation:
          "That works against you: it causes far more connection churn, and AWS recommends the opposite relationship.",
      },
      {
        id: "b",
        text: "Make the application's keep-alive timeout longer than the load balancer's idle timeout.",
        correct: true,
        explanation:
          "Then the balancer, not the app, closes idle connections, so it never sends a request on a connection the app has just closed.",
      },
      {
        id: "c",
        text: "Add more servers.",
        explanation: "The errors come from a timeout race, not from a lack of capacity.",
      },
    ],
  },
]);

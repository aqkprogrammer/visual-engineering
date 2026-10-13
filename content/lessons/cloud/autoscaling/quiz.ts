import { defineQuiz } from "@/lib/content/schema";

export default defineQuiz([
  {
    id: "target-tracking-formula",
    prompt:
      "Ten instances run at 90% CPU and the target is 60%. Using desired = ceil(current × metric ÷ target), how many instances does target tracking ask for?",
    options: [
      { id: "a", text: "15", correct: true, explanation: "ceil(10 × 0.9 ÷ 0.6) = ceil(15) = 15." },
      {
        id: "b",
        text: "11",
        explanation:
          "Adding one at a time is not proportional; target tracking jumps straight to the estimate.",
      },
      {
        id: "c",
        text: "9",
        explanation: "Utilisation is above the target, so the count goes up, not down.",
      },
      {
        id: "d",
        text: "20",
        explanation: "That would bring utilisation to 45%, well below the 60% target.",
      },
    ],
  },
  {
    id: "why-lag",
    prompt:
      "Why do requests often fail at the start of a fast traffic climb, even with autoscaling?",
    options: [
      {
        id: "a",
        text: "New instances take time to start, so capacity arrives after demand has already grown.",
        correct: true,
        explanation:
          "The autoscaler reacts to a metric, then waits for instances to boot and warm up. Headroom covers that gap.",
      },
      {
        id: "b",
        text: "Autoscaling only runs once an hour.",
        explanation:
          "Evaluations are frequent — every 15 seconds by default for Kubernetes' HPA. Start-up time is the bottleneck.",
      },
      {
        id: "c",
        text: "Autoscalers remove instances when traffic rises.",
        explanation: "They add instances when the metric is above the target.",
      },
    ],
  },
  {
    id: "stabilisation-window",
    prompt: "What does Kubernetes' default 300-second scale-down stabilisation window do?",
    options: [
      {
        id: "a",
        text: "Scales down only to the highest recommendation of the last five minutes, so brief dips don't remove capacity.",
        correct: true,
        explanation:
          "It prevents flapping: removing instances during a lull and needing them again minutes later.",
      },
      {
        id: "b",
        text: "Delays every scale-up by five minutes.",
        explanation: "Scale-up has no stabilisation window by default; it happens immediately.",
      },
      {
        id: "c",
        text: "Restarts pods every five minutes.",
        explanation: "The window affects scaling decisions, not pod restarts.",
      },
    ],
  },
  {
    id: "queue-metric",
    prompt: "Which metric works for target tracking on a fleet of queue workers?",
    options: [
      {
        id: "a",
        text: "Messages waiting per worker.",
        correct: true,
        explanation:
          "It changes in proportion to the number of workers, so the autoscaler can compute how many it needs.",
      },
      {
        id: "b",
        text: "Total messages waiting in the queue.",
        explanation:
          "The raw backlog doesn't change in proportion to the number of workers, so it can't drive proportional scaling.",
      },
      {
        id: "c",
        text: "The number of producers.",
        explanation: "That says nothing about how busy the workers are.",
      },
    ],
  },
  {
    id: "high-target",
    prompt: "What is the main risk of setting a target utilisation of 90%?",
    options: [
      {
        id: "a",
        text: "Little headroom: growth during instance start-up overloads the fleet and requests fail.",
        correct: true,
        explanation:
          "A lower target leaves each instance room to absorb more load while new instances start.",
      },
      {
        id: "b",
        text: "It costs more than a 60% target.",
        explanation:
          "A higher target uses fewer instances, so it costs less. The risk is reliability.",
      },
      {
        id: "c",
        text: "The autoscaler will never scale out.",
        explanation:
          "It still scales out above 90%; it just has less time to do so before the fleet is full.",
      },
    ],
  },
]);

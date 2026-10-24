import { defineQuiz } from "@/lib/content/schema";

export default defineQuiz([
  {
    id: "what-counts",
    prompt: "Which of these count towards a model's context window on a request?",
    options: [
      {
        id: "a",
        text: "The system prompt, tool definitions, every message including tool results, and the model's own answer.",
        correct: true,
        explanation:
          "Everything the model reads, and everything it writes in the response, shares the same window.",
      },
      {
        id: "b",
        text: "Only the user's latest message.",
        explanation: "The whole request counts, and so does the answer.",
      },
      {
        id: "c",
        text: "Everything except the answer.",
        explanation: "The output shares the window, which is why space must be reserved for it.",
      },
    ],
  },
  {
    id: "drop-oldest",
    prompt:
      "A support chatbot trims long conversations by dropping the oldest messages. What problem is this likely to cause?",
    options: [
      {
        id: "a",
        text: "It loses facts given early in the conversation, such as an order or account number.",
        correct: true,
        explanation:
          "The first messages often state the most important facts. Pin them or summarise instead.",
      },
      {
        id: "b",
        text: "It makes every request more expensive.",
        explanation:
          "Dropping messages makes requests smaller and cheaper; the cost is lost information.",
      },
      {
        id: "c",
        text: "None: models remember earlier requests anyway.",
        explanation:
          "Models don't keep state between requests; the application re-sends what it wants kept.",
      },
    ],
  },
  {
    id: "growing-cost",
    prompt:
      "Why does a 40-turn conversation cost much more than ten 4-turn conversations, with the same messages per turn?",
    options: [
      {
        id: "a",
        text: "Every request re-sends the conversation so far, so later turns pay for all the earlier ones again.",
        correct: true,
        explanation:
          "Input per request grows with the history, so total input grows faster than the number of turns.",
      },
      {
        id: "b",
        text: "Providers charge more per token after the tenth turn.",
        explanation: "The price per token doesn't change; the number of tokens per request does.",
      },
      {
        id: "c",
        text: "Long conversations use a bigger model.",
        explanation: "The model is the same; each request is just longer.",
      },
    ],
  },
  {
    id: "caching-space",
    prompt: "You enable prompt caching for a long system prompt. What changes?",
    options: [
      {
        id: "a",
        text: "Repeated requests are billed less for that prefix, but it still takes up the same space in the window.",
        correct: true,
        explanation: "Caching changes what you pay for those tokens, not whether they count.",
      },
      {
        id: "b",
        text: "The cached prompt no longer counts towards the window.",
        explanation: "Cached tokens still occupy the window.",
      },
      {
        id: "c",
        text: "The model remembers the conversation between requests.",
        explanation:
          "Caching reuses processing of an identical prefix; the application still sends the conversation.",
      },
    ],
  },
  {
    id: "lost-in-middle",
    prompt: "What did Liu et al. find about how models use long contexts?",
    options: [
      {
        id: "a",
        text: "Performance is often highest when relevant information is at the start or end of the input and degrades when it is in the middle.",
        correct: true,
        explanation:
          "Where information sits matters, so a bigger window filled with more text isn't automatically better.",
      },
      {
        id: "b",
        text: "Models use every part of a long context equally well.",
        explanation: "The paper's finding is the opposite: use is uneven.",
      },
      {
        id: "c",
        text: "Models ignore the end of the input.",
        explanation: "The end, like the beginning, is where performance was often highest.",
      },
    ],
  },
]);

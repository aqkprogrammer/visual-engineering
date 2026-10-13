import { defineQuiz } from "@/lib/content/schema";

export default defineQuiz([
  {
    id: "stability",
    prompt:
      "Producers send 12 messages per second; consumers can process 10 per second. What happens over the next hour?",
    options: [
      {
        id: "a",
        text: "The backlog settles at a steady size.",
        explanation:
          "A steady size requires processing at least as fast as arrivals. Here 2 more messages arrive each second than are processed.",
      },
      {
        id: "b",
        text: "The backlog and each new message's waiting time grow continuously.",
        correct: true,
        explanation:
          "About 7,200 extra messages per hour pile up. Add capacity or apply backpressure.",
      },
      {
        id: "c",
        text: "The queue drops the excess automatically.",
        explanation:
          "An unbounded queue keeps everything, which is exactly why the delay keeps growing.",
      },
    ],
  },
  {
    id: "duplicates",
    prompt:
      "A consumer sends an email, then crashes before acknowledging the message. What happens?",
    options: [
      {
        id: "a",
        text: "The message is lost.",
        explanation: "Unacknowledged messages are made available again, so the work is retried.",
      },
      {
        id: "b",
        text: "The message is redelivered and, unless the consumer is idempotent, a second email is sent.",
        correct: true,
        explanation:
          "At-least-once delivery means duplicates are normal. Track processed message ids to make retries harmless.",
      },
      {
        id: "c",
        text: "The queue knows the email was sent and deletes the message.",
        explanation: "The queue only knows what consumers acknowledge.",
      },
    ],
  },
  {
    id: "poison",
    prompt:
      "One malformed message makes the consumer throw every time. Without a dead-letter queue, what happens?",
    options: [
      {
        id: "a",
        text: "It is retried forever, wasting capacity and possibly blocking other messages.",
        correct: true,
        explanation:
          "A dead-letter queue moves it aside after a set number of attempts so it can be inspected and fixed.",
      },
      {
        id: "b",
        text: "The queue repairs the message.",
        explanation: "Queues don't understand message content.",
      },
      {
        id: "c",
        text: "It is processed successfully on the third try.",
        explanation: "A deterministic failure fails every time; retries can't fix bad data.",
      },
    ],
  },
  {
    id: "more-consumers",
    prompt:
      "The backlog grows because every consumer waits on the same overloaded database. What happens if you double the consumers?",
    options: [
      {
        id: "a",
        text: "The backlog drains twice as fast.",
        explanation: "Only if consumers were the bottleneck. Here the database is.",
      },
      {
        id: "b",
        text: "Little improves, and the extra load may slow the database further.",
        correct: true,
        explanation:
          "Fix or protect the real bottleneck, and use backpressure to limit how much work reaches it.",
      },
      {
        id: "c",
        text: "Messages start being delivered exactly once.",
        explanation: "The number of consumers has no effect on delivery guarantees.",
      },
    ],
  },
]);

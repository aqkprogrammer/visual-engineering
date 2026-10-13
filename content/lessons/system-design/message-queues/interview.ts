import { defineInterview } from "@/lib/content/schema";

export default defineInterview([
  {
    id: "idempotent-consumers",
    question: "Why must queue consumers be idempotent?",
    level: "mid",
    kind: "concept",
    answer:
      "Most queues deliver messages at least once: if a consumer processes a message but crashes, times out or loses its connection before acknowledging, the message is delivered again. An idempotent consumer — for example one that records processed message ids in the same transaction as its effects — makes duplicates harmless.",
    rubric: {
      core: [
        "Most queues deliver messages at least once",
        "A crash or timeout before acknowledgement causes redelivery",
        "Idempotent consumers make duplicates harmless, for example by recording processed message ids",
      ],
      strong: ["Records processed ids in the same transaction as the effects"],
      redFlags: ["Assumes the queue delivers exactly once"],
    },
  },
  {
    id: "growing-backlog",
    question: "Your queue backlog keeps growing. How do you diagnose and fix it?",
    level: "senior",
    kind: "debugging",
    answer:
      "Compare the arrival rate with the processing rate, and watch the age of the oldest message. If consumers are the bottleneck, scale them out. If they're waiting on a slow dependency, fix or protect that dependency, because more consumers would only add load. Check the dead-letter queue and error rates for messages that fail repeatedly. For overload, apply backpressure — bound the queue, slow producers, or shed low-priority work.",
    rubric: {
      core: [
        "Compares arrival rate with processing rate and watches the age of the oldest message",
        "Scales consumers if they are the bottleneck",
        "Fixes or protects a slow dependency, since more consumers would only add load",
      ],
      strong: [
        "Checks the dead-letter queue and error rates",
        "Applies backpressure: bound the queue, slow producers, shed low-priority work",
      ],
      redFlags: ["Adds consumers without checking what they are waiting on"],
    },
  },
  {
    id: "dead-letter-queue",
    question: "What is a dead-letter queue and when is a message moved there?",
    level: "junior",
    kind: "concept",
    answer:
      "A separate queue for messages that couldn't be processed after a configured number of delivery attempts (maxReceiveCount in Amazon SQS). It stops a poison message from being retried forever and blocking other work, and lets engineers inspect, fix and redrive the failed messages.",
    rubric: {
      core: [
        "A separate queue for messages that failed a configured number of attempts",
        "Stops poison messages from blocking healthy work",
        "Lets engineers inspect, fix and redrive the failed messages",
      ],
      strong: ["Names maxReceiveCount or an equivalent setting"],
      redFlags: ["Thinks messages in a dead-letter queue are deleted"],
    },
  },
  {
    id: "event-log-vs-work-queue",
    question: "When would you choose an event log like Kafka over a work queue?",
    level: "senior",
    kind: "trade-off",
    answer:
      "When several independent consumers need to read the same events, when you need ordering within a key (such as per customer), or when you need to replay history — for example to rebuild a projection or recover from a bug. A work queue is simpler when each task should be done once by one worker and then discarded.",
    rubric: {
      core: [
        "A log lets several independent consumers read the same events",
        "A log supports replay and ordering within a key",
        "A work queue suits tasks that one worker does once",
      ],
      strong: ["Gives a replay use case, such as rebuilding a projection"],
      redFlags: ["Treats Kafka and work queues as interchangeable"],
    },
  },
]);

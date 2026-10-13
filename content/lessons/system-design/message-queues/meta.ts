import { defineLesson } from "@/lib/content/schema";

export default defineLesson({
  slug: "message-queues",
  domain: "system-design",
  module: "messaging",
  order: 10,
  title: "Message queues and backpressure",
  description:
    "How queues decouple producers from consumers, why backlogs grow when arrivals outpace processing, and how acks, retries, dead-letter queues and backpressure help.",
  difficulty: "intermediate",
  related: ["system-design/rate-limiting", "system-design/load-balancing"],
  tags: ["queues", "messaging", "backpressure", "async", "reliability"],
  references: [
    {
      title: "Using dead-letter queues in Amazon SQS",
      url: "https://docs.aws.amazon.com/AWSSimpleQueueService/latest/SQSDeveloperGuide/sqs-dead-letter-queues.html",
      publisher: "Amazon Web Services",
      kind: "official-docs",
    },
    {
      title: "Amazon SQS visibility timeout",
      url: "https://docs.aws.amazon.com/AWSSimpleQueueService/latest/SQSDeveloperGuide/sqs-visibility-timeout.html",
      publisher: "Amazon Web Services",
      kind: "official-docs",
    },
    {
      title: "Consumer Acknowledgements and Publisher Confirms",
      url: "https://www.rabbitmq.com/docs/confirms",
      publisher: "RabbitMQ",
      kind: "official-docs",
    },
    {
      title: "Consumer Prefetch",
      url: "https://www.rabbitmq.com/docs/consumer-prefetch",
      publisher: "RabbitMQ",
      kind: "official-docs",
    },
    {
      title: "Apache Kafka documentation",
      url: "https://kafka.apache.org/documentation/",
      publisher: "Apache Software Foundation",
      kind: "official-docs",
    },
  ],
  lastReviewed: "2026-10-13",
  status: "published",
});

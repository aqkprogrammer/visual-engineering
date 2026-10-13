import { defineLesson } from "@/lib/content/schema";

export default defineLesson({
  slug: "regions-and-availability-zones",
  domain: "cloud",
  module: "foundations",
  order: 10,
  title: "Regions and Availability Zones",
  description:
    "How cloud regions and availability zones contain failures, why one zone is never enough, and how static stability keeps you serving when a zone disappears.",
  difficulty: "beginner",
  related: ["system-design/load-balancing", "networking/dns-resolution"],
  tags: ["cloud", "availability-zones", "regions", "resilience", "high-availability"],
  references: [
    {
      title: "AWS Fault Isolation Boundaries: Availability Zones",
      url: "https://docs.aws.amazon.com/whitepapers/latest/aws-fault-isolation-boundaries/availability-zones.html",
      publisher: "Amazon Web Services",
      kind: "official-docs",
    },
    {
      title: "Static stability using Availability Zones",
      url: "https://builder.aws.com/content/3K9SiqiJ369TGkkGzqPM95BuYWI/static-stability-using-availability-zones",
      publisher: "Amazon Web Services",
      kind: "article",
    },
    {
      title: "AWS Global Infrastructure",
      url: "https://aws.amazon.com/about-aws/global-infrastructure/",
      publisher: "Amazon Web Services",
      kind: "official-docs",
    },
  ],
  lastReviewed: "2026-10-13",
  status: "published",
});

import { defineLesson } from "@/lib/content/schema";

export default defineLesson({
  slug: "dns-resolution",
  domain: "networking",
  module: "naming",
  order: 10,
  title: "How DNS resolution works",
  description:
    "How a name like shop.example.com becomes an IP address: stub and recursive resolvers, root, TLD and authoritative servers, and the caching and TTLs that make it fast.",
  difficulty: "beginner",
  related: ["networking/tls-handshake", "system-design/caching"],
  tags: ["dns", "networking", "caching", "ttl", "resolvers"],
  references: [
    {
      title: "RFC 1034: Domain Names — Concepts and Facilities",
      url: "https://www.rfc-editor.org/rfc/rfc1034",
      publisher: "IETF",
      kind: "specification",
    },
    {
      title: "RFC 1035: Domain Names — Implementation and Specification",
      url: "https://www.rfc-editor.org/rfc/rfc1035",
      publisher: "IETF",
      kind: "specification",
    },
    {
      title: "RFC 2308: Negative Caching of DNS Queries",
      url: "https://www.rfc-editor.org/rfc/rfc2308",
      publisher: "IETF",
      kind: "specification",
    },
    {
      title: "RFC 7766: DNS Transport over TCP",
      url: "https://www.rfc-editor.org/rfc/rfc7766",
      publisher: "IETF",
      kind: "specification",
    },
    {
      title: "RFC 8484: DNS Queries over HTTPS (DoH)",
      url: "https://www.rfc-editor.org/rfc/rfc8484",
      publisher: "IETF",
      kind: "specification",
    },
    {
      title: "Root Servers",
      url: "https://www.iana.org/domains/root/servers",
      publisher: "IANA",
      kind: "official-docs",
    },
  ],
  lastReviewed: "2026-10-13",
  status: "published",
});

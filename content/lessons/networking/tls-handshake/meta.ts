import { defineLesson } from "@/lib/content/schema";

export default defineLesson({
  slug: "tls-handshake",
  domain: "networking",
  module: "web-protocols",
  order: 20,
  title: "How the TLS 1.3 handshake works",
  description:
    "How a browser and server agree on secret keys over an open network, prove the server's identity with a certificate, and start encrypting in one round trip.",
  difficulty: "intermediate",
  related: ["system-design/load-balancing"],
  tags: ["tls", "https", "encryption", "certificates", "security"],
  references: [
    {
      title: "RFC 8446: The Transport Layer Security (TLS) Protocol Version 1.3",
      url: "https://www.rfc-editor.org/rfc/rfc8446",
      publisher: "IETF",
      kind: "specification",
    },
    {
      title: "RFC 8996: Deprecating TLS 1.0 and TLS 1.1",
      url: "https://www.rfc-editor.org/rfc/rfc8996",
      publisher: "IETF",
      kind: "specification",
    },
    {
      title: "RFC 9849: TLS Encrypted Client Hello",
      url: "https://www.rfc-editor.org/rfc/rfc9849",
      publisher: "IETF",
      kind: "specification",
    },
    {
      title: "RFC 8555: Automatic Certificate Management Environment (ACME)",
      url: "https://www.rfc-editor.org/rfc/rfc8555",
      publisher: "IETF",
      kind: "specification",
    },
    {
      title: "A Detailed Look at RFC 8446 (a.k.a. TLS 1.3)",
      url: "https://blog.cloudflare.com/rfc-8446-aka-tls-1-3/",
      publisher: "Cloudflare",
      kind: "article",
    },
    {
      title: "Node.js TLS (SSL) documentation",
      url: "https://nodejs.org/api/tls.html",
      publisher: "OpenJS Foundation",
      kind: "official-docs",
    },
  ],
  lastReviewed: "2026-10-12",
  status: "published",
});

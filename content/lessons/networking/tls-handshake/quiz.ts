import { defineQuiz } from "@/lib/content/schema";

export default defineQuiz([
  {
    id: "secret-never-sent",
    prompt: "In a TLS 1.3 handshake, how do the client and server end up with the same secret key?",
    options: [
      {
        id: "a",
        text: "The server encrypts a random session key with its certificate's public key and sends it.",
        explanation:
          "That was RSA key transport, removed in TLS 1.3 because it offers no forward secrecy: steal the certificate key later and you can decrypt recordings.",
      },
      {
        id: "b",
        text: "Each side sends a public key share and combines it with its own private key to compute the same shared secret.",
        correct: true,
        explanation:
          "This is ephemeral (EC)DHE key exchange. The shared secret is computed independently on both sides and never crosses the network.",
      },
      {
        id: "c",
        text: "The client sends the key inside the ClientHello, hidden by the SNI field.",
        explanation:
          "The ClientHello is plaintext, and SNI only carries the site name. Nothing secret is sent in it.",
      },
      {
        id: "d",
        text: "Both sides already share a key stored in the browser for each website.",
        explanation:
          "Browsers store trusted root certificates, not per-site secret keys. Fresh keys are agreed for each connection.",
      },
    ],
  },
  {
    id: "certificate-verify",
    prompt:
      "An attacker has a copy of shop.example.com's certificate. Which message stops them impersonating the server?",
    options: [
      {
        id: "a",
        text: "ServerHello",
        explanation:
          "ServerHello carries the key share and chosen cipher suite; anyone could send one.",
      },
      {
        id: "b",
        text: "EncryptedExtensions",
        explanation: "It carries settings such as ALPN and proves nothing about identity.",
      },
      {
        id: "c",
        text: "CertificateVerify",
        correct: true,
        explanation:
          "The server signs the transcript of this specific handshake with the certificate's private key. A copied certificate is useless without that key.",
      },
      {
        id: "d",
        text: "Client Finished",
        explanation:
          "The client's Finished confirms the client saw the same transcript; it doesn't authenticate the server.",
      },
    ],
  },
  {
    id: "what-leaks",
    prompt:
      "Without Encrypted Client Hello, what can a passive observer on the network still learn about an HTTPS request?",
    options: [
      {
        id: "a",
        text: "The full URL, including the path and query string.",
        explanation: "The path and query string travel inside the encrypted HTTP request.",
      },
      {
        id: "b",
        text: "The session cookie.",
        explanation:
          "Cookies are HTTP headers, which are encrypted with the application traffic keys.",
      },
      {
        id: "c",
        text: "The site name from the SNI field, plus the server's IP address and the sizes and timing of records.",
        correct: true,
        explanation:
          "The ClientHello, including SNI, is plaintext, and IP addresses and traffic shape are always visible. ECH (RFC 9849) encrypts the sensitive parts of the ClientHello.",
      },
      {
        id: "d",
        text: "The server's certificate.",
        explanation:
          "In TLS 1.3 the certificate is sent after ServerHello, so it is encrypted. It was visible in TLS 1.2.",
      },
    ],
  },
  {
    id: "zero-rtt",
    prompt: "Why do many servers refuse 0-RTT early data for a request like POST /payments?",
    options: [
      {
        id: "a",
        text: "Early data is sent unencrypted.",
        explanation:
          "Early data is encrypted using keys from the resumed session; secrecy is not the issue.",
      },
      {
        id: "b",
        text: "Early data can be captured and replayed, so a non-idempotent request might be executed twice.",
        correct: true,
        explanation:
          "0-RTT data is sent before the handshake proves freshness. RFC 8446 recommends it only for operations that are safe to repeat.",
      },
      {
        id: "c",
        text: "0-RTT only works with TLS 1.2.",
        explanation: "0-RTT early data is a TLS 1.3 feature built on session resumption.",
      },
      {
        id: "d",
        text: "Payments always need a client certificate.",
        explanation:
          "Client certificates are unrelated; the concern is replay of the request itself.",
      },
    ],
  },
]);

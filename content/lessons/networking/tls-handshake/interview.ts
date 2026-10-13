import { defineInterview } from "@/lib/content/schema";

export default defineInterview([
  {
    id: "tls13-one-round-trip",
    question: "Why can TLS 1.3 finish its handshake in one round trip when TLS 1.2 needed two?",
    level: "mid",
    kind: "concept",
    answer:
      "The client sends its key share in the very first message, guessing a key-exchange group the server will accept. The server can immediately compute the shared secret, derive keys and send its certificate, proof of key possession and Finished message in one encrypted flight. In TLS 1.2 the two sides first negotiated parameters and only then exchanged key material. If the client's guess is wrong, a HelloRetryRequest costs an extra round trip.",
    rubric: {
      core: [
        "The client sends its key share in the first message",
        "The server derives keys at once and replies with its certificate, proof and Finished in one flight",
        "TLS 1.2 negotiated parameters before exchanging key material",
      ],
      strong: ["Mentions HelloRetryRequest when the client guesses the wrong group"],
      redFlags: ["Says TLS 1.3 skips server authentication"],
    },
  },
  {
    id: "forward-secrecy",
    question: "What is forward secrecy and how does TLS 1.3 provide it?",
    level: "mid",
    kind: "concept",
    answer:
      "Forward secrecy means that compromising a server's long-term private key later does not let an attacker decrypt traffic they recorded earlier. TLS 1.3 achieves it by always using ephemeral (EC)DHE key exchange: fresh key shares per connection that are discarded afterwards. The certificate's key is used only to sign the handshake, never to transport the session key.",
    rubric: {
      core: [
        "Defines forward secrecy: a later key compromise cannot decrypt recorded traffic",
        "TLS 1.3 always uses ephemeral (EC)DHE key exchange, discarded after use",
        "The certificate's key only signs the handshake",
      ],
      strong: ["Contrasts it with RSA key transport in older TLS versions"],
      redFlags: ["Says the session key is encrypted with the certificate's key"],
    },
  },
  {
    id: "certificate-replay",
    question:
      "A client can see the server's certificate. What stops an attacker from replaying that certificate to impersonate the server?",
    level: "senior",
    kind: "concept",
    answer:
      "The CertificateVerify message: the server signs the handshake transcript — which includes fresh random values and key shares from this connection — with the private key matching the certificate. An attacker with only a copy of the certificate cannot produce that signature, and the client rejects the handshake.",
    rubric: {
      core: [
        "CertificateVerify: the server signs the handshake transcript with its private key",
        "The transcript includes this connection's fresh random values and key shares",
        "Without the private key an attacker cannot produce that signature",
      ],
      strong: ["Points out that certificates are public by design"],
      redFlags: ["Treats the certificate itself as a secret"],
    },
  },
  {
    id: "zero-rtt-replay",
    question: "What risk does 0-RTT early data introduce, and how should you handle it?",
    level: "senior",
    kind: "trade-off",
    answer:
      "Early data is sent before the handshake confirms the connection is fresh, so an attacker can capture and replay it. It should only carry requests that are safe to execute more than once — idempotent reads — or be disabled. Servers that accept it typically add replay protections and reject early data for state-changing requests.",
    rubric: {
      core: [
        "0-RTT early data can be captured and replayed",
        "Only requests that are safe to repeat, such as idempotent reads, should use it",
        "Otherwise disable it or add server-side replay protection",
      ],
      strong: ["Explicitly rejects early data for state-changing requests"],
      redFlags: ["Says early data has the same guarantees as normal application data"],
    },
  },
]);

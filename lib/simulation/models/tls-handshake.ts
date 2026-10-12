/**
 * Authored walkthrough of a full TLS 1.3 handshake (RFC 8446, section 2, figure 1) between a
 * browser and a web server, ending with the first encrypted HTTP request.
 *
 * Simplified: no client certificates, no HelloRetryRequest, no session resumption or 0-RTT.
 * Key material is described, never shown — the values are not real.
 */
import { walkthroughFrames, type WalkthroughStep } from "../run";

export type Protection = "plaintext" | "handshake-keys" | "application-keys";

export type TlsMessage = {
  id: string;
  from: "client" | "server";
  name: string;
  protection: Protection;
  /** What the message carries. Values are illustrative. */
  fields: { label: string; value: string }[];
  /** What a passive observer on the network can learn from this message. */
  observerSees: string;
};

export const TLS_MESSAGES: TlsMessage[] = [
  {
    id: "client-hello",
    from: "client",
    name: "ClientHello",
    protection: "plaintext",
    fields: [
      { label: "supported_versions", value: "TLS 1.3" },
      {
        label: "cipher_suites",
        value: "TLS_AES_128_GCM_SHA256, TLS_AES_256_GCM_SHA384, TLS_CHACHA20_POLY1305_SHA256",
      },
      { label: "key_share", value: "X25519 public key (ephemeral)" },
      { label: "server_name (SNI)", value: "shop.example.com" },
      { label: "signature_algorithms", value: "ecdsa_secp256r1_sha256, rsa_pss_rsae_sha256, …" },
      { label: "random", value: "32 random bytes" },
    ],
    observerSees:
      "Everything, including the site name in SNI (unless Encrypted Client Hello is used).",
  },
  {
    id: "server-hello",
    from: "server",
    name: "ServerHello",
    protection: "plaintext",
    fields: [
      { label: "cipher_suite", value: "TLS_AES_128_GCM_SHA256" },
      { label: "key_share", value: "X25519 public key (ephemeral)" },
      { label: "supported_versions", value: "TLS 1.3" },
      { label: "random", value: "32 random bytes" },
    ],
    observerSees:
      "The chosen cipher suite and both public key shares — but the shared secret cannot be computed from public shares alone.",
  },
  {
    id: "encrypted-extensions",
    from: "server",
    name: "EncryptedExtensions",
    protection: "handshake-keys",
    fields: [{ label: "application_layer_protocol_negotiation", value: "h2 (HTTP/2)" }],
    observerSees: "Only that an encrypted record of roughly this size was sent.",
  },
  {
    id: "certificate",
    from: "server",
    name: "Certificate",
    protection: "handshake-keys",
    fields: [
      { label: "certificate_list", value: "shop.example.com → intermediate CA" },
      { label: "subject alt name", value: "DNS:shop.example.com" },
    ],
    observerSees: "Nothing readable — unlike TLS 1.2, the certificate is encrypted in TLS 1.3.",
  },
  {
    id: "certificate-verify",
    from: "server",
    name: "CertificateVerify",
    protection: "handshake-keys",
    fields: [
      { label: "algorithm", value: "ecdsa_secp256r1_sha256" },
      {
        label: "signature",
        value: "signature over the handshake transcript, made with the certificate's private key",
      },
    ],
    observerSees: "Nothing readable.",
  },
  {
    id: "server-finished",
    from: "server",
    name: "Finished",
    protection: "handshake-keys",
    fields: [{ label: "verify_data", value: "HMAC over the handshake transcript" }],
    observerSees: "Nothing readable.",
  },
  {
    id: "client-finished",
    from: "client",
    name: "Finished",
    protection: "handshake-keys",
    fields: [{ label: "verify_data", value: "HMAC over the handshake transcript" }],
    observerSees: "Nothing readable.",
  },
  {
    id: "application-data",
    from: "client",
    name: "Application data",
    protection: "application-keys",
    fields: [{ label: "content", value: "GET /cart HTTP/2 · cookie: session=…" }],
    observerSees: "Encrypted records and their sizes and timing — not the URL, headers or cookies.",
  },
];

export type Knowledge = { id: string; label: string; secret: boolean };

const K = {
  serverName: { id: "server-name", label: "The server's name: shop.example.com", secret: false },
  clientPrivate: { id: "client-private", label: "Its own ephemeral private key", secret: true },
  serverPrivate: { id: "server-private", label: "Its own ephemeral private key", secret: true },
  certKey: { id: "cert-key", label: "Its certificate's long-term private key", secret: true },
  peerShare: { id: "peer-share", label: "The other side's public key share", secret: false },
  shared: { id: "shared", label: "Shared secret (from ECDHE)", secret: true },
  handshakeKeys: { id: "handshake-keys", label: "Handshake traffic keys (HKDF)", secret: true },
  identity: { id: "identity", label: "Verified: this really is shop.example.com", secret: false },
  appKeys: { id: "app-keys", label: "Application traffic keys", secret: true },
  trustStore: {
    id: "trust-store",
    label: "Trusted root CAs (built into the OS/browser)",
    secret: false,
  },
} satisfies Record<string, Knowledge>;

export type TlsState = {
  /** Messages that have been sent so far, in order. */
  sent: string[];
  /** The message this step is about, if any. */
  current: string | null;
  client: Knowledge[];
  server: Knowledge[];
  /** Round trips completed before the client can send its request. */
  roundTrips: number;
};

const step = (
  title: string,
  caption: string,
  state: TlsState,
  events: WalkthroughStep<TlsState>["events"] = [],
): WalkthroughStep<TlsState> => ({ title, caption, state, events });

const SENT_ORDER = TLS_MESSAGES.map((m) => m.id);
const upTo = (id: string) => SENT_ORDER.slice(0, SENT_ORDER.indexOf(id) + 1);

export const TLS_STEPS: WalkthroughStep<TlsState>[] = [
  step(
    "Before the handshake",
    "A TCP connection to shop.example.com is open, but nothing is encrypted yet. The browser knows which site it wants and which certificate authorities it trusts.",
    {
      sent: [],
      current: null,
      client: [K.serverName, K.trustStore],
      server: [K.certKey],
      roundTrips: 0,
    },
  ),
  step(
    "ClientHello",
    "The browser offers TLS 1.3, the cipher suites it supports and — crucially — a key share for a guessed key-exchange group, so no extra round trip is needed to agree on one.",
    {
      sent: upTo("client-hello"),
      current: "client-hello",
      client: [K.serverName, K.trustStore, K.clientPrivate],
      server: [K.certKey],
      roundTrips: 0,
    },
    [{ message: "→ ClientHello (plaintext)", tone: "info" }],
  ),
  step(
    "ServerHello",
    "The server picks a cipher suite and sends its own key share. It combines its private key with the client's public share to compute the shared secret, and derives handshake traffic keys from it.",
    {
      sent: upTo("server-hello"),
      current: "server-hello",
      client: [K.serverName, K.trustStore, K.clientPrivate],
      server: [K.certKey, K.serverPrivate, K.peerShare, K.shared, K.handshakeKeys],
      roundTrips: 0,
    },
    [{ message: "← ServerHello (plaintext) — everything after this is encrypted", tone: "info" }],
  ),
  step(
    "Both sides derive the same keys",
    "The browser does the mirror-image calculation with its private key and the server's public share. Both arrive at the same shared secret without ever sending it — an eavesdropper who saw both public shares still cannot compute it.",
    {
      sent: upTo("server-hello"),
      current: null,
      client: [K.serverName, K.trustStore, K.clientPrivate, K.peerShare, K.shared, K.handshakeKeys],
      server: [K.certKey, K.serverPrivate, K.peerShare, K.shared, K.handshakeKeys],
      roundTrips: 0,
    },
  ),
  step(
    "EncryptedExtensions",
    "The first message protected with handshake keys. It carries settings that don't need to be in the clear, such as the agreed application protocol (HTTP/2 here, via ALPN).",
    {
      sent: upTo("encrypted-extensions"),
      current: "encrypted-extensions",
      client: [K.serverName, K.trustStore, K.clientPrivate, K.peerShare, K.shared, K.handshakeKeys],
      server: [K.certKey, K.serverPrivate, K.peerShare, K.shared, K.handshakeKeys],
      roundTrips: 0,
    },
    [{ message: "← {EncryptedExtensions}", tone: "info" }],
  ),
  step(
    "Certificate",
    "The server sends its certificate chain, still encrypted. The certificate binds the name shop.example.com to a public key, signed by a certificate authority.",
    {
      sent: upTo("certificate"),
      current: "certificate",
      client: [K.serverName, K.trustStore, K.clientPrivate, K.peerShare, K.shared, K.handshakeKeys],
      server: [K.certKey, K.serverPrivate, K.peerShare, K.shared, K.handshakeKeys],
      roundTrips: 0,
    },
    [{ message: "← {Certificate}", tone: "info" }],
  ),
  step(
    "CertificateVerify",
    "Anyone can copy a certificate; only its owner has the private key. The server signs the whole handshake so far with that key, proving possession — and tying the certificate to this specific handshake.",
    {
      sent: upTo("certificate-verify"),
      current: "certificate-verify",
      client: [K.serverName, K.trustStore, K.clientPrivate, K.peerShare, K.shared, K.handshakeKeys],
      server: [K.certKey, K.serverPrivate, K.peerShare, K.shared, K.handshakeKeys],
      roundTrips: 0,
    },
    [{ message: "← {CertificateVerify}", tone: "info" }],
  ),
  step(
    "Server Finished",
    "A MAC over the entire transcript. If an attacker had altered any earlier message, this check would fail. The server now derives application keys and may already send data.",
    {
      sent: upTo("server-finished"),
      current: "server-finished",
      client: [K.serverName, K.trustStore, K.clientPrivate, K.peerShare, K.shared, K.handshakeKeys],
      server: [K.certKey, K.serverPrivate, K.peerShare, K.shared, K.handshakeKeys, K.appKeys],
      roundTrips: 1,
    },
    [{ message: "← {Finished} — one round trip complete", tone: "info" }],
  ),
  step(
    "The browser checks everything",
    "It verifies the certificate chain up to a trusted root, that the name matches shop.example.com and the dates are valid, the CertificateVerify signature, and the server's Finished. Any failure aborts the connection with an alert.",
    {
      sent: upTo("server-finished"),
      current: null,
      client: [
        K.serverName,
        K.trustStore,
        K.clientPrivate,
        K.peerShare,
        K.shared,
        K.handshakeKeys,
        K.identity,
        K.appKeys,
      ],
      server: [K.certKey, K.serverPrivate, K.peerShare, K.shared, K.handshakeKeys, K.appKeys],
      roundTrips: 1,
    },
    [
      {
        message: "✓ Certificate chain, hostname, signature and Finished verified",
        tone: "success",
      },
    ],
  ),
  step(
    "Client Finished",
    "The browser sends its own Finished so the server can confirm the client saw the same transcript.",
    {
      sent: upTo("client-finished"),
      current: "client-finished",
      client: [
        K.serverName,
        K.trustStore,
        K.clientPrivate,
        K.peerShare,
        K.shared,
        K.handshakeKeys,
        K.identity,
        K.appKeys,
      ],
      server: [K.certKey, K.serverPrivate, K.peerShare, K.shared, K.handshakeKeys, K.appKeys],
      roundTrips: 1,
    },
    [{ message: "→ {Finished}", tone: "info" }],
  ),
  step(
    "Encrypted application data",
    "The HTTP request goes out under application traffic keys — after just one round trip of handshake. An observer sees encrypted records, their sizes and timing, but not the URL, headers or cookies.",
    {
      sent: upTo("application-data"),
      current: "application-data",
      client: [
        K.serverName,
        K.trustStore,
        K.clientPrivate,
        K.peerShare,
        K.shared,
        K.handshakeKeys,
        K.identity,
        K.appKeys,
      ],
      server: [K.certKey, K.serverPrivate, K.peerShare, K.shared, K.handshakeKeys, K.appKeys],
      roundTrips: 1,
    },
    [{ message: "→ [Application data] GET /cart", tone: "success" }],
  ),
];

export const tlsFrames = walkthroughFrames(TLS_STEPS);
export const tlsMessage = (id: string) => TLS_MESSAGES.find((m) => m.id === id);

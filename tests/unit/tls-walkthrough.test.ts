import { describe, expect, it } from "vitest";
import { TLS_MESSAGES, TLS_STEPS, tlsFrames } from "@/lib/simulation/models/tls-handshake";

describe("TLS 1.3 walkthrough", () => {
  it("sends messages in RFC 8446 order", () => {
    expect(TLS_MESSAGES.map((m) => `${m.from}:${m.name}`)).toEqual([
      "client:ClientHello",
      "server:ServerHello",
      "server:EncryptedExtensions",
      "server:Certificate",
      "server:CertificateVerify",
      "server:Finished",
      "client:Finished",
      "client:Application data",
    ]);
  });

  it("only the two Hello messages travel in plaintext", () => {
    const plaintext = TLS_MESSAGES.filter((m) => m.protection === "plaintext").map((m) => m.name);
    expect(plaintext).toEqual(["ClientHello", "ServerHello"]);
    expect(TLS_MESSAGES.at(-1)!.protection).toBe("application-keys");
  });

  it("never lets a side know a secret before it could have derived it", () => {
    for (const step of TLS_STEPS) {
      const sent = new Set(step.state.sent);
      const knows = (side: "client" | "server", id: string) =>
        step.state[side].some((k) => k.id === id);
      if (knows("server", "shared")) expect(sent.has("client-hello")).toBe(true);
      if (knows("client", "shared")) expect(sent.has("server-hello")).toBe(true);
      if (knows("client", "identity")) {
        for (const id of ["certificate", "certificate-verify", "server-finished"])
          expect(sent.has(id)).toBe(true);
      }
    }
  });

  it("completes in one round trip before the client sends its request", () => {
    const final = TLS_STEPS.at(-1)!.state;
    expect(final.roundTrips).toBe(1);
    expect(final.current).toBe("application-data");
  });

  it("produces one frame per step with a titled caption", () => {
    expect(tlsFrames).toHaveLength(TLS_STEPS.length);
    expect(tlsFrames[1]!.caption.startsWith("ClientHello.")).toBe(true);
  });
});

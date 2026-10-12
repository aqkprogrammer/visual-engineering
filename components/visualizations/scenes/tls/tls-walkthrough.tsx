"use client";

import { KeyRound, Lock, Unlock } from "lucide-react";
import { useState } from "react";
import {
  TLS_MESSAGES,
  TLS_STEPS,
  tlsFrames,
  tlsMessage,
  type Knowledge,
  type TlsState,
} from "@/lib/simulation/models/tls-handshake";
import { cn } from "@/lib/utils/cn";
import { SegmentedControl } from "../../player/controls";
import { SimulationPlayer } from "../../player/simulation-player";
import { usePlayback } from "../../player/use-playback";
import { TlsScene, type TlsLens } from "./tls-scene";

export const TLS_ASSUMPTIONS = [
  "A full handshake with one server certificate and no client certificate.",
  "The client's guessed key-exchange group (X25519) is accepted, so there is no HelloRetryRequest.",
  "No session resumption or 0-RTT early data.",
  "Field values are illustrative; real keys, randoms and signatures are never shown.",
  "TCP connection setup before the handshake is not shown.",
];

const PROTECTION_LABEL = {
  plaintext: "Plaintext",
  "handshake-keys": "Encrypted with handshake keys",
  "application-keys": "Encrypted with application keys",
} as const;

function KnowledgeList({
  title,
  items,
  previous,
}: {
  title: string;
  items: Knowledge[];
  previous: Knowledge[];
}) {
  const before = new Set(previous.map((k) => k.id));
  return (
    <section aria-label={title} className="min-w-0">
      <h4 className="text-xs font-medium text-fg-muted">{title}</h4>
      <ul className="mt-2 space-y-1.5 text-sm">
        {items.map((item) => {
          const isNew = !before.has(item.id);
          return (
            <li key={item.id} className={cn("flex items-start gap-2", isNew && "font-medium")}>
              <KeyRound
                aria-hidden
                className={cn(
                  "mt-0.5 size-3.5 shrink-0",
                  item.secret ? "text-warn" : "text-fg-subtle",
                )}
              />
              <span>
                {item.label}
                {item.secret && <span className="sr-only"> (secret)</span>}
                {isNew && (
                  <span className="ml-1.5 rounded bg-accent-soft px-1 font-mono text-[10px] text-accent">
                    new
                  </span>
                )}
              </span>
            </li>
          );
        })}
      </ul>
    </section>
  );
}

export function TlsHandshakeWalkthrough() {
  const playback = usePlayback({ frameCount: tlsFrames.length, frameMs: 2200 });
  const [lens, setLens] = useState<TlsLens>("participants");
  const index = Math.min(playback.frame, tlsFrames.length - 1);
  const state: TlsState = tlsFrames[index]!.state;
  const previous: TlsState = tlsFrames[Math.max(0, index - 1)]!.state;
  const message = state.current ? tlsMessage(state.current) : undefined;
  const stepFor = (messageId: string) => TLS_STEPS.findIndex((s) => s.state.current === messageId);

  return (
    <SimulationPlayer
      kind="walkthrough"
      title="TLS 1.3 handshake"
      description="A sequence diagram of the TLS 1.3 handshake between a browser and shop.example.com. Each step adds one message or computation, and panels list what each side knows."
      frames={tlsFrames}
      playback={playback}
      aspectRatio="760 / 420"
      scene={(f) => (
        <TlsScene state={f.state} lens={lens} onSelect={(id) => playback.seek(stepFor(id))} />
      )}
      positionLabel={(f) => `Step ${f.index + 1} of ${tlsFrames.length}`}
      eventTime={(at) => `#${at + 1}`}
      assumptions={TLS_ASSUMPTIONS}
      stepTitles={TLS_STEPS.map((s) => s.title)}
      controls={
        <div className="space-y-5">
          <SegmentedControl<TlsLens>
            label="View as"
            value={lens}
            options={[
              { value: "participants", label: "Browser and server" },
              { value: "observer", label: "Eavesdropper on the network" },
            ]}
            onChange={setLens}
          />

          {message ? (
            <section aria-label="Current message" className="rounded-lg border border-border p-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <h4 className="font-mono text-sm font-medium">
                  {message.from === "client" ? "→ " : "← "}
                  {lens === "observer" && message.protection !== "plaintext"
                    ? "encrypted record"
                    : message.name}
                </h4>
                <span className="inline-flex items-center gap-1.5 text-xs text-fg-muted">
                  {message.protection === "plaintext" ? (
                    <Unlock aria-hidden className="size-3.5" />
                  ) : (
                    <Lock aria-hidden className="size-3.5" />
                  )}
                  {PROTECTION_LABEL[message.protection]}
                </span>
              </div>
              {lens === "observer" ? (
                <p className="mt-3 text-sm text-fg-muted">{message.observerSees}</p>
              ) : (
                <dl className="mt-3 grid gap-x-4 gap-y-1.5 text-sm sm:grid-cols-[auto_1fr]">
                  {message.fields.map((field) => (
                    <div key={field.label} className="contents">
                      <dt className="font-mono text-xs leading-5 text-fg-subtle">{field.label}</dt>
                      <dd className="min-w-0 break-words">{field.value}</dd>
                    </div>
                  ))}
                </dl>
              )}
            </section>
          ) : (
            <p className="rounded-lg border border-dashed border-border p-4 text-sm text-fg-muted">
              No message on the wire in this step — this is a computation each side does on its own.
            </p>
          )}

          {lens === "participants" ? (
            <div className="grid gap-6 sm:grid-cols-2">
              <KnowledgeList
                title="The browser knows"
                items={state.client}
                previous={previous.client}
              />
              <KnowledgeList
                title="The server knows"
                items={state.server}
                previous={previous.server}
              />
            </div>
          ) : (
            <p className="text-sm text-fg-muted">
              On the network so far: {state.sent.length} message{state.sent.length === 1 ? "" : "s"}
              ,{" "}
              {
                TLS_MESSAGES.filter(
                  (m) => state.sent.includes(m.id) && m.protection === "plaintext",
                ).length
              }{" "}
              of them readable. The shared secret is never transmitted, so recording the traffic is
              not enough to decrypt it.
            </p>
          )}
        </div>
      }
    />
  );
}

import { ArrowRight, FlaskConical, Footprints } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { getDomain, getPlaygroundDemos } from "@/lib/content/catalog";
import { alternatesFor } from "@/lib/seo";

export const metadata: Metadata = {
  title: "Playground",
  description:
    "Interactive simulations and step-by-step walkthroughs you can play, change and break: load balancing, the TLS 1.3 handshake and Kubernetes self-healing.",
  alternates: alternatesFor("/playground"),
};

export default function PlaygroundPage() {
  const demos = getPlaygroundDemos();
  return (
    <div className="mx-auto max-w-6xl px-4 pt-12 sm:px-6">
      <header className="max-w-2xl space-y-4">
        <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">Playground</h1>
        <p className="text-lg text-fg-muted">
          Watch systems work, then change them and break them. Every demo is a deterministic
          teaching model: the same actions always produce the same result, and each one lists the
          simplifications it makes.
        </p>
      </header>
      <ul className="mt-12 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {demos.map((demo) => {
          const Icon = demo.kind === "simulation" ? FlaskConical : Footprints;
          return (
            <li key={demo.slug}>
              <Link
                href={`/playground/${demo.slug}`}
                className="group flex h-full flex-col rounded-xl border border-border p-6 transition-colors hover:border-border-strong hover:bg-surface"
              >
                <span className="inline-flex items-center gap-1.5 font-mono text-xs text-fg-subtle">
                  <Icon aria-hidden className="size-3.5" />
                  {demo.kind === "simulation" ? "Simulation" : "Walkthrough"} ·{" "}
                  {getDomain(demo.domain)?.title}
                </span>
                <span className="mt-3 text-lg font-medium group-hover:text-accent">
                  {demo.title}
                </span>
                <span className="mt-2 flex-1 text-sm text-fg-muted">{demo.summary}</span>
                <span className="mt-5 inline-flex items-center gap-1.5 text-sm text-accent">
                  Open <ArrowRight aria-hidden className="size-4" />
                </span>
              </Link>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

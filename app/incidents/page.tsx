import { Siren } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { DifficultyBadge } from "@/components/lessons/lesson-meta";
import { getDomain, getIncidents } from "@/lib/content/catalog";
import { alternatesFor } from "@/lib/seo";

export const metadata: Metadata = {
  title: "Incident lab",
  description:
    "Debug realistic production incidents from charts and logs produced by real simulations: diagnose the root cause, choose a fix, then read the postmortem.",
  alternates: alternatesFor("/incidents"),
};

export default function IncidentsPage() {
  const incidents = getIncidents();
  return (
    <div className="mx-auto max-w-6xl px-4 pt-12 sm:px-6">
      <header className="max-w-2xl space-y-4">
        <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">Incident lab</h1>
        <p className="text-lg text-fg-muted">
          Something is broken. Read the alert, study the evidence, diagnose the root cause and pick
          a fix. Every chart and log line comes from running the same simulations the lessons use —
          and you can reproduce each incident in the playground afterwards.
        </p>
      </header>
      <ul className="mt-12 grid gap-4 md:grid-cols-2">
        {incidents.map((incident) => {
          const domain = getDomain(incident.lesson.split("/")[0] ?? "");
          return (
            <li key={incident.slug}>
              <Link
                href={`/incidents/${incident.slug}`}
                className="group flex h-full flex-col gap-3 rounded-xl border border-border p-6 transition-colors hover:border-border-strong hover:bg-surface"
              >
                <span className="inline-flex items-center gap-1.5 font-mono text-xs text-fg-subtle">
                  <Siren aria-hidden className="size-3.5" />
                  {domain?.title}
                </span>
                <span className="font-semibold group-hover:text-accent">{incident.title}</span>
                <span className="text-sm text-fg-muted">{incident.summary}</span>
                <span className="mt-auto pt-2 text-xs text-fg-subtle">
                  <DifficultyBadge difficulty={incident.difficulty} />
                </span>
              </Link>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

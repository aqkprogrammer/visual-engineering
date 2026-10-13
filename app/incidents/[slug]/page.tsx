import { ArrowRight, Siren } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { EvidenceChart } from "@/components/incidents/evidence-chart";
import { Breadcrumbs } from "@/components/layout/breadcrumbs";
import { KnowledgeCheck } from "@/components/lessons/knowledge-check";
import { DifficultyBadge } from "@/components/lessons/lesson-meta";
import {
  getIncident,
  getIncidents,
  getLessonsByRef,
  getPlaygroundDemo,
} from "@/lib/content/catalog";
import type { IncidentClue } from "@/lib/content/schema";
import { INCIDENT_EVIDENCE, type IncidentEvidence } from "@/lib/incidents/evidence";
import { alternatesFor } from "@/lib/seo";

export const dynamicParams = false;

export function generateStaticParams() {
  return getIncidents().map((i) => ({ slug: i.slug }));
}

export async function generateMetadata({
  params,
}: PageProps<"/incidents/[slug]">): Promise<Metadata> {
  const { slug } = await params;
  const incident = getIncident(slug);
  if (!incident) return {};
  return {
    title: `${incident.title} · Incident lab`,
    description: incident.summary,
    alternates: alternatesFor(`/incidents/${incident.slug}`),
  };
}

function Clue({
  clue,
  evidence,
  index,
}: {
  clue: IncidentClue;
  evidence: IncidentEvidence;
  index: number;
}) {
  return (
    <li className="space-y-3 rounded-xl border border-border p-5">
      <div className="space-y-1">
        <p className="font-mono text-xs text-fg-subtle">Evidence {index + 1}</p>
        <h3 className="font-medium">{clue.title}</h3>
        {clue.kind !== "note" && <p className="text-sm text-fg-muted">{clue.caption}</p>}
      </div>
      {clue.kind === "chart" && evidence.charts[clue.ref] && (
        <EvidenceChart chart={evidence.charts[clue.ref]!} title={clue.title} />
      )}
      {clue.kind === "log" && (
        <pre
          tabIndex={0}
          role="region"
          aria-label={clue.title}
          className="relative max-h-72 overflow-auto rounded-md border border-border bg-surface p-3 font-mono text-xs leading-relaxed"
        >
          {(evidence.logs[clue.ref] ?? []).join("\n")}
        </pre>
      )}
      {clue.kind === "note" && (
        <p className="rounded-md bg-surface p-3 text-sm text-fg-muted">{clue.text}</p>
      )}
    </li>
  );
}

export default async function IncidentPage({ params }: PageProps<"/incidents/[slug]">) {
  const { slug } = await params;
  const incident = getIncident(slug);
  const build = INCIDENT_EVIDENCE[slug];
  if (!incident || !build) notFound();

  const evidence = build();
  const [lesson] = getLessonsByRef([incident.lesson]);
  const demo = getPlaygroundDemo(incident.demo);

  return (
    <div className="mx-auto max-w-3xl px-4 pt-8 sm:px-6">
      <header className="space-y-5 border-b border-border pb-8">
        <Breadcrumbs
          items={[{ label: "Incident lab", href: "/incidents" }, { label: incident.title }]}
        />
        <div className="space-y-3">
          <p className="inline-flex items-center gap-1.5 font-mono text-xs tracking-wide text-fg-subtle uppercase">
            <Siren aria-hidden className="size-3.5" /> Incident
          </p>
          <h1 className="text-3xl leading-tight font-semibold tracking-tight text-balance sm:text-4xl">
            {incident.title}
          </h1>
          <p className="text-lg text-fg-muted">{incident.summary}</p>
        </div>
        <p className="text-sm text-fg-muted">
          <DifficultyBadge difficulty={incident.difficulty} />
        </p>
      </header>

      <section aria-labelledby="briefing" className="mt-10 space-y-3">
        <h2 id="briefing" className="text-xl font-semibold">
          The briefing
        </h2>
        <div className="space-y-3 rounded-xl border-l-4 border-warn bg-surface p-5">
          {incident.briefing.map((paragraph) => (
            <p key={paragraph}>{paragraph}</p>
          ))}
        </div>
      </section>

      <section aria-labelledby="evidence" className="mt-12 space-y-4">
        <h2 id="evidence" className="text-xl font-semibold">
          The evidence
        </h2>
        <p className="text-sm text-fg-muted">
          Charts and logs come from a deterministic simulation run, so they look the same every
          time. Times are simulated.
        </p>
        <ol className="space-y-4">
          {incident.clues.map((clue, index) => (
            <Clue key={clue.title} clue={clue} evidence={evidence} index={index} />
          ))}
        </ol>
      </section>

      <KnowledgeCheck
        questions={incident.questions}
        title="Your diagnosis"
        intro="Decide from the evidence, then check. Every option explains what the evidence says about it."
      />

      <section aria-labelledby="postmortem" className="space-y-4">
        <h2 id="postmortem" className="text-xl font-semibold">
          Postmortem
        </h2>
        <details className="group rounded-xl border border-border">
          <summary className="cursor-pointer px-5 py-4 font-medium">
            Read the postmortem <span className="text-fg-subtle">(after you’ve answered)</span>
          </summary>
          <div className="space-y-5 border-t border-border px-5 py-5">
            <div className="space-y-1.5">
              <h3 className="font-medium">What happened</h3>
              <p className="text-fg-muted">{incident.postmortem.whatHappened}</p>
            </div>
            <div className="space-y-1.5">
              <h3 className="font-medium">Why it happened</h3>
              <p className="text-fg-muted">{incident.postmortem.whyItHappened}</p>
            </div>
            <div className="space-y-1.5">
              <h3 className="font-medium">How to prevent it</h3>
              <ul className="list-disc space-y-1 pl-5 text-fg-muted">
                {incident.postmortem.prevention.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            </div>
            {demo && (
              <div className="space-y-1.5">
                <h3 className="font-medium">Reproduce it yourself</h3>
                <ol className="list-decimal space-y-1 pl-5 text-fg-muted">
                  {incident.reproduce.map((step) => (
                    <li key={step}>{step}</li>
                  ))}
                </ol>
                <Link
                  href={`/playground/${demo.slug}`}
                  className="inline-flex items-center gap-1.5 text-sm text-accent hover:underline"
                >
                  Open the demo: {demo.title}
                  <ArrowRight aria-hidden className="size-3.5" />
                </Link>
              </div>
            )}
            {lesson && (
              <p className="text-sm">
                <Link
                  href={`/${lesson.id}`}
                  className="inline-flex items-center gap-1.5 text-accent hover:underline"
                >
                  Learn the mechanism: {lesson.title}
                  <ArrowRight aria-hidden className="size-3.5" />
                </Link>
              </p>
            )}
          </div>
        </details>
      </section>
    </div>
  );
}

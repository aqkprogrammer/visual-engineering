import type { Metadata } from "next";
import {
  getGlossary,
  getIncidents,
  getInterviewEntries,
  getLearningPaths,
  getLessons,
  getPlaygroundDemos,
} from "@/lib/content/catalog";
import {
  LIGHTHOUSE_CATEGORY_BUDGETS,
  LIGHTHOUSE_METRIC_BUDGETS,
  PAGE_WEIGHT_BUDGETS,
} from "@/lib/quality/budgets";
import { alternatesFor } from "@/lib/seo";
import { site } from "@/lib/site";

export const metadata: Metadata = {
  title: "How this platform works",
  description:
    "How Visual Engineering is built and checked: static pages, deterministic simulations, content validated like code, and the tests and budgets every change must pass.",
  alternates: alternatesFor("/how-it-works"),
};

const doc = (file: string) => `${site.repoUrl}/blob/main/${file}`;

export default function HowItWorksPage() {
  const counts = [
    [getLessons().length, "lessons"],
    [getPlaygroundDemos().length, "interactive demos"],
    [getLearningPaths().length, "learning paths"],
    [getInterviewEntries().length, "interview questions"],
    [getIncidents().length, "incidents"],
    [getGlossary().length, "glossary terms"],
  ] as const;
  const pct = (n: number) => Math.round(n * 100);

  return (
    <div className="mx-auto max-w-6xl px-4 pt-12 sm:px-6">
      <article className="prose-ve">
        <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">
          How this platform works
        </h1>
        <p className="text-lg text-fg-muted">
          The same standards the lessons teach — determinism, observability, budgets and tests —
          applied to the site itself. Everything below is enforced on every change, and all of it is
          in the <a href={site.repoUrl}>public repository</a>.
        </p>

        <ul className="not-prose my-8 grid grid-cols-2 gap-px overflow-hidden rounded-xl border border-border bg-border sm:grid-cols-3">
          {counts.map(([n, label]) => (
            <li key={label} className="bg-bg p-4">
              <span className="block font-mono text-2xl">{n}</span>
              <span className="text-sm text-fg-muted">{label}</span>
            </li>
          ))}
        </ul>

        <h2>Static pages, no server</h2>
        <p>
          Every page is generated ahead of time with Next.js and served as plain files from GitHub
          Pages. There is no backend, no database, no account system and no API key. Simulations run
          in your browser, and a page only downloads the simulation it shows.
        </p>

        <h2>Content is validated like code</h2>
        <p>
          Lessons, quizzes, interview questions, learning paths, glossary terms and incidents are
          typed files checked by a schema before every build. The check rejects, among other things:
        </p>
        <ul>
          <li>references that aren&rsquo;t https, or a lesson with fewer than two of them;</li>
          <li>
            quiz questions without exactly one correct answer, or an option without an explanation;
          </li>
          <li>
            links to lessons that don&rsquo;t exist or aren&rsquo;t published, and cycles of
            prerequisites;
          </li>
          <li>learning paths that teach a lesson before its prerequisites;</li>
          <li>incident clues that name evidence the simulation doesn&rsquo;t produce.</li>
        </ul>

        <h2>Simulations are deterministic</h2>
        <p>
          Each simulation is a pure model: given the same seed and the same actions, it produces
          exactly the same frames. Pressing a button records an action at the current step, so you
          can scrub back and forth and every view stays consistent. Every model lists its
          simplifications, and illustrative numbers are labelled as such.
        </p>
        <p>
          The charts and logs in the incident lab are produced by running those models, not drawn by
          hand. Tests check that the evidence shows exactly what each incident&rsquo;s story claims,
          so a change to a model can&rsquo;t quietly make a lesson untrue.
        </p>

        <h2>Every change passes the same gates</h2>
        <ul>
          <li>Linting, formatting and strict TypeScript.</li>
          <li>
            Unit tests for content, models, search and progress; component tests for the player,
            quizzes and practice tools.
          </li>
          <li>
            End-to-end tests of real journeys on desktop and phone sizes, including keyboard-only
            journeys, against the exact files that are deployed.
          </li>
          <li>
            Automated WCAG 2.2 AA checks with axe on every page type, in light and dark themes.
          </li>
          <li>
            Page-weight budgets: at most {PAGE_WEIGHT_BUDGETS.initialJs} KB of compressed JavaScript
            up front per page, {PAGE_WEIGHT_BUDGETS.pageChunk} KB for any single simulation, and{" "}
            {PAGE_WEIGHT_BUDGETS.html} KB of HTML.
          </li>
          <li>
            Lighthouse budgets on a phone profile: performance at least{" "}
            {pct(LIGHTHOUSE_CATEGORY_BUDGETS.performance)}, accessibility, best practices and SEO at
            least {pct(LIGHTHOUSE_CATEGORY_BUDGETS.accessibility)}, and layout shift under{" "}
            {LIGHTHOUSE_METRIC_BUDGETS["cumulative-layout-shift"].max}. Largest Contentful Paint
            (target {LIGHTHOUSE_METRIC_BUDGETS["largest-contentful-paint"].max / 1000} s) and
            blocking time (target {LIGHTHOUSE_METRIC_BUDGETS["total-blocking-time"].max} ms) are
            reported on every run; lab timings vary between runs, so they count through the
            performance score rather than failing on their own.
          </li>
        </ul>
        <p>The site is deployed only after all of these pass on the main branch.</p>

        <h2>Private by design</h2>
        <p>
          No analytics, no cookies and no third-party requests. Your colour theme and learning
          progress are kept in your own browser and never sent anywhere; answers you type when
          practising interview questions aren&rsquo;t stored at all.
        </p>

        <h2>Read more</h2>
        <ul>
          <li>
            <a href={doc("docs/ARCHITECTURE.md")}>Architecture</a> and{" "}
            <a href={doc("docs/adr/README.md")}>architecture decision records</a>
          </li>
          <li>
            <a href={doc("docs/PLAN.md")}>The plan</a>, with a log of every decision since
          </li>
          <li>
            <a href={doc("CONTRIBUTING.md")}>Contributing</a>, the{" "}
            <a href={doc("docs/AUTHORING.md")}>lesson authoring guide</a> and the{" "}
            <a href={doc("docs/SIMULATION-GUIDE.md")}>simulation guide</a>
          </li>
          <li>
            <a href={doc("SECURITY.md")}>Security policy</a>
          </li>
        </ul>
      </article>
    </div>
  );
}

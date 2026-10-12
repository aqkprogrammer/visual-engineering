import type { Metadata } from "next";
import { alternatesFor } from "@/lib/seo";
import { site } from "@/lib/site";

export const metadata: Metadata = {
  title: "About",
  description:
    "Why Visual Engineering exists, how its lessons are written and checked, and what its simulations do and do not claim.",
  alternates: alternatesFor("/about"),
};

export default function AboutPage() {
  return (
    <div className="mx-auto max-w-6xl px-4 pt-12 sm:px-6">
      <article className="prose-ve">
        <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">
          About Visual Engineering
        </h1>
        <p className="text-lg text-fg-muted">{site.tagline}</p>

        <h2>Why it exists</h2>
        <p>
          Most explanations of how systems work are static: a diagram, a paragraph, a list of bullet
          points. But the interesting behaviour of a system is dynamic — what happens when traffic
          doubles, when a server dies, when a cache goes cold. Visual Engineering shows that
          behaviour directly, and lets you change the inputs to see what follows.
        </p>

        <h2>How lessons are written</h2>
        <ul>
          <li>
            Every lesson follows the same arc: intuition, visual, simulation, technical detail,
            production reality, knowledge check.
          </li>
          <li>Jargon is defined before it is used, and acronyms are expanded on first use.</li>
          <li>Analogies are labelled as analogies, separate from technical facts.</li>
          <li>
            Claims are checked against official documentation and specifications, which each lesson
            cites.
          </li>
          <li>Every lesson shows the date it was last reviewed.</li>
        </ul>

        <h2>What the simulations claim — and don&rsquo;t</h2>
        <p>
          Simulations are deterministic <strong>teaching models</strong>. They run entirely in your
          browser from fixed inputs, so the same settings always produce the same result. They are
          deliberately simplified, they state their assumptions, and any numbers they show are
          illustrative — not benchmarks of real software or hardware. Nothing on this site calls a
          cloud provider, provisions resources, or sends your data to an AI model.
        </p>

        <h2>Privacy</h2>
        <p>
          There are no accounts, no analytics and no third-party trackers. Preferences such as the
          colour theme are stored only in your own browser.
        </p>

        <h2>Open source</h2>
        <p>
          The code and content are developed in public at{" "}
          <a href={site.repoUrl}>github.com/aqkprogrammer/visual-engineering</a>. Corrections, new
          lessons and simulation improvements are welcome as pull requests.
        </p>
      </article>
    </div>
  );
}

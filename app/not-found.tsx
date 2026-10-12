import type { Metadata } from "next";
import Link from "next/link";
import { getDomains } from "@/lib/content/catalog";

export const metadata: Metadata = {
  title: "Page not found",
  robots: { index: false },
};

export default function NotFound() {
  return (
    <div className="mx-auto max-w-3xl px-4 pt-20 sm:px-6">
      <p className="font-mono text-sm text-fg-subtle">404</p>
      <h1 className="mt-2 text-3xl font-semibold tracking-tight">This page doesn&rsquo;t exist</h1>
      <p className="mt-4 text-lg text-fg-muted">
        The link may be mistyped, or the lesson may not have been written yet. Try one of these
        instead.
      </p>
      <div className="mt-8 flex flex-wrap gap-3">
        <Link
          href="/"
          className="rounded-md bg-accent px-4 py-2.5 text-sm font-medium text-accent-fg hover:opacity-90"
        >
          Go home
        </Link>
        <Link
          href="/explore"
          className="rounded-md border border-border-strong px-4 py-2.5 text-sm font-medium hover:bg-surface"
        >
          Explore all topics
        </Link>
      </div>
      <h2 className="mt-14 font-mono text-xs tracking-wide text-fg-subtle uppercase">Domains</h2>
      <ul className="mt-3 grid gap-2 sm:grid-cols-2">
        {getDomains().map((d) => (
          <li key={d.id}>
            <Link href={`/${d.id}`} className="text-accent hover:underline">
              {d.title}
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}

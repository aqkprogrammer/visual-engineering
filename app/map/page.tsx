import type { Metadata } from "next";
import Link from "next/link";
import { KnowledgeMap } from "@/components/map/knowledge-map";
import { getDomains, getLearningPaths, getLessons } from "@/lib/content/catalog";
import { layoutMap, type MapLessonInput } from "@/lib/map/layout";
import { alternatesFor } from "@/lib/seo";

export const metadata: Metadata = {
  title: "Knowledge map",
  description:
    "Every lesson on one map: what builds on what, the learning paths through them, and — in your browser only — which ones you've completed and which you're ready for.",
  alternates: alternatesFor("/map"),
};

export default function MapPage() {
  const domains = getDomains();
  const lessons: MapLessonInput[] = getLessons().map((l) => {
    const domain = domains.find((d) => d.id === l.domain)!;
    return {
      id: l.id,
      title: l.title,
      domain: l.domain,
      moduleIndex: domain.modules.findIndex((m) => m.id === l.module),
      order: l.order,
      prerequisites: l.prerequisites,
    };
  });
  const layout = layoutMap(
    domains.map((d) => ({ id: d.id, title: d.title })),
    lessons,
    getLearningPaths().map((p) => ({
      slug: p.slug,
      title: p.title,
      lessons: p.steps.map((s) => s.lesson),
    })),
  );

  return (
    <div className="mx-auto max-w-6xl px-4 pt-12 sm:px-6">
      <header className="max-w-2xl space-y-4">
        <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">Knowledge map</h1>
        <p className="text-lg text-fg-muted">
          Every lesson on one map, row by domain. Arrows point from a lesson to the lessons that
          build on it; pick a learning path to see its route. Lessons you&rsquo;ve completed — and
          the ones you&rsquo;re ready for — are marked from the progress saved in this browser.
        </p>
      </header>
      <div className="mt-10">
        <KnowledgeMap layout={layout} lessons={lessons} />
      </div>
      <p className="mt-8 text-sm text-fg-muted">
        Prefer a list?{" "}
        <Link href="/explore" className="text-accent underline underline-offset-2">
          Explore
        </Link>{" "}
        has every lesson by domain, and{" "}
        <Link href="/paths" className="text-accent underline underline-offset-2">
          learning paths
        </Link>{" "}
        lists each route step by step.
      </p>
    </div>
  );
}

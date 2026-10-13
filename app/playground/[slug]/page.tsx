import { ArrowRight } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Breadcrumbs } from "@/components/layout/breadcrumbs";
import { References } from "@/components/lessons/lesson-footer";
import { Demo } from "@/components/visualizations/demo-registry";
import { hasDemo } from "@/components/visualizations/demo-slugs";
import { getLessonsByRef, getPlaygroundDemo, getPlaygroundDemos } from "@/lib/content/catalog";
import { alternatesFor } from "@/lib/seo";

export const dynamicParams = false;

export function generateStaticParams() {
  return getPlaygroundDemos().map((d) => ({ slug: d.slug }));
}

export async function generateMetadata({
  params,
}: PageProps<"/playground/[slug]">): Promise<Metadata> {
  const demo = getPlaygroundDemo((await params).slug);
  if (!demo) return {};
  return {
    title: demo.title,
    description: demo.summary,
    alternates: alternatesFor(`/playground/${demo.slug}`),
  };
}

export default async function PlaygroundDemoPage({ params }: PageProps<"/playground/[slug]">) {
  const demo = getPlaygroundDemo((await params).slug);
  if (!demo || !hasDemo(demo.slug)) notFound();
  const [lesson] = demo.lesson ? getLessonsByRef([demo.lesson]) : [];

  return (
    <div className="mx-auto max-w-5xl px-4 pt-8 sm:px-6">
      <header className="max-w-3xl space-y-4">
        <Breadcrumbs
          items={[{ label: "Playground", href: "/playground" }, { label: demo.title }]}
        />
        <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">{demo.title}</h1>
        <p className="text-lg text-fg-muted">{demo.summary}</p>
        {lesson && (
          <Link
            href={`/${lesson.id}`}
            className="inline-flex items-center gap-1.5 text-sm text-accent underline underline-offset-2"
          >
            Read the lesson: {lesson.title}
            <ArrowRight aria-hidden className="size-4" />
          </Link>
        )}
      </header>

      <Demo slug={demo.slug} />

      <div className="grid gap-12 lg:grid-cols-[1fr_18rem]">
        <section aria-labelledby="try-this">
          <h2 id="try-this" className="text-xl font-semibold">
            Try this
          </h2>
          <ol className="mt-4 space-y-3">
            {demo.tryThis.map((tip, i) => (
              <li key={tip} className="flex gap-3">
                <span className="mt-0.5 flex size-6 shrink-0 items-center justify-center rounded-full border border-border-strong font-mono text-xs text-fg-muted">
                  {i + 1}
                </span>
                <span className="leading-relaxed">{tip}</span>
              </li>
            ))}
          </ol>
        </section>
        <References references={demo.references} />
      </div>
    </div>
  );
}

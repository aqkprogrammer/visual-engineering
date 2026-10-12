import type { Metadata } from "next";
import { alternatesFor } from "@/lib/seo";
import { notFound } from "next/navigation";
import { Breadcrumbs } from "@/components/layout/breadcrumbs";
import { LessonListItem } from "@/components/lessons/lesson-meta";
import { getDomain, getDomains, getModuleLessons } from "@/lib/content/catalog";

export const dynamicParams = false;

export function generateStaticParams() {
  return getDomains().map((d) => ({ domain: d.id }));
}

export async function generateMetadata({ params }: PageProps<"/[domain]">): Promise<Metadata> {
  const domain = getDomain((await params).domain);
  if (!domain) return {};
  return {
    title: domain.title,
    description: domain.description,
    alternates: alternatesFor(`/${domain.id}`),
  };
}

export default async function DomainPage({ params }: PageProps<"/[domain]">) {
  const domain = getDomain((await params).domain);
  if (!domain) notFound();

  return (
    <div className="mx-auto max-w-6xl px-4 pt-8 sm:px-6">
      <header className="max-w-3xl space-y-5 border-b border-border pb-10">
        <Breadcrumbs items={[{ label: "Explore", href: "/explore" }, { label: domain.title }]} />
        <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">{domain.title}</h1>
        <p className="text-lg text-fg-muted">{domain.tagline}</p>
        <div className="space-y-4 leading-relaxed">
          {domain.intro.map((paragraph) => (
            <p key={paragraph.slice(0, 32)}>{paragraph}</p>
          ))}
        </div>
      </header>

      <div className="mt-10 space-y-14">
        {domain.modules.map((mod) => {
          const lessons = getModuleLessons(domain.id, mod.id);
          return (
            <section
              key={mod.id}
              aria-labelledby={`module-${mod.id}`}
              className="grid gap-6 lg:grid-cols-[16rem_1fr]"
            >
              <div>
                <h2 id={`module-${mod.id}`} className="text-lg font-semibold">
                  {mod.title}
                </h2>
                <p className="mt-1 text-sm text-fg-muted">{mod.summary}</p>
              </div>
              <div className="space-y-5">
                {lessons.length > 0 && (
                  <ul className="grid gap-3">
                    {lessons.map((lesson) => (
                      <LessonListItem key={lesson.id} lesson={lesson} />
                    ))}
                  </ul>
                )}
                {mod.plannedTopics.length > 0 && (
                  <div>
                    <h3 className="font-mono text-xs tracking-wide text-fg-subtle uppercase">
                      Planned topics
                      <span className="sr-only"> — not written yet</span>
                    </h3>
                    <ul className="mt-2 flex flex-wrap gap-2">
                      {mod.plannedTopics.map((topic) => (
                        <li
                          key={topic}
                          className="rounded-md border border-dashed border-border px-2.5 py-1 text-sm text-fg-subtle"
                        >
                          {topic}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            </section>
          );
        })}
      </div>
    </div>
  );
}

import type { Metadata } from "next";
import { alternatesFor } from "@/lib/seo";
import { notFound } from "next/navigation";
import { Breadcrumbs } from "@/components/layout/breadcrumbs";
import { KnowledgeCheck } from "@/components/lessons/knowledge-check";
import { KeyTerms, LessonIncidents, LessonPaths } from "@/components/lessons/lesson-context";
import { LessonPager, References, RelatedLessons } from "@/components/lessons/lesson-footer";
import { LessonMetaRow } from "@/components/lessons/lesson-meta";
import { TableOfContents } from "@/components/lessons/table-of-contents";
import { InterviewSection } from "@/components/interview/interview-section";
import { LessonCompletion } from "@/components/progress/lesson-completion";
import {
  getAdjacentLessons,
  getDomain,
  getLesson,
  getLessonIncidents,
  getLessonPaths,
  getLessons,
  getLessonsByRef,
  getLessonTerms,
} from "@/lib/content/catalog";
import { loadLessonBody } from "@/lib/content/bodies";

export const dynamicParams = false;

export function generateStaticParams() {
  return getLessons().map((l) => ({ domain: l.domain, lesson: l.slug }));
}

export async function generateMetadata({
  params,
}: PageProps<"/[domain]/[lesson]">): Promise<Metadata> {
  const { domain, lesson: slug } = await params;
  const lesson = getLesson(domain, slug);
  if (!lesson) return {};
  return {
    title: lesson.title,
    description: lesson.description,
    alternates: alternatesFor(`/${lesson.id}`),
    openGraph: { type: "article", title: lesson.title, description: lesson.description },
  };
}

export default async function LessonPage({ params }: PageProps<"/[domain]/[lesson]">) {
  const { domain: domainId, lesson: slug } = await params;
  const lesson = getLesson(domainId, slug);
  const domain = getDomain(domainId);
  if (!lesson || !domain) notFound();

  const Body = await loadLessonBody(lesson);
  const lessonModule = domain.modules.find((m) => m.id === lesson.module);
  const prerequisites = getLessonsByRef(lesson.prerequisites);
  const related = getLessonsByRef(lesson.related);
  const { previous, next } = getAdjacentLessons(lesson);
  const pathPositions = getLessonPaths(lesson);
  const terms = getLessonTerms(lesson);
  const incidents = getLessonIncidents(lesson);

  return (
    <div className="mx-auto max-w-6xl px-4 pt-8 sm:px-6 lg:grid lg:grid-cols-[minmax(0,1fr)_14rem] lg:gap-14">
      <article className="min-w-0">
        <header className="space-y-5 border-b border-border pb-8">
          <Breadcrumbs
            items={[
              { label: "Explore", href: "/explore" },
              { label: domain.title, href: `/${domain.id}` },
              { label: lesson.title },
            ]}
          />
          <div className="space-y-3">
            {lessonModule && (
              <p className="font-mono text-xs tracking-wide text-fg-subtle uppercase">
                {lessonModule.title}
              </p>
            )}
            <h1 className="text-3xl leading-tight font-semibold tracking-tight text-balance sm:text-4xl">
              {lesson.title}
            </h1>
            <p className="max-w-[62ch] text-lg text-fg-muted">{lesson.description}</p>
          </div>
          <LessonMetaRow lesson={lesson} />
          {lesson.status === "draft" && (
            <p className="inline-block rounded-md border border-warn/60 px-3 py-1 text-sm">
              Draft — visible only in local development.
            </p>
          )}
        </header>

        {prerequisites.length > 0 && (
          <div className="mt-8">
            <RelatedLessons title="Before you start" lessons={prerequisites} />
          </div>
        )}

        <div className="prose-ve mt-10">
          <Body />
        </div>

        <div className="max-w-[70ch]">
          <InterviewSection items={lesson.interview} />
        </div>

        {lesson.quiz.length > 0 && (
          <div className="max-w-[70ch]">
            <KnowledgeCheck questions={lesson.quiz} lessonId={lesson.id} />
          </div>
        )}

        <div className="mt-10 max-w-[70ch]">
          <LessonCompletion lessonId={lesson.id} />
        </div>

        <div className="mt-16 max-w-[70ch] space-y-14 border-t border-border pt-10">
          <LessonPaths positions={pathPositions} />
          <LessonIncidents incidents={incidents} />
          <KeyTerms terms={terms} />
          <References references={lesson.references} />
          <RelatedLessons title="Related lessons" lessons={related} />
          <LessonPager previous={previous} next={next} />
        </div>
      </article>

      <aside className="hidden lg:block">
        <div className="sticky top-24 max-h-[calc(100dvh-8rem)] overflow-y-auto pb-8">
          <TableOfContents headings={lesson.headings} />
        </div>
      </aside>
    </div>
  );
}

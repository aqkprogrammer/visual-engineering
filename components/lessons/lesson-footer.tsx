import { ArrowLeft, ArrowRight, ArrowUpRight } from "lucide-react";
import Link from "next/link";
import type { Lesson, Reference } from "@/lib/content/schema";
import { LessonListItem } from "./lesson-meta";

const KIND_LABEL: Record<Reference["kind"], string> = {
  "official-docs": "Official docs",
  specification: "Specification",
  paper: "Paper",
  book: "Book",
  article: "Article",
};

export function References({ references }: { references: Reference[] }) {
  return (
    <section aria-labelledby="references" className="space-y-4">
      <h2 id="references" className="text-xl font-semibold">
        Further reading
      </h2>
      <ul className="space-y-3">
        {references.map((ref) => (
          <li key={ref.url}>
            <a
              href={ref.url}
              className="group inline-flex items-start gap-1.5 text-accent hover:underline"
            >
              <span>{ref.title}</span>
              <ArrowUpRight aria-hidden className="mt-1 size-3.5 shrink-0" />
            </a>
            <span className="block text-sm text-fg-subtle">
              {ref.publisher} · {KIND_LABEL[ref.kind]}
            </span>
          </li>
        ))}
      </ul>
    </section>
  );
}

export function RelatedLessons({ lessons, title }: { lessons: Lesson[]; title: string }) {
  if (lessons.length === 0) return null;
  const id = title.toLowerCase().replace(/\W+/g, "-");
  return (
    <section aria-labelledby={id} className="space-y-4">
      <h2 id={id} className="text-xl font-semibold">
        {title}
      </h2>
      <ul className="grid gap-3">
        {lessons.map((lesson) => (
          <LessonListItem key={lesson.id} lesson={lesson} />
        ))}
      </ul>
    </section>
  );
}

export function LessonPager({ previous, next }: { previous?: Lesson; next?: Lesson }) {
  if (!previous && !next) return null;
  return (
    <nav aria-label="Previous and next lessons" className="grid gap-3 sm:grid-cols-2">
      {previous ? (
        <Link
          href={`/${previous.id}`}
          className="rounded-lg border border-border px-5 py-4 hover:bg-surface"
        >
          <span className="flex items-center gap-1.5 text-xs text-fg-subtle">
            <ArrowLeft aria-hidden className="size-3.5" /> Previous
          </span>
          <span className="mt-1 block font-medium">{previous.title}</span>
        </Link>
      ) : (
        <span />
      )}
      {next && (
        <Link
          href={`/${next.id}`}
          className="rounded-lg border border-border px-5 py-4 text-right hover:bg-surface"
        >
          <span className="flex items-center justify-end gap-1.5 text-xs text-fg-subtle">
            Next <ArrowRight aria-hidden className="size-3.5" />
          </span>
          <span className="mt-1 block font-medium">{next.title}</span>
        </Link>
      )}
    </nav>
  );
}

import { ArrowRight } from "lucide-react";
import Link from "next/link";
import { INTERVIEW_HEADING_ID } from "@/lib/content/headings";
import type { InterviewItem } from "@/lib/content/schema";
import { InterviewCard } from "./interview-card";

/** The interview questions at the end of a lesson, rendered from the lesson's `interview.ts`. */
export function InterviewSection({ items }: { items: InterviewItem[] }) {
  if (items.length === 0) return null;
  return (
    <section aria-labelledby={INTERVIEW_HEADING_ID} className="mt-14 space-y-4">
      <h2 id={INTERVIEW_HEADING_ID} className="scroll-mt-20 text-2xl font-semibold tracking-tight">
        Interview questions
      </h2>
      <p className="text-fg-muted">
        Answer out loud before opening each one. Every answer comes with the rubric an interviewer
        would use, so you can judge your own.
      </p>
      <div className="space-y-3">
        {items.map((item) => (
          <InterviewCard key={item.id} item={item} />
        ))}
      </div>
      <Link
        href="/interview"
        className="inline-flex items-center gap-1.5 text-sm text-accent hover:underline"
      >
        Practise with self-grading in the interview hub
        <ArrowRight aria-hidden className="size-3.5" />
      </Link>
    </section>
  );
}

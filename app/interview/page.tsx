import type { Metadata } from "next";
import { InterviewHub } from "@/components/interview/interview-hub";
import { getInterviewEntries } from "@/lib/content/catalog";
import { alternatesFor } from "@/lib/seo";

export const metadata: Metadata = {
  title: "Interview questions",
  description:
    "Engineering interview questions with model answers and a published rubric. Practise one, then grade yourself the way an interviewer would — no account needed.",
  alternates: alternatesFor("/interview"),
};

export default function InterviewPage() {
  const entries = getInterviewEntries();
  return (
    <div className="mx-auto max-w-3xl px-4 pt-12 sm:px-6">
      <header className="space-y-4">
        <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">Interview questions</h1>
        <p className="text-lg text-fg-muted">
          {entries.length} questions from the lessons, from junior to senior. Each has a model
          answer and the rubric used to judge it: what every good answer covers, what makes one
          strong, and the red flags. Nothing is hidden, so you can grade yourself the same way.
        </p>
      </header>
      <div className="mt-10">
        <InterviewHub entries={entries} />
      </div>
    </div>
  );
}

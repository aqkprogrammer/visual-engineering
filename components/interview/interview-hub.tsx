"use client";

import { Shuffle } from "lucide-react";
import Link from "next/link";
import { useEffect, useId, useMemo, useRef, useState } from "react";
import type { InterviewEntry } from "@/lib/content/catalog";
import {
  INTERVIEW_KINDS,
  INTERVIEW_LEVELS,
  type InterviewKind,
  type InterviewLevel,
} from "@/lib/interview/taxonomy";
import { InterviewCard, KIND_LABEL, LEVEL_LABEL } from "./interview-card";
import { PracticePanel } from "./practice-panel";

type Filters = { domain: string; level: InterviewLevel | ""; kind: InterviewKind | "" };

function FilterSelect({
  label,
  value,
  onChange,
  options,
}: {
  label: string;
  value: string;
  onChange(value: string): void;
  options: { value: string; label: string }[];
}) {
  const id = useId();
  return (
    <div className="flex flex-col gap-1">
      <label htmlFor={id} className="text-xs font-medium text-fg-muted">
        {label}
      </label>
      <select
        id={id}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="rounded-md border border-border-strong bg-bg px-2.5 py-1.5 text-sm"
      >
        <option value="">All</option>
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
    </div>
  );
}

export function InterviewHub({ entries }: { entries: InterviewEntry[] }) {
  const [filters, setFilters] = useState<Filters>({ domain: "", level: "", kind: "" });
  const [practising, setPractising] = useState<string | null>(null);
  const practiceHeading = useRef<HTMLHeadingElement>(null);
  const focusPending = useRef(false);

  const domains = useMemo(() => {
    const seen = new Map<string, string>();
    for (const e of entries) seen.set(e.lesson.domain, e.lesson.domainTitle);
    return [...seen].map(([value, label]) => ({ value, label }));
  }, [entries]);

  const visible = entries.filter(
    (e) =>
      (!filters.domain || e.lesson.domain === filters.domain) &&
      (!filters.level || e.item.level === filters.level) &&
      (!filters.kind || e.item.kind === filters.kind),
  );
  const current = entries.find((e) => e.item.id === practising);

  const practise = (id: string) => {
    focusPending.current = true;
    setPractising(id);
  };

  const practiseRandom = () => {
    const pool = visible.filter((e) => e.item.id !== practising);
    const pick = pool[Math.floor(Math.random() * pool.length)] ?? visible[0];
    if (pick) practise(pick.item.id);
  };

  // Move focus (and so the scroll position) to the new question, for every kind of user.
  useEffect(() => {
    if (focusPending.current && practiceHeading.current) {
      focusPending.current = false;
      practiceHeading.current.focus();
    }
  }, [practising]);

  // A link such as /interview/#cache-stampede opens that question.
  useEffect(() => {
    const id = decodeURIComponent(window.location.hash.slice(1));
    if (id) document.getElementById(id)?.setAttribute("open", "");
  }, []);

  return (
    <div className="space-y-10">
      {current ? (
        <PracticePanel
          key={current.item.id}
          entry={current}
          onNext={practiseRandom}
          headingRef={practiceHeading}
        />
      ) : (
        <section className="flex flex-wrap items-center justify-between gap-4 rounded-xl border border-border-strong p-5 sm:p-6">
          <div className="space-y-1">
            <h2 className="font-semibold">Practise with self-grading</h2>
            <p className="text-sm text-fg-muted">
              Answer a question, then tick off the rubric to see how you did.
            </p>
          </div>
          <button
            type="button"
            onClick={practiseRandom}
            disabled={visible.length === 0}
            className="inline-flex items-center gap-1.5 rounded-md bg-accent px-4 py-2 text-sm font-medium text-accent-fg hover:opacity-90 disabled:opacity-40"
          >
            <Shuffle aria-hidden className="size-4" /> Random question
          </button>
        </section>
      )}

      <section aria-labelledby="all-questions" className="space-y-5">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <h2 id="all-questions" className="text-xl font-semibold">
            All questions
          </h2>
          <div className="flex flex-wrap gap-3">
            <FilterSelect
              label="Domain"
              value={filters.domain}
              onChange={(domain) => setFilters((f) => ({ ...f, domain }))}
              options={domains}
            />
            <FilterSelect
              label="Level"
              value={filters.level}
              onChange={(level) => setFilters((f) => ({ ...f, level: level as Filters["level"] }))}
              options={INTERVIEW_LEVELS.map((l) => ({ value: l, label: LEVEL_LABEL[l] }))}
            />
            <FilterSelect
              label="Kind"
              value={filters.kind}
              onChange={(kind) => setFilters((f) => ({ ...f, kind: kind as Filters["kind"] }))}
              options={INTERVIEW_KINDS.map((k) => ({ value: k, label: KIND_LABEL[k] }))}
            />
          </div>
        </div>
        <p aria-live="polite" className="text-sm text-fg-muted">
          {visible.length === entries.length
            ? `${entries.length} questions`
            : `${visible.length} of ${entries.length} questions`}
        </p>
        <div className="space-y-3">
          {visible.map(({ item, lesson }) => (
            <InterviewCard
              key={item.id}
              id={item.id}
              item={item}
              footer={
                <div className="flex flex-wrap items-center gap-x-5 gap-y-2 border-t border-border pt-4 text-sm">
                  <button
                    type="button"
                    onClick={() => practise(item.id)}
                    className="rounded-md border border-border-strong px-3 py-1.5 text-fg hover:bg-surface"
                  >
                    Practise this question
                  </button>
                  <Link href={`/${lesson.id}`} className="text-accent hover:underline">
                    From: {lesson.title}
                  </Link>
                </div>
              }
            />
          ))}
        </div>
      </section>
    </div>
  );
}

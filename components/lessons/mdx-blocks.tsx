import { CircleCheck, CircleX, FlaskConical, Info, Lightbulb, TriangleAlert } from "lucide-react";
import type { ReactNode } from "react";
import { cn } from "@/lib/utils/cn";

/** The one-sentence definition that opens every lesson. */
export function Definition({ children }: { children: ReactNode }) {
  return (
    <div className="border-l-2 border-accent pl-5 text-lg leading-relaxed text-fg [&_p]:m-0">
      {children}
    </div>
  );
}

/** An everyday analogy, visibly marked so it is never confused with a technical fact. */
export function Analogy({ children }: { children: ReactNode }) {
  return (
    <aside
      aria-label="Analogy"
      className="rounded-lg border border-border bg-surface px-5 py-4 [&_p]:m-0 [&_p+p]:mt-3"
    >
      <p className="mb-2! flex items-center gap-2 text-xs font-medium tracking-wide text-fg-subtle uppercase">
        <Lightbulb aria-hidden className="size-4" />
        Analogy — not literal
      </p>
      {children}
    </aside>
  );
}

const CALLOUTS = {
  note: { icon: Info, label: "Note", tone: "border-border" },
  warning: { icon: TriangleAlert, label: "Watch out", tone: "border-warn/60" },
  illustrative: { icon: FlaskConical, label: "Illustrative numbers", tone: "border-data/60" },
} as const;

export function Callout({
  kind = "note",
  title,
  children,
}: {
  kind?: keyof typeof CALLOUTS;
  title?: string;
  children: ReactNode;
}) {
  const { icon: Icon, label, tone } = CALLOUTS[kind];
  return (
    <aside
      aria-label={title ?? label}
      className={cn("rounded-lg border bg-surface px-5 py-4 [&_p]:m-0 [&_p+p]:mt-3", tone)}
    >
      <p className="mb-2! flex items-center gap-2 text-sm font-semibold">
        <Icon aria-hidden className="size-4 shrink-0" />
        <span>
          {title ?? label}
          {title && <span className="font-normal text-fg-subtle"> · {label}</span>}
        </span>
      </p>
      {children}
    </aside>
  );
}

/** Numbered walk-through. Wrap a Markdown ordered list. */
export function Steps({ children }: { children: ReactNode }) {
  return (
    <div className="[&_li]:relative [&_li]:pl-10 [&_li]:[counter-increment:step] [&_li]:before:absolute [&_li]:before:top-0.5 [&_li]:before:left-0 [&_li]:before:flex [&_li]:before:size-6 [&_li]:before:items-center [&_li]:before:justify-center [&_li]:before:rounded-full [&_li]:before:border [&_li]:before:border-border-strong [&_li]:before:font-mono [&_li]:before:text-xs [&_li]:before:text-fg-muted [&_li]:before:content-[counter(step)] [&_li+li]:mt-4 [&_ol]:list-none [&_ol]:pl-0 [&_ol]:[counter-reset:step]">
      {children}
    </div>
  );
}

export function TradeOffs({ use, avoid }: { use: string[]; avoid: string[] }) {
  return (
    <div className="grid gap-4 sm:grid-cols-2">
      <section aria-label="When to use it" className="rounded-lg border border-border p-5">
        <h3 className="mt-0! flex items-center gap-2 text-base!">
          <CircleCheck aria-hidden className="size-4 text-ok" />
          Use it when
        </h3>
        <ul className="mt-3 space-y-2 text-[0.97rem]">
          {use.map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ul>
      </section>
      <section aria-label="When to avoid it" className="rounded-lg border border-border p-5">
        <h3 className="mt-0! flex items-center gap-2 text-base!">
          <CircleX aria-hidden className="size-4 text-fail" />
          Think twice when
        </h3>
        <ul className="mt-3 space-y-2 text-[0.97rem]">
          {avoid.map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ul>
      </section>
    </div>
  );
}

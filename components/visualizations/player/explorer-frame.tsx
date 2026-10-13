import { FlaskConical } from "lucide-react";
import { useId, type ReactNode } from "react";

/**
 * Chrome for interactive explorers that aren't time-based (no playback): title, "teaching model"
 * badge and assumptions, matching SimulationPlayer.
 */
export function ExplorerFrame({
  title,
  assumptions,
  children,
}: {
  title: string;
  assumptions: string[];
  children: ReactNode;
}) {
  const id = useId();
  return (
    <section
      aria-labelledby={`${id}-title`}
      className="not-prose relative my-10 overflow-hidden rounded-xl border border-border bg-bg"
    >
      <header className="flex flex-wrap items-center justify-between gap-3 border-b border-border px-4 py-3">
        <h3 id={`${id}-title`} className="text-sm font-semibold">
          {title}
        </h3>
        <span className="inline-flex items-center gap-1.5 rounded-full border border-data/60 px-2.5 py-0.5 font-mono text-[11px] text-fg-muted">
          <FlaskConical aria-hidden className="size-3.5" />
          Teaching model
        </span>
      </header>
      {children}
      <details className="border-t border-border px-4 py-3 text-sm">
        <summary className="cursor-pointer font-mono text-[11px] tracking-wide text-fg-subtle uppercase">
          Assumptions
        </summary>
        <ul className="mt-2 list-disc space-y-1.5 pl-4 text-fg-muted">
          {assumptions.map((a) => (
            <li key={a}>{a}</li>
          ))}
        </ul>
      </details>
    </section>
  );
}

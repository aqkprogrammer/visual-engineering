import type { Heading } from "@/lib/content/schema";
import { cn } from "@/lib/utils/cn";

export function TableOfContents({ headings }: { headings: Heading[] }) {
  if (headings.length === 0) return null;
  return (
    <nav aria-labelledby="toc-heading" className="text-sm">
      <h2
        id="toc-heading"
        className="mb-3 font-mono text-xs tracking-wide text-fg-subtle uppercase"
      >
        On this page
      </h2>
      <ol className="space-y-1.5 border-l border-border">
        {headings.map((h) => (
          <li key={h.id}>
            <a
              href={`#${h.id}`}
              className={cn(
                "-ml-px block border-l border-transparent py-0.5 text-fg-muted hover:border-fg-muted hover:text-fg",
                h.depth === 2 ? "pl-4" : "pl-7",
              )}
            >
              {h.text}
            </a>
          </li>
        ))}
      </ol>
    </nav>
  );
}

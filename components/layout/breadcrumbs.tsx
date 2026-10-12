import { ChevronRight } from "lucide-react";
import Link from "next/link";

export type Crumb = { label: string; href?: string };

/** The last crumb is the current page and is never a link. */
export function Breadcrumbs({ items }: { items: Crumb[] }) {
  return (
    <nav aria-label="Breadcrumb" className="text-sm text-fg-subtle">
      <ol className="flex flex-wrap items-center gap-1">
        {items.map((item, index) => {
          const isLast = index === items.length - 1;
          return (
            <li key={`${item.label}-${index}`} className="flex items-center gap-1">
              {isLast || !item.href ? (
                <span
                  aria-current={isLast ? "page" : undefined}
                  className={isLast ? "text-fg-muted" : undefined}
                >
                  {item.label}
                </span>
              ) : (
                <Link href={item.href} className="rounded hover:text-fg">
                  {item.label}
                </Link>
              )}
              {!isLast && <ChevronRight aria-hidden className="size-3.5" />}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}

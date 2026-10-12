import { cn } from "@/lib/utils/cn";

/** Brand mark: three connected nodes — a request fanning out — drawn with the diagram linework. */
export function LogoMark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" aria-hidden className={cn("size-6", className)} fill="none">
      <path d="M6 12 L18 5.5 M6 12 L18 18.5" className="stroke-border-strong" strokeWidth="1.5" />
      <circle cx="6" cy="12" r="3" className="fill-accent" />
      <circle cx="18" cy="5.5" r="2.5" className="fill-bg stroke-fg" strokeWidth="1.5" />
      <circle cx="18" cy="18.5" r="2.5" className="fill-bg stroke-fg" strokeWidth="1.5" />
    </svg>
  );
}

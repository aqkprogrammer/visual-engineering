import { ArrowUpRight } from "lucide-react";
import Link from "next/link";
import { site } from "@/lib/site";
import { LogoMark } from "./logo";
import { ThemeToggle } from "./theme-toggle";

const NAV = [
  { href: "/explore", label: "Explore" },
  { href: "/about", label: "About" },
] as const;

export function SiteHeader() {
  return (
    <header className="sticky top-0 z-40 border-b border-border bg-bg">
      <div className="mx-auto flex h-14 max-w-6xl items-center gap-3 px-4 sm:px-6">
        <Link
          href="/"
          className="flex shrink-0 items-center gap-2 rounded-md font-medium tracking-tight whitespace-nowrap"
        >
          <LogoMark />
          <span>
            Visual<span className="text-fg-muted"> Engineering</span>
          </span>
        </Link>

        <nav aria-label="Primary" className="ml-auto flex items-center text-sm sm:gap-1">
          {NAV.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="rounded-md px-2 py-1.5 text-fg-muted transition-colors hover:bg-surface-2 hover:text-fg sm:px-2.5"
            >
              {item.label}
            </Link>
          ))}
          <a
            href={site.repoUrl}
            className="hidden items-center gap-1 rounded-md px-2.5 py-1.5 text-fg-muted transition-colors hover:bg-surface-2 hover:text-fg sm:inline-flex"
          >
            GitHub
            <ArrowUpRight aria-hidden className="size-3.5" />
          </a>
          <ThemeToggle />
        </nav>
      </div>
    </header>
  );
}

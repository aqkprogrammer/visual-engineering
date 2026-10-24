import { ArrowUpRight, Search } from "lucide-react";
import Link from "next/link";
import { site } from "@/lib/site";
import { LogoMark } from "./logo";
import { MobileNav } from "./mobile-nav";
import { NAV_ITEMS } from "./nav-items";
import { ThemeToggle } from "./theme-toggle";

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

        <nav aria-label="Primary" className="ml-auto flex items-center gap-1 text-sm">
          {NAV_ITEMS.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="hidden rounded-md px-2.5 py-1.5 text-fg-muted transition-colors hover:bg-surface-2 hover:text-fg lg:inline-block"
            >
              {item.label}
            </Link>
          ))}
          <a
            href={site.repoUrl}
            className="hidden items-center gap-1 rounded-md px-2.5 py-1.5 text-fg-muted transition-colors hover:bg-surface-2 hover:text-fg lg:inline-flex"
          >
            GitHub
            <ArrowUpRight aria-hidden className="size-3.5" />
          </a>
          <Link
            href="/search"
            title="Search (⌘K or Ctrl+K)"
            aria-keyshortcuts="Meta+K Control+K"
            className="inline-flex size-9 items-center justify-center rounded-md text-fg-muted transition-colors hover:bg-surface-2 hover:text-fg"
          >
            <Search aria-hidden className="size-[18px]" strokeWidth={1.75} />
            <span className="sr-only">Search</span>
          </Link>
          <ThemeToggle />
          <MobileNav />
        </nav>
      </div>
    </header>
  );
}

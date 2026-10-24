import Link from "next/link";
import { site } from "@/lib/site";
import { LogoMark } from "./logo";

export function SiteFooter() {
  return (
    <footer className="mt-24 border-t border-border">
      <div className="mx-auto grid max-w-6xl gap-8 px-4 py-10 text-sm sm:grid-cols-[1fr_auto] sm:px-6">
        <div className="space-y-2">
          <div className="flex items-center gap-2 font-medium">
            <LogoMark className="size-5" />
            {site.name}
          </div>
          <p className="max-w-md text-fg-muted">{site.tagline}</p>
          <p className="text-fg-subtle">
            No accounts, no tracking. Simulations are teaching models, not benchmarks.
          </p>
        </div>
        <nav
          aria-label="Footer"
          className="flex flex-wrap gap-x-6 gap-y-2 text-fg-muted sm:justify-end"
        >
          <Link href="/explore" className="hover:text-fg">
            Explore
          </Link>
          <Link href="/paths" className="hover:text-fg">
            Learning paths
          </Link>
          <Link href="/map" className="hover:text-fg">
            Knowledge map
          </Link>
          <Link href="/playground" className="hover:text-fg">
            Playground
          </Link>
          <Link href="/interview" className="hover:text-fg">
            Interview questions
          </Link>
          <Link href="/incidents" className="hover:text-fg">
            Incident lab
          </Link>
          <Link href="/glossary" className="hover:text-fg">
            Glossary
          </Link>
          <Link href="/search" className="hover:text-fg">
            Search
          </Link>
          <Link href="/about" className="hover:text-fg">
            About
          </Link>
          <Link href="/how-it-works" className="hover:text-fg">
            How it works
          </Link>
          <a href={site.repoUrl} className="hover:text-fg">
            Source on GitHub
          </a>
        </nav>
      </div>
    </footer>
  );
}

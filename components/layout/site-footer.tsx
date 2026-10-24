import Link from "next/link";
import { site } from "@/lib/site";
import { LogoMark } from "./logo";

type FooterLink = { href: string; label: string; external?: boolean };

const GROUPS: { title: string; links: FooterLink[] }[] = [
  {
    title: "Learn",
    links: [
      { href: "/explore", label: "Explore" },
      { href: "/paths", label: "Learning paths" },
      { href: "/map", label: "Knowledge map" },
      { href: "/playground", label: "Playground" },
      { href: "/glossary", label: "Glossary" },
    ],
  },
  {
    title: "Practise",
    links: [
      { href: "/interview", label: "Interview questions" },
      { href: "/incidents", label: "Incident lab" },
      { href: "/search", label: "Search" },
    ],
  },
  {
    title: "Project",
    links: [
      { href: "/about", label: "About" },
      { href: "/how-it-works", label: "How it works" },
      { href: site.repoUrl, label: "Source on GitHub", external: true },
    ],
  },
];

export function SiteFooter() {
  return (
    <footer className="mt-24 border-t border-border">
      <div className="mx-auto grid max-w-6xl gap-10 px-4 py-10 text-sm sm:px-6 md:grid-cols-[minmax(0,20rem)_1fr]">
        <div className="space-y-2">
          <div className="flex items-center gap-2 font-medium">
            <LogoMark className="size-5" />
            {site.name}
          </div>
          <p className="text-fg-muted">{site.tagline}</p>
          <p className="text-fg-subtle">
            No accounts, no tracking. Simulations are teaching models, not benchmarks.
          </p>
        </div>
        <nav
          aria-label="Footer"
          className="grid grid-cols-2 gap-x-6 gap-y-8 sm:grid-cols-3 md:gap-x-16 md:justify-self-end"
        >
          {GROUPS.map((group) => (
            <div key={group.title} className="space-y-3">
              <p
                id={`footer-${group.title.toLowerCase()}`}
                className="font-mono text-[11px] tracking-wide text-fg-subtle uppercase"
              >
                {group.title}
              </p>
              <ul aria-labelledby={`footer-${group.title.toLowerCase()}`} className="space-y-2">
                {group.links.map((link) => (
                  <li key={link.href}>
                    {link.external ? (
                      <a href={link.href} className="text-fg-muted hover:text-fg">
                        {link.label}
                      </a>
                    ) : (
                      <Link href={link.href} className="text-fg-muted hover:text-fg">
                        {link.label}
                      </Link>
                    )}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </nav>
      </div>
    </footer>
  );
}

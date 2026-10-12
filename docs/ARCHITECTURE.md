# Architecture

This describes what is implemented today. Planned components are marked as such; the reasoning behind each choice lives in the [ADRs](adr/).

## Overview

```
                 build time (Node)                                     browser
┌──────────────────────────────────────────────────────┐    ┌──────────────────────────────┐
│ content/domains.ts ─┐                                │    │ Prerendered HTML per route    │
│ content/lessons/*/  ├─▶ scripts/content.ts           │    │  • lesson prose + diagrams    │
│   meta.ts           │     ├ Zod schema validation    │    │  • TOC, breadcrumbs, metadata │
│   index.mdx ────────┘     ├ cross-reference checks   │    │                               │
│                           ├ reading time + headings  │    │ Hydrated islands only where   │
│                           └▶ content/.generated/     │    │ interaction is needed:        │
│                               registry.ts            │    │  • theme toggle (today)       │
│                                    │                 │    │  • simulation player (Ph. 2)  │
│ next build (output: "export") ◀────┘                 │    │  • search (Phase 4)           │
│   MDX → React (remark-gfm, rehype-slug, Shiki)       │──▶ │                               │
│   generateStaticParams for every domain and lesson   │out/│ No server, no tracking,       │
└──────────────────────────────────────────────────────┘    │ no external requests          │
                                                            └──────────────────────────────┘
```

## Content pipeline

| Step                     | Code                                                    | Notes                                                                                                                                            |
| ------------------------ | ------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------ |
| Schemas                  | `lib/content/schema.ts`                                 | Domains, modules, lessons, references. `defineLesson` / `defineDomains` give authors type checking.                                              |
| Discovery and validation | `lib/content/load.ts`, `lib/content/validate.ts`        | Every issue reported at once; exits non-zero in CI.                                                                                              |
| MDX analysis             | `lib/content/mdx-text.ts`                               | Word count, reading time, h2/h3 headings with `github-slugger` ids (identical to `rehype-slug`). Plain text is kept for the future search index. |
| Generated registry       | `scripts/content.ts` → `content/.generated/registry.ts` | Git-ignored; regenerated before `dev`, `build`, `test` and `typecheck`.                                                                          |
| Runtime queries          | `lib/content/catalog.ts`                                | `server-only`; curriculum ordering, previous/next, related lessons. Drafts are visible only in development.                                      |

## Routing

All routes are prerendered. Dynamic segments set `dynamicParams = false`, so unknown paths fall through to `app/not-found.tsx` (served as `404.html` with a 404 status).

| Route                         | Source                                                                                        |
| ----------------------------- | --------------------------------------------------------------------------------------------- |
| `/`                           | `app/page.tsx`                                                                                |
| `/explore`                    | `app/explore/page.tsx`                                                                        |
| `/[domain]`                   | `app/[domain]/page.tsx` — the domain intro, its modules, published lessons and planned topics |
| `/[domain]/[lesson]`          | `app/[domain]/[lesson]/page.tsx`                                                              |
| `/about`                      | `app/about/page.tsx`                                                                          |
| `/sitemap.xml`, `/robots.txt` | `force-static`; the sitemap is empty until `NEXT_PUBLIC_SITE_URL` is set                      |

Domain ids share the top-level URL namespace with static routes, so `RESERVED_SEGMENTS` in the schema is enforced by validation.

## Design system

- Tokens are CSS custom properties in `app/globals.css`, defined in OKLCH for dark (default) and light themes and mapped into Tailwind with `@theme inline`.
- `tests/unit/contrast.test.ts` parses the stylesheet and checks WCAG ratios for every text and UI token pair in both themes.
- The theme is applied before first paint by a small inline script (`lib/theme.ts`) that tolerates blocked storage. The toggle cycles system → dark → light.
- Global `prefers-reduced-motion` handling neutralises CSS transitions and animations; the simulation player will add its own step mode in Phase 2.
- Fonts (IBM Plex Sans / Mono) are downloaded at build time and self-hosted.

## Quality gates

| Gate                                                                                                              | Where               |
| ----------------------------------------------------------------------------------------------------------------- | ------------------- |
| ESLint (Next core-web-vitals, TypeScript, React hooks, jsx-a11y), zero warnings                                   | `pnpm lint`         |
| Prettier (MDX excluded, see ADR-0002)                                                                             | `pnpm format:check` |
| Strict TypeScript                                                                                                 | `pnpm typecheck`    |
| Unit and component tests                                                                                          | `pnpm test`         |
| Static build                                                                                                      | `pnpm build`        |
| E2E journeys, 404s, keyboard, theme, no horizontal scroll; axe WCAG 2.2 A/AA in both themes on desktop and mobile | `pnpm test:e2e`     |
| Production dependency audit                                                                                       | CI                  |

## Security notes

- MDX compiles to code. Only reviewed repository content is compiled; nothing renders MDX or HTML from user input.
- CI runs with `contents: read`, actions are pinned by commit SHA, and checkouts do not persist credentials.
- The static export cannot set HTTP headers, and GitHub Pages does not allow custom headers (ADR-0009).

## Deployment

`.github/workflows/deploy.yml` deploys to GitHub Pages only after CI passes on `main`. The build reads the origin and base path from the Pages configuration (`NEXT_PUBLIC_SITE_URL`, `NEXT_PUBLIC_BASE_PATH`), and `trailingSlash: true` emits `route/index.html` for every page.

## Not yet built

The simulation engine and player (Phase 2), quizzes, search, learning paths, glossary, interview hub, progress tracking (Phase 4), Lighthouse budgets in CI and the contributor guide (Phase 5).

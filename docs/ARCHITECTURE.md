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

| Step                     | Code                                                | Notes                                                                                                                                                     |
| ------------------------ | --------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Schemas                  | `lib/content/schema.ts`                             | Domains, modules, lessons, references. `defineLesson` / `defineDomains` give authors type checking.                                                       |
| Discovery and validation | `lib/content/load.ts`, `lib/content/validate.ts`    | Every issue reported at once; exits non-zero in CI.                                                                                                       |
| Knowledge checks         | `content/lessons/*/quiz.ts`, `lib/content/quiz.ts`  | Required for published lessons; exactly one correct option per question, with an explanation for every option. Options render in a stable seeded shuffle. |
| MDX analysis             | `lib/content/mdx-text.ts`                           | Word count, reading time, h2/h3 headings with `github-slugger` ids (identical to `rehype-slug`).                                                          |
| Interview questions      | `content/lessons/*/interview.ts`                    | Required for published lessons. Level, kind, model answer and rubric; ids are globally unique (anchors on `/interview`). Rendered after the MDX body.     |
| Incidents                | `content/incidents.ts`, `lib/incidents/evidence.ts` | Story and questions are content; charts and logs come from simulation runs. Every clue `ref` must exist in the run's output.                              |
| Learning paths, glossary | `content/paths.ts`, `content/glossary.ts`           | Steps must be published lessons that come after their prerequisites; glossary ids, names and aliases are unique and every link resolves.                  |
| Demos in lessons         | `<Demo slug="…" />` from `mdx-components.tsx`       | Lazy-loads one demo per chunk. `pnpm content` rejects unknown slugs and direct scene imports, which would bundle the scene into every lesson page.        |
| Generated registry       | `scripts/content.ts` → `content/.generated/`        | Git-ignored; regenerated before `dev`, `build`, `test` and `typecheck`. `registry.ts` holds the data; `bodies.ts` holds the MDX loaders (see below).      |
| Runtime queries          | `lib/content/catalog.ts`, `lib/content/bodies.ts`   | `server-only`; curriculum ordering, previous/next, related lessons, paths, glossary. Drafts are visible only in development.                              |

**Why lesson bodies are separate.** Any route whose server code imports a lesson's MDX gets that lesson's client components in its bundle. Only the lesson page imports `lib/content/bodies.ts`; everything else reads metadata from `catalog.ts`.

## Search and progress

| Feature  | Code                                                       | Notes                                                                                                                                                                                                                                                                                                                            |
| -------- | ---------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Search   | `lib/search/build.ts` (build time), `lib/search/search.ts` | The index of lessons, paths, demos and glossary terms is passed to the `/search` page as props. Scoring is pure and unit-tested: every word must match; title and aliases count most; stems, prefixes and one typo.                                                                                                              |
| Progress | `lib/progress/progress.ts`, `components/progress/*`        | Pure, versioned record in `localStorage` (`ve:progress`), validated on read. `useSyncExternalStore` keeps every component on the page in sync and renders nothing personal on the server Export and import move it between browsers as a JSON file; imports are validated like stored data and merged, never replacing anything. |

## Routing

All routes are prerendered. Dynamic segments set `dynamicParams = false`, so unknown paths fall through to `app/not-found.tsx` (served as `404.html` with a 404 status).

| Route                             | Source                                                                                        |
| --------------------------------- | --------------------------------------------------------------------------------------------- |
| `/`                               | `app/page.tsx`                                                                                |
| `/explore`                        | `app/explore/page.tsx`                                                                        |
| `/[domain]`                       | `app/[domain]/page.tsx` — the domain intro, its modules, published lessons and planned topics |
| `/[domain]/[lesson]`              | `app/[domain]/[lesson]/page.tsx`                                                              |
| `/paths`, `/paths/[slug]`         | `app/paths/` — learning paths with progress                                                   |
| `/glossary`                       | `app/glossary/page.tsx` — one anchor per term, e.g. `/glossary/#idempotency`                  |
| `/search`                         | `app/search/page.tsx` — the query lives in `?q=`                                              |
| `/interview`                      | `app/interview/page.tsx` — every question, filters, and self-graded practice                  |
| `/incidents`, `/incidents/[slug]` | `app/incidents/` — briefing, evidence charts and logs, diagnosis, postmortem                  |
| `/playground/[slug]`              | `app/playground/[slug]/page.tsx`                                                              |
| `/about`                          | `app/about/page.tsx`                                                                          |
| `/sitemap.xml`, `/robots.txt`     | `force-static`; the sitemap is empty until `NEXT_PUBLIC_SITE_URL` is set                      |

Domain ids share the top-level URL namespace with static routes, so `RESERVED_SEGMENTS` in the schema is enforced by validation.

## Simulation engine

```
 lib/simulation (pure TS)                         components/visualizations (React)
┌───────────────────────────────┐                ┌──────────────────────────────────────┐
│ model.init / tick / apply     │  runSimulation │ container ("use client")             │
│ seeded RNG (mulberry32)       │ ─────────────▶ │  useActionLog → actions[]            │
│ (params, seed, actions[])     │    Frame[]     │  usePlayback  → playbackReducer      │
│        → Frame[]              │                │  <SimulationPlayer> + <Scene>        │
│ playbackReducer (pure)        │                │  controls → act() → new action       │
└───────────────────────────────┘                └──────────────────────────────────────┘
```

- **Models** (`lib/simulation/models/`) are pure: no React, DOM, clocks or `Math.random`. Frames are precomputed from the seed and the action log, so stepping backwards and restarting are exact, and tests assert exact outcomes.
- **Every control is an action** recorded at the next tick, so changes take effect "now" without altering the past.
- **The player** (`components/visualizations/player/`) provides the controls, timeline, live caption (polite while paused, silent while playing), event log, assumptions panel, keyboard shortcuts, and pausing when hidden or scrolled away. Scenes are `aria-hidden` SVG, and the text equivalents live in the player.
- **Motion** between frames is a CSS transition timed by `--frame-ms`, which the player sets to `0ms` under reduced motion. Playback never starts on its own.
- **Code splitting:** each playground page loads only its own demo through `next/dynamic`. The first frame is still server-rendered.

How to add one: [SIMULATION-GUIDE.md](SIMULATION-GUIDE.md).

## Design system

- Tokens are CSS custom properties in `app/globals.css`, defined in OKLCH for dark (default) and light themes and mapped into Tailwind with `@theme inline`.
- `tests/unit/contrast.test.ts` parses the stylesheet and checks WCAG ratios for every text and UI token pair in both themes.
- The theme is applied before first paint by a small inline script (`lib/theme.ts`) that tolerates blocked storage. The toggle cycles system → dark → light.
- Global `prefers-reduced-motion` handling neutralises CSS transitions and animations; the simulation player will add its own step mode in Phase 2.
- Fonts (IBM Plex Sans / Mono) are downloaded at build time and self-hosted.

## Quality gates

| Gate                                                                                                                                                     | Where                      |
| -------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------- |
| ESLint (Next core-web-vitals, TypeScript, React hooks, jsx-a11y), zero warnings                                                                          | `pnpm lint`                |
| Prettier (MDX excluded, see ADR-0002)                                                                                                                    | `pnpm format:check`        |
| Strict TypeScript                                                                                                                                        | `pnpm typecheck`           |
| Unit and component tests                                                                                                                                 | `pnpm test`                |
| Static build                                                                                                                                             | `pnpm build`               |
| Page-weight budgets (shared with the site via `lib/quality/budgets.ts`)                                                                                  | `pnpm budget`              |
| E2E journeys, 404s, keyboard-only journeys, theme, no horizontal scroll, no third-party requests; axe WCAG 2.2 A/AA in both themes on desktop and mobile | `pnpm test:e2e`            |
| Lighthouse budgets, mobile, median of five runs                                                                                                          | `pnpm lighthouse` (CI job) |
| Production dependency audit                                                                                                                              | CI                         |

## Security notes

- MDX compiles to code. Only reviewed repository content is compiled; nothing renders MDX or HTML from user input.
- CI runs with `contents: read`, actions are pinned by commit SHA, and checkouts do not persist credentials.
- The static export cannot set HTTP headers, and GitHub Pages does not allow custom headers (ADR-0009).

## Deployment

`.github/workflows/deploy.yml` deploys to GitHub Pages only after CI passes on `main`. The build reads the origin and base path from the Pages configuration (`NEXT_PUBLIC_SITE_URL`, `NEXT_PUBLIC_BASE_PATH`), and `trailingSlash: true` emits `route/index.html` for every page.

## System design sandbox

`lib/simulation/models/sandbox.ts` is a request-flow model on the same engine as every other demo: each one-second step routes the offered traffic through app servers, an optional cache, read replicas or the primary, and an optional write queue, recording load, overflow, latency and the bottleneck. `lib/sandbox/challenges.ts` adds traffic profiles, scripted failures and goals, and `evaluate()` checks every second of a run against them. The design (architecture and traffic) is the input to a run, so changing it restarts the timeline; failures are actions at the current second. `lib/sandbox/share.ts` encodes a scenario, design and injected failures as a short query string (`?scenario=launch-day&app=6&cache=95&failures=12f`); decoding accepts only values the controls can produce, and the page applies a linked design after hydration.

## Not yet built

Phone-specific scene layouts (on phones, scenes can be enlarged into a scrollable view instead) and a `⌘K` search palette.

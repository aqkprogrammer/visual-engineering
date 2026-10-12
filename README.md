# Visual Engineering

**Understand how technology works.** Complex engineering concepts — made visual, made simple.

Visual Engineering is an open-source learning platform that explains system design, software architecture, AI engineering, containers, cloud infrastructure, networking and computer science through diagrams and deterministic simulations you can play, step through, change and break.

> Don't just read how technology works. Watch it work, change it, break it, and understand why.

## Project status

**Early development — Phase 1 (foundation) of the [delivery plan](docs/PLAN.md).**

| Area                                                            | State                                                                                            |
| --------------------------------------------------------------- | ------------------------------------------------------------------------------------------------ |
| Static site, design system (dark + light), app shell, routing   | ✅ Working                                                                                       |
| Typed, schema-validated content pipeline                        | ✅ Working                                                                                       |
| Curriculum taxonomy (7 domains, 43 modules, 220 planned topics) | ✅ Defined                                                                                       |
| Lessons                                                         | 1 published — [How load balancing works](content/lessons/system-design/load-balancing/index.mdx) |
| Unit, component, end-to-end and accessibility tests; CI         | ✅ Working                                                                                       |
| Interactive simulation engine (play / step / change / break)    | ⏳ Next — Phase 2                                                                                |
| Search, learning paths, glossary, quizzes, progress             | ⏳ Phase 4                                                                                       |
| Hosting / public URL                                            | Not decided yet                                                                                  |

Nothing on this page claims more than what is in the repository today.

## Principles

- **Free and open** — no account, no paywall, no API key. The core experience works offline from the static build.
- **Honest simulations** — every simulation is a deterministic _teaching model_ that states its assumptions; illustrative numbers are labelled as such and never presented as benchmarks.
- **Accurate content** — lessons cite official documentation and specifications and show when they were last reviewed. Analogies are labelled as analogies.
- **Accessible** — keyboard operable, screen-reader friendly, reduced-motion aware, never colour-only. Automated axe checks run on every page type in both themes.
- **No tracking** — no analytics, no third-party scripts. Fonts are self-hosted at build time.

## Quick start

Requirements: **Node.js 24+** and **pnpm 11** (`corepack enable` installs the version pinned in `package.json`).

```bash
pnpm install
pnpm dev        # http://localhost:3000
```

| Command                     | What it does                                                                                |
| --------------------------- | ------------------------------------------------------------------------------------------- |
| `pnpm dev`                  | Validate content, then start the dev server                                                 |
| `pnpm build`                | Validate content and build the static site into `out/`                                      |
| `pnpm preview`              | Serve `out/` locally on port 3000                                                           |
| `pnpm content`              | Validate all content and regenerate the content registry                                    |
| `pnpm lint` / `pnpm format` | ESLint (zero warnings allowed) / Prettier                                                   |
| `pnpm typecheck`            | Strict TypeScript check                                                                     |
| `pnpm test`                 | Unit and component tests (Vitest + Testing Library)                                         |
| `pnpm test:e2e`             | End-to-end and axe accessibility tests (Playwright) against `out/` — run `pnpm build` first |
| `pnpm check`                | Everything except E2E, as CI runs it                                                        |

First E2E run: `pnpm exec playwright install chromium`.

## How it is built

- **Next.js 16 App Router**, statically exported — every page is prerendered HTML; there is no server.
- **React 19**, **TypeScript 6** (strict), **Tailwind CSS 4** with design tokens in OKLCH.
- **MDX** lessons with typed `meta.ts` metadata validated by **Zod**; reading time and table of contents are derived at build time.
- **Shiki** syntax highlighting at build time — no highlighting JavaScript in the browser.
- **Vitest**, **Testing Library**, **Playwright** and **axe-core**; GitHub Actions CI with least-privilege permissions and SHA-pinned actions.

See [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) and the [architecture decision records](docs/adr/).

```
app/                     routes and layouts (all statically generated)
components/
  layout/                header, footer, breadcrumbs, theme toggle
  lessons/               lesson building blocks used from MDX
  visualizations/        diagrams (simulation engine arrives in Phase 2)
content/
  domains.ts             curriculum taxonomy: domains → modules → planned topics
  lessons/<domain>/<slug>/
    meta.ts              typed metadata (validated)
    index.mdx            lesson body
lib/
  content/               schemas, validation, MDX analysis, catalog queries
  design/                colour-contrast maths used to verify tokens
scripts/content.ts       validates content and generates the registry
tests/                   unit, component and e2e suites
docs/                    plan, architecture, ADRs
```

## Writing a lesson

1. Create `content/lessons/<domain>/<slug>/` — the domain must exist in `content/domains.ts` and the folder name must match the slug.
2. Add `meta.ts` using `defineLesson({...})`. The schema in `lib/content/schema.ts` documents every field; it requires a 70–170 character description, at least two `https` references and a `lastReviewed` date.
3. Write `index.mdx`. Blocks such as `<Definition>`, `<Analogy>`, `<Callout kind="note|warning|illustrative">`, `<Steps>`, `<TradeOffs>` and `<InterviewQuestion>` are available without imports (see `mdx-components.tsx`). Leave a blank line after an opening block tag and before its closing tag so the inner Markdown is parsed as Markdown.
4. Run `pnpm content`. It lists every problem at once: unknown modules, broken prerequisite links, cycles, links to drafts.

Drafts (`status: "draft"`) are visible in `pnpm dev` only. A full authoring guide and contribution process arrive in Phase 5.

## Deployment

`pnpm build` produces a self-contained static site in `out/` that any static host can serve. The hosting target has not been chosen yet. Set `NEXT_PUBLIC_SITE_URL` (see `.env.example`) once a production domain exists. Until then, canonical URLs and sitemap entries are intentionally omitted rather than pointing at an invented domain.

## Contributing and security

Issues and pull requests are welcome; a full contribution guide is planned for Phase 5. Please report security problems privately as described in [SECURITY.md](SECURITY.md).

## License

**Not yet chosen.** Until a license file is added to this repository, default copyright applies and the code and content are not licensed for reuse. Proposed: MIT for code and CC BY 4.0 for lesson content — pending the maintainer's decision.

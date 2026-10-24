# Visual Engineering — Phase 0: Architecture & Delivery Plan

> **Status:** Approved 2026-10-12 · Phase 1 (foundation) in progress
> This is the original Phase 0 plan, kept as written for traceability. Decisions taken since are recorded in the **Decision log** at the end and in [`docs/adr/`](adr/).

**Central promise:** _Don't just read how technology works. Watch it work, change it, break it, and understand why._

---

## 1. What was inspected

| Area                      | Finding                                                                                                                                                                                                                                                                                                                             |
| ------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| GitHub auth               | `gh` 2.95.0 is authenticated as **`aqkprogrammer`** (active). A second account, `qadirgetvocal`, is logged in but inactive.                                                                                                                                                                                                         |
| Target repo               | **`aqkprogrammer/visual-engineering` does not exist.** No similarly named repo under the account.                                                                                                                                                                                                                                   |
| Token scope note          | The active token is a classic PAT with very broad scopes (`admin:enterprise`, `admin:org`, `delete_repo`, …). This project only needs `repo` + `workflow`. I recommend replacing it with a narrower token. This does not block the work.                                                                                            |
| Local workspace           | `/Users/qadir/Documents/dev/github` is empty and not a Git repo. I propose `~/Documents/dev/github/visual-engineering` as the project root.                                                                                                                                                                                         |
| Runtime                   | Node **v26.4.0** (Current, not LTS yet), npm 11.17, **pnpm 11.9**, Git 2.54, Docker 29.5, macOS arm64, 16 GB. Yarn and Bun are not installed and are not needed.                                                                                                                                                                    |
| Node LTS                  | v24 "Krypton" is Active LTS (24.21.0). CI will pin Node 24 LTS. Local Node 26 meets every engine range checked.                                                                                                                                                                                                                     |
| Next.js                   | Latest stable **16.4.0** (released 2026-10-06), previous line 16.3.8. Docs (v16.4.0) confirm the `@next/mdx` + `mdx-components.tsx` workflow, Turbopack's string-form remark/rehype plugins, and `output: 'export'` constraints.                                                                                                    |
| TypeScript                | `latest` is **7.0.2** (native compiler), but **`typescript-eslint` 8.71 only supports `typescript <6.1.0`** → pin **TS 6.0.3** until the lint toolchain supports 7 (ADR-0006).                                                                                                                                                      |
| Other versions checked    | React 19.3 · Tailwind 4.3 · Motion 14.1 · @xyflow/react 12.12 · Zod 4.6 · Vitest 5.0 (Vite 8.3) · RTL 16.3 · Playwright 1.64 · ESLint 10.12 · Prettier 3.9 · shadcn CLI 4.21 · MiniSearch 7.2 · Pagefind 1.5 · Shiki 4.5 · Mermaid 12.1 · d3 7.9. Peer ranges for Next, Motion, React Flow and Vitest are compatible with this set. |
| Not inspected (needs you) | Production domain, hosting accounts (Vercel/Cloudflare), whether GitHub Pages is enabled, licensing preference.                                                                                                                                                                                                                     |

---

## 2. Product requirements

### 2.1 Audiences

1. **Beginner / student.** Needs intuition and analogies first, with no assumed jargon.
2. **Working developer.** Wants the internal mechanics, configuration, and code.
3. **Senior engineer.** Wants production trade-offs, failure modes, and scaling behavior.
4. **Interview candidate.** Wants structured recall, practice questions, and design practice.

One lesson serves all four through a fixed teaching arc and a **depth lens** (Simple / Technical / Production; see §5.4).

### 2.2 v1 functional requirements (Definition of Done scope)

- At least 12 complete lessons across system design, AI, infrastructure, networking, and CS, each with a working interactive visualization and a knowledge check.
- A reusable visualization engine with play/pause/restart/step/speed controls, a timeline, an event log, parameter controls, failure injection, and reduced-motion support.
- Pages: Home, Explore, category landing, lesson, playground index, learning paths, glossary, search, interview prep, about/contribute, and "How this platform works".
- Full-text search with category and difficulty filters; breadcrumbs; previous/next; table of contents; related lessons and prerequisites.
- Local-only progress tracking with no account.
- SEO metadata, sitemap, robots, Open Graph, and valid JSON-LD.
- CI covering lint, format, typecheck, content validation, unit/component tests, build, E2E, and a11y/perf checks.
- A complete open-source repository: README, CONTRIBUTING, lesson authoring guide, animation guide, SECURITY, CODE_OF_CONDUCT, LICENSE, templates, Dependabot.

### 2.3 Non-functional requirements

- **Static-first:** the whole site prerenders at build time, needs no server runtime, and can be hosted anywhere.
- **No login, API keys, or paid services** for any core feature.
- **Accessibility:** WCAG 2.2 AA as the target. Every visualization has a text equivalent.
- **Performance:** budgets in §9, measured in CI rather than claimed.
- **Determinism:** the same parameters and seed always produce the same simulation.
- **Honesty:** every simulation shows a visible _Teaching model_ notice listing its assumptions. Illustrative numbers are labeled as illustrative.

### 2.4 Explicit non-goals for v1

Backend, database, accounts, comments, AI API calls/tutor, analytics/tracking, CMS, i18n, a service worker or offline mode, execution of user-submitted code (client or server), arbitrary-repo parsing, Mermaid runtime rendering, narration audio. These are deferred deliberately; most appear in the post-v1 roadmap (§12).

---

## 3. Curriculum taxonomy

### 3.1 Content model

```
Domain (7)  ──▶  Module (grouping within a domain)  ──▶  Lesson
                                                       ├── Visualization (walkthrough | simulation | static)
                                                       ├── Quiz
                                                       └── Glossary terms, references, interview Q&A
Cross-cutting content types:
  Case study   — end-to-end design (URL shortener, chat, payments…)
  Playground   — open-ended sandbox reusing simulation models
  Lab          — break-and-fix / incident scenario   (post-v1)
  Challenge    — interview arena prompt + rubric      (post-v1)
  Path         — ordered list of lessons/case studies with checkpoints
  Glossary term
```

Lessons form a **prerequisite DAG** that is validated for cycles at build time. This DAG drives "Before you start", the knowledge map (post-v1), and path ordering.

### 3.2 Domains and modules

Domain slugs are permanent URL segments.

| Domain (`slug`)                                     | Modules                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                   |
| --------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **System Design** (`system-design`)                 | Foundations (requirements, scalability, availability/reliability/durability, scaling) · Traffic (load balancing, reverse proxies, API gateways, CDN/edge, rate limiting) · Data (caching, indexing, SQL vs NoSQL, replication, partitioning/sharding, consistent hashing) · Consistency (CAP, PACELC, eventual consistency, distributed transactions, sagas, idempotency, distributed locking) · Messaging (queues vs streams, Kafka, RabbitMQ, sync vs async, backpressure) · Resilience (timeouts, retries, circuit breakers, bulkheads, HA, DR) · Realtime & APIs (polling/SSE/WebSockets, API versioning, service discovery, multi-tenancy) · Observability · **Case studies** (12 listed in brief)                   |
| **Software Architecture** (`software-architecture`) | Styles (layered, clean, hexagonal/ports & adapters, modular monolith, monolith vs microservices, micro-frontends) · Domain modeling (DDD, service boundaries, CQRS, event sourcing) · Design principles (SOLID, DRY/KISS/YAGNI, DI, repository/UoW, design patterns) · APIs (API-first, REST vs GraphQL vs gRPC, BFF) · Evolution (refactoring & tech debt, strangler fig, ADRs)                                                                                                                                                                                                                                                                                                                                          |
| **AI Engineering** (`ai`)                           | Foundations (AI/ML/DL/GenAI, learning paradigms, neural networks, training vs inference) · Language models (tokens, embeddings & similarity, attention, transformers, LLMs, pretraining/fine-tuning) · Building with LLMs (prompting, structured outputs, tool calling) · Retrieval (RAG, ingestion & chunking, embedding pipelines, vector DBs, hybrid retrieval & reranking, RAG evaluation) · Agents (agent loop, planning/memory/tools, MCP, multi-agent) · Production AI (gateways & routing, semantic caching, latency/throughput/cost, GPU inference, quantization, observability) · Safety & quality (hallucination & grounding, guardrails, prompt injection, evaluation, privacy) · Multimodal (vision, speech) |
| **Containers & Kubernetes** (`containers`)          | Containers (VMs vs containers, isolation, Docker architecture, images & layers, Dockerfiles, build cache, multi-stage, registries, volumes, networking, Compose, secrets, image optimization, security) · Kubernetes core (architecture, control plane/nodes, pods, Deployments/ReplicaSets, Services, Ingress & Gateway API, ConfigMaps/Secrets, namespaces, labels/selectors) · Workloads (StatefulSets, DaemonSets, Jobs/CronJobs, PV/PVC) · Operations (requests/limits, probes, HPA, scheduling, rolling updates/rollbacks, self-healing, network policies, Helm, troubleshooting)                                                                                                                                   |
| **Cloud & Infrastructure** (`cloud`)                | Cloud foundations (regions/AZs, shared responsibility) · AWS networking (VPC, subnets, routing, NAT, SGs vs NACLs, Route 53, load balancers, CloudFront) · AWS compute & data (EC2, Lambda, ECS vs EKS vs Lambda, S3, RDS, DynamoDB, SQS/SNS, API Gateway) · IAM & security (users/roles/policies, least privilege, secrets management) · IaC (Terraform, state, modules) · Delivery (CI/CD, GitHub Actions, blue-green, canary) · Operations (autoscaling, backups/DR, CloudWatch, metrics/logs/traces/alerts, SLI/SLO/SLA, cost optimization, FinOps)                                                                                                                                                                   |
| **Networking & Web** (`networking`)                 | Internet basics (how the internet works, IP/ports, packet routing, TCP vs UDP, latency) · Naming (DNS resolution) · Web protocols (HTTP/HTTPS, HTTP/1.1 vs 2 vs 3, TLS handshake, browser request lifecycle, WebSockets, connection pooling) · Identity (cookies & sessions, JWT, OAuth 2.0 & OIDC, CORS) · Edge & security (forward vs reverse proxy, CDN, firewalls, zero trust)                                                                                                                                                                                                                                                                                                                                        |
| **Computer Science** (`computer-science`)           | Data structures · Algorithms (Big O, sorting/searching, recursion, DP, greedy) · Concurrency (processes/threads, async & event loop, race conditions, deadlocks) · Systems (OS fundamentals, memory management, GC) · Databases (transactions, ACID, indexes, isolation levels) · Engineering practice (testing strategies, OWASP, profiling)                                                                                                                                                                                                                                                                                                                                                                             |

Cloud lessons carry a **provider badge** (for example "AWS-specific") and a fixed notice: _"This is a local simulation. It does not provision or call any cloud resources."_

### 3.3 First 12 lessons (Phase 3)

Each was chosen for a high-value visual, coverage across domains, and coherent learning paths.

| #   | Lesson                                    | Domain           | Visualization (kind) | Key interactions                                                                                                                                                       |
| --- | ----------------------------------------- | ---------------- | -------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | How load balancing works                  | System Design    | Simulation           | Server count, round-robin vs least-connections, kill a server, health checks on/off, illustrative latency                                                              |
| 2   | Caching, invalidation & eviction          | System Design    | Simulation           | Cache size, LRU vs LFU vs TTL, hit ratio over a seeded access pattern, stale-read demo                                                                                 |
| 3   | Message queues & backpressure             | System Design    | Simulation           | Producer rate vs consumer count, backlog growth, bounded queue, dead-letter queue                                                                                      |
| 4   | Rate limiting                             | System Design    | Simulation           | Token bucket vs fixed window vs sliding window, burst traffic, 429 responses                                                                                           |
| 5   | Tokens & tokenization                     | AI               | Walkthrough          | Step through a toy BPE merge table. Clearly labeled as a toy vocabulary, not a real model's                                                                            |
| 6   | Embeddings & vector similarity            | AI               | Simulation           | 2-D projection of a curated mock corpus, query point, cosine vs dot product, top-k                                                                                     |
| 7   | How RAG works                             | AI               | Walkthrough + sim    | 11-stage pipeline inspector, chunk size and top-k, reranker on/off, inject irrelevant context, grounded vs ungrounded answer (pre-authored mock outputs)               |
| 8   | How Docker builds and runs images         | Containers       | Walkthrough          | Dockerfile → layers → cache hits/misses on edit → registry → container; image vs container; restart                                                                    |
| 9   | Kubernetes self-healing & rolling updates | Containers       | Simulation           | Crash a pod, failing liveness probe, ReplicaSet reconciliation, rolling update with maxSurge/maxUnavailable, rollback. Includes "What Kubernetes does _not_ guarantee" |
| 10  | DNS resolution                            | Networking       | Walkthrough          | Stub → recursive resolver → root → TLD → authoritative, caching with TTL, cache-hit path                                                                               |
| 11  | The TLS 1.3 handshake                     | Networking       | Walkthrough          | ClientHello/ServerHello, key share, certificate verification, 1-RTT. Notes on 0-RTT replay risk                                                                        |
| 12  | Database indexes & B-trees                | Computer Science | Simulation           | Full scan vs B-tree traversal, page reads counted, insert causing a split, write overhead                                                                              |

**Stretch (if quality allows):** Consistent hashing (ring, add/remove node, key remapping), the JavaScript event loop (curated pre-traced programs), AWS VPC request path.

### 3.4 Initial learning paths

Paths are defined now and grow as lessons land. Each path page shows only published lessons and an honest "coming next" list.

- System Design: Beginner → Advanced
- AI Engineering Fundamentals
- RAG & Agentic AI
- Docker → Kubernetes
- AWS & Cloud Architecture
- Networking for Backend Engineers
- Software Architecture for Senior Engineers

---

## 4. Architecture

### 4.1 Overview

```
            ┌───────────────────────── build time (Node) ─────────────────────────┐
content/    │  scripts/content.ts                                                 │
 ├ lessons/ │   1. load meta.ts + quiz.ts  → Zod validate (schema + cross-refs,   │
 │  └ …mdx  │      DAG cycle check, reserved slugs, https refs)                   │
 ├ paths/   │   2. extract plaintext from MDX (mdast) → search-index.json         │
 ├ glossary │   3. emit .generated/registry.ts (typed lazy MDX/scene imports)     │
            │  next build (output: 'export') → prerender every route → out/       │
            └─────────────────────────────────────────────────────────────────────┘
                                         │ static files
                                         ▼
            ┌──────────────────── browser ────────────────────┐
            │ Server-rendered HTML (lesson prose, frame 0 of   │
            │ each visualization, step transcript)            │
            │   + hydrated islands:                            │
            │     Player (controls/timeline/log)               │
            │     Scene (SVG + Motion)  ← lib/simulation (pure)│
            │     Search (MiniSearch, loaded on first use)     │
            │     Progress (localStorage, Zod-parsed)          │
            └──────────────────────────────────────────────────┘
```

### 4.2 Key decisions (each becomes an ADR in `docs/adr/`)

| ADR  | Decision                                                                                                                                                   | Alternatives considered                                                                               | Why                                                                                                                                                                                                                                                                                              |
| ---- | ---------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| 0001 | **Next.js 16 App Router, `output: 'export'` (fully static)**                                                                                               | SSR on Vercel; Astro                                                                                  | Matches the static-first requirement and the requested stack, and is portable to any host. Trade-offs: no `headers`/`redirects`/middleware (security headers must come from the host), and every dynamic route needs `generateStaticParams` with `dynamicParams = false`, which gives real 404s. |
| 0002 | **Content = MDX (`@next/mdx`) + per-lesson typed `meta.ts`/`quiz.ts` validated by Zod**                                                                    | Velite (0.x), Fumadocs MDX (couples to the Fumadocs framework), content-collections, YAML frontmatter | Metadata in TS gets type-checking, autocomplete, and refactor safety. `@next/mdx` is first-party and Turbopack-compatible. A small in-repo script is easier to audit than a pre-1.0 content framework. Cost: we own about 200 lines of loader code.                                              |
| 0003 | **Deterministic simulation engine: pure models + seeded PRNG + precomputed frames**                                                                        | Live physics/rAF state; XState                                                                        | Backward stepping, scrubbing, restart, tests, and shareable scenarios all become trivial. React has no say in simulation correctness. See §5.                                                                                                                                                    |
| 0004 | **Rendering = hand-built SVG components + Motion. React Flow only for editable graphs. d3 submodules only when needed. Mermaid deferred.**                 | Canvas/WebGL; full D3; Mermaid at runtime                                                             | SVG is accessible, crisp, themeable via CSS variables, and SSR-able. Mermaid is a large runtime and its output can't match the design system. React Flow is reserved for the drag-and-connect System Design Simulator (post-v1) and is lazy-loaded.                                              |
| 0005 | **Search = MiniSearch over a build-time JSON index, loaded on first interaction**                                                                          | Pagefind (post-build HTML indexing), Orama, Algolia                                                   | At the v1 scale (tens to low hundreds of lessons) the index is small. It works identically in `next dev`, is unit-testable in Vitest, and supports field boosting and filters. Revisit Pagefind above ~300 lessons.                                                                              |
| 0006 | **TypeScript 6.0.x pinned**                                                                                                                                | TS 7.0                                                                                                | `typescript-eslint` peer range is `<6.1.0`. Move to TS 7 when the lint toolchain supports it; Dependabot will surface that.                                                                                                                                                                      |
| 0007 | **UI primitives = shadcn/ui (Radix) copied into `components/ui`**                                                                                          | Headless UI; hand-rolled                                                                              | Provides accessible dialog, tabs, tooltip, slider, toggle-group, and command palette, all owned in-repo and styled with tokens.                                                                                                                                                                  |
| 0008 | **Tooling = ESLint 10 (flat config, `eslint-config-next`, typescript-eslint, jsx-a11y) + Prettier; pnpm; Vitest 5 + RTL; Playwright + axe; Lighthouse CI** | Biome                                                                                                 | Next's lint rules and jsx-a11y are not covered by Biome today.                                                                                                                                                                                                                                   |
| 0009 | **Hosting**                                                                                                                                                | _Pending your decision (§13)_                                                                         |                                                                                                                                                                                                                                                                                                  |
| 0010 | **Licensing**                                                                                                                                              | _Pending your decision (§13)_                                                                         |                                                                                                                                                                                                                                                                                                  |

### 4.3 Routes (all statically generated)

```
/                               Home
/explore                        All domains, modules, filters
/[domain]                       Domain landing (intro, modules, paths, lessons)
/[domain]/[lesson]              Lesson, e.g. /system-design/load-balancing
/case-studies/[slug]            (Phase 4+)
/paths  /paths/[slug]           Learning paths
/playground  /playground/[slug] Sandboxes reusing simulation models
/glossary                       Glossary (anchor per term: /glossary#idempotency)
/search?q=…&domain=…&level=…    Client-side results (static shell)
/interview                      Interview question bank by domain
/about  /contribute  /roadmap
/how-it-works                   "How this platform works" (architecture, ADRs, CI, budgets)
/sitemap.xml  /robots.txt       force-static route files
```

Top-level domain slugs must not collide with the static routes. The validator enforces a reserved-slug list, and a test asserts it.

### 4.4 Directory structure

```
visual-engineering/
├─ app/                          routes, layouts, metadata, sitemap/robots, not-found
├─ components/
│  ├─ ui/                        shadcn primitives (button, dialog, tabs, slider, tooltip, command…)
│  ├─ layout/                    header, footer, nav, breadcrumbs, theme toggle, skip link
│  ├─ lessons/                   LessonLayout, TOC, Callout, Analogy, Lens, KeyTerms,
│  │                             TradeOffs, Misconceptions, InterviewQA, Quiz, References, PrevNext
│  └─ visualizations/
│     ├─ primitives/             Node, Edge, Packet, Zone, StatusBadge, Legend, Annotation, Axis
│     ├─ player/                 Player, Controls, Timeline, SpeedSelect, Narration (aria-live),
│     │                          EventLog, ParamPanel, TeachingModelNotice, Transcript
│     ├─ scenes/<id>/            one thin composition per visualization
│     └─ registry.ts             id → lazy scene import (generated/validated)
├─ content/
│  ├─ domains.ts                 domain + module definitions
│  ├─ lessons/<domain>/<slug>/   index.mdx · meta.ts · quiz.ts · (assets/)
│  ├─ paths/*.ts                 learning paths
│  ├─ glossary.ts                terms (id, term, short def, long def, related lessons)
│  └─ .generated/                registry + search index (gitignored, built by script)
├─ lib/
│  ├─ content/                   schemas (Zod), loaders, cross-ref validation, reading time
│  ├─ search/                    index building (Node) + query/filter (browser)
│  ├─ simulation/                rng, engine, timeline math, models/<id>.ts — no React
│  ├─ progress/                  versioned localStorage store
│  └─ seo/                       metadata + JSON-LD builders
├─ hooks/                        usePlayback, useReducedMotionPreference, useInView
├─ types/                        shared types
├─ public/                       fonts (if not next/font), icons, og fallbacks
├─ scripts/                      content.ts (validate/index/codegen), check-links.ts
├─ tests/
│  ├─ unit/  component/          Vitest + RTL
│  └─ e2e/                       Playwright (+ axe)
├─ docs/                         PLAN, ARCHITECTURE, adr/, authoring, animation guide, roadmap
└─ .github/                      workflows/, ISSUE_TEMPLATE/, PULL_REQUEST_TEMPLATE.md, dependabot.yml, CODEOWNERS
```

`hooks/` and `components/layout/` are additions to your suggested layout. Everything else follows it.

### 4.5 Content schema (sketch, Zod 4)

```ts
export const LessonMeta = z.object({
  slug: Slug, // kebab-case, unique per domain
  title: z.string().max(70),
  description: z.string().min(70).max(160), // doubles as meta description
  domain: DomainId,
  module: ModuleId,
  difficulty: z.enum(["beginner", "intermediate", "advanced"]),
  prerequisites: z.array(LessonRef).default([]), // validated to exist; DAG must be acyclic
  related: z.array(LessonRef).default([]),
  tags: z.array(Tag).min(1).max(8),
  glossary: z.array(TermId).default([]),
  visualization: z
    .object({
      id: VisualizationId, // must exist in the scene registry
      kind: z.enum(["walkthrough", "simulation", "static"]),
      summary: z.string(), // text alternative
      assumptions: z.array(z.string()).min(1), // rendered in TeachingModelNotice
    })
    .optional(),
  provider: z.enum(["aws", "gcp", "azure"]).optional(),
  references: z.array(Reference).min(2), // https only; kind: official|spec|paper|book
  lastReviewed: z.iso.date(),
  status: z.enum(["draft", "published"]),
});
// readingMinutes is computed from word count at build time, never hand-entered.
```

Quizzes are typed data (`single-choice`, `multi-choice`, `predict-the-outcome` bound to a visualization frame, `order-the-steps`). Every option carries an explanation of _why_ it is right or wrong. Grading is a pure function.

### 4.6 Security posture

- **MDX is code.** It is compiled only from repository content, never from user input at runtime. `CODEOWNERS` requires maintainer review on `content/**` and `components/**`. There is no remote MDX in v1.
- No server, no user code execution, and no shell features. The "visual code execution" feature (post-v1) uses **pre-traced curated programs**, not an interpreter running arbitrary input.
- CI uses `permissions: contents: read` by default, actions pinned by commit SHA, `pnpm install --frozen-lockfile`, and `pnpm audit` in CI.
- At publish time I recommend enabling GitHub secret scanning with push protection, Dependabot alerts, and CodeQL default setup (free for public repos). These are settings changes and need your approval.
- A Gitleaks scan of the full history runs before the first push.
- No analytics or third-party scripts. Fonts are self-hosted through `next/font` at build time.
- Static export cannot set HTTP headers, so CSP and security headers depend on the host (see §13).

---

## 5. Visualization & simulation engine

This is the core product, so the design is specified carefully.

### 5.1 Two kinds of visualization, one player

| Kind            | Source of frames                                            | Examples                                                      |
| --------------- | ----------------------------------------------------------- | ------------------------------------------------------------- |
| **Walkthrough** | Authored array of steps: `{ id, title, narration, state }`  | TLS handshake, DNS, Docker build, RAG pipeline, tokenization  |
| **Simulation**  | Pure model run for N ticks from `(params, seed, actionLog)` | Load balancer, cache, queue, rate limiter, Kubernetes, B-tree |

Both produce a **`Frame[]`**, so one `Player` provides play/pause/restart/next/previous/scrub/speed/timeline/event log for every lesson.

### 5.2 Simulation model contract (`lib/simulation`, no React)

```ts
interface Model<State, Params, Action, Event> {
  id: string;
  init(params: Params, rng: Rng): State;
  tick(state: State, rng: Rng): { state: State; events: Event[] }; // pure
  apply(state: State, action: Action): { state: State; events: Event[] }; // e.g. killServer(2)
  describe(state: State): string; // plain-language snapshot for screen readers / transcript
}
// runner: run(model, params, seed, actions: {tick, action}[], ticks) → Frame[]
```

- **Seeded PRNG** (for example mulberry32). Same inputs give identical frames, so tests snapshot exact outcomes.
- **User actions are recorded** as `(tick, action)`. Changing a parameter or injecting a failure re-runs from the seed, which makes backward stepping and restart exact.
- **Shareable scenarios:** `params + seed + actions` serialize into the URL hash. No server is needed.
- **Bounded:** each scenario has a tick cap and entity caps (for example at most 60 in-flight packets rendered, with the rest aggregated), so mobile stays smooth.
- Models report **illustrative metrics** (throughput, p50/p95 latency, hit ratio, backlog) clearly labeled as model outputs, never as benchmarks.

### 5.3 Playback & rendering

- `usePlayback` runs **one `requestAnimationFrame` loop per player** that advances the frame index by speed (0.5×/1×/2×/4×). It pauses automatically when the tab is hidden or the player scrolls offscreen.
- Scenes are **thin SVG compositions** of primitives. Motion interpolates between frames using transforms and opacity only, with no layout-triggering properties.
- **SSR frame 0:** scenes are client components but still server-render their first frame and the full step transcript. Pages are meaningful before hydration, there is no layout shift (fixed aspect-ratio container), and crawlers see real content.
- Heavy scenes are imported lazily through the generated registry.

### 5.4 Accessibility & reduced motion

- Controls are real `<button>`s with labels. Keyboard map: `Space` play/pause, `←/→` step, `Home` restart, `[`/`]` speed. Shortcuts are scoped to the focused player and documented in-UI.
- `Narration` is an `aria-live="polite"` region announcing each step. `Transcript` is a collapsible ordered list of every step, and simulations add a data table of metrics.
- **`prefers-reduced-motion`:** tweening is disabled, frames change instantly, and autoplay is off (the player starts in step mode). A site-level override toggle is stored locally.
- State is never conveyed by color alone: healthy, degraded, and failed nodes differ by icon, outline style (solid/dashed/struck), and text label.
- Interactive elements in the SVG are focusable `<g role="button">` items with `aria-label`, or overlay buttons where SVG focus is unreliable.
- **Depth lens (Simple / Technical / Production):** all content is in the HTML. The lens filters which `<Lens>` blocks are emphasized or collapsed, so nothing is hidden from crawlers or screen readers.

### 5.5 Phase 2 demonstrations (built before scaling content)

1. **Load balancer**: the full simulation, proving params, failure injection, metrics, and the event log.
2. **TLS 1.3 handshake**: a walkthrough, proving narration, transcript, and step navigation.
3. **Kubernetes self-healing**: a simulation with a reconciliation loop, proving controller-style state and action replay.

These three cover every engine path. If one feels wrong, the engine changes before twelve lessons depend on it.

---

## 6. Lesson anatomy

Fixed order. Sections that don't fit a topic are omitted rather than padded.

1. Header: title, one-sentence definition, difficulty, reading time, prerequisites, last reviewed
2. **The problem** (why this exists)
3. **Analogy**, visually marked _Analogy — not literal_
4. **Visualization** (interactive) with Teaching-model notice
5. **Step by step** (synced with the player's steps where applicable)
6. **Under the hood**: real terminology, protocol or algorithm detail
7. **Example**: code or configuration (Shiki-highlighted at build time, zero runtime JS)
8. **In production**: realistic scenario
9. **Trade-offs**: when to use / when to avoid
10. **Common misconceptions**
11. **Failure modes & debugging**
12. **Security & operations**
13. **Interview questions** with model answers (collapsible)
14. **Knowledge check** (quiz, including predict-before-play where it fits)
15. **References** (official docs and specs first) · **Related lessons** · Previous/next

**Content rules enforced in review** (and in the PR template checklist): define jargon before using it; expand acronyms on first use; separate analogy from fact; no invented benchmarks, citations, or guarantees; illustrative numbers labeled; at least two authoritative references; `lastReviewed` set.

**Correctness caveat:** I will write lessons against official documentation and specs (RFCs, Kubernetes docs, Docker docs, AWS docs, PostgreSQL docs, and so on) and cite them. I cannot guarantee expert-level accuracy on every nuance. I recommend a human subject-matter review of at least the Kubernetes, TLS, and RAG lessons before public launch, and I will list anything I'm unsure of in each lesson's PR notes.

---

## 7. Design direction: "Blueprint"

**Concept:** an engineer's drafting table at night. A deep graphite canvas, precise thin linework, one cool signal color, and editorial typography. The light theme is "printed blueprint on paper": warm off-white with ink-dark text, not an inverted dark theme.

### 7.1 Tokens (Tailwind v4 `@theme`, OKLCH, CSS variables)

| Token                        | Dark                                  | Light                         | Use                                      |
| ---------------------------- | ------------------------------------- | ----------------------------- | ---------------------------------------- |
| `--bg`                       | `oklch(0.16 0.01 260)` graphite       | `oklch(0.985 0.006 85)` paper | page                                     |
| `--surface`                  | `oklch(0.195 0.01 260)`               | `oklch(0.97 0.006 85)`        | panels, player                           |
| `--border`                   | `oklch(0.30 0.012 260)`               | `oklch(0.86 0.01 85)`         | 1px hairlines                            |
| `--fg` / `--fg-muted`        | `0.95` / `0.72` L                     | `0.20` / `0.45` L             | text (AA verified in Phase 1)            |
| `--accent`                   | `oklch(0.74 0.13 245)` blueprint blue | `oklch(0.50 0.15 255)`        | links, focus, active, request packets    |
| `--ok` / `--warn` / `--fail` | green / amber / red at tuned L/C      | darker variants               | status (always paired with icon + label) |
| `--data`                     | `oklch(0.78 0.10 185)` teal           | darker                        | response and data-flow packets           |

All pairs are contrast-checked in a unit test that computes WCAG ratios from the token values. Subtle background treatment: a faint, static 24px blueprint grid behind visualizations only (no animated backgrounds).

### 7.2 Typography

- **IBM Plex Sans** for UI and body, and **IBM Plex Mono** for code, diagram labels, and metrics. Both are OFL licensed and self-hosted via `next/font`. The family is technical and distinctive without being the default Inter/Geist look.
- Body is 17–18px at 1.65 line height with a 68ch measure. Headings use a tight scale and medium weight.

### 7.3 Layout & motion

- Lesson: left module nav (collapsible) · centered prose column · right sticky TOC. Visualizations **break out** to a wide column (up to about 1120px).
- Mobile: full-bleed visualizations with simplified scene variants where needed, a **sticky bottom control bar**, and the TOC in a sheet.
- Motion tokens: `--dur-fast 120ms`, `--dur-base 200ms`, `--ease-standard cubic-bezier(.2,0,0,1)`. UI motion is for orientation only, with no idle loops. Simulation tempo is separate and user-controlled.
- Designed empty, loading, error, not-found, and quiz-completion states. No lorem ipsum anywhere.

### 7.4 Home page

- Headline: **"Watch it work. Change it. Break it."** Subhead: _Interactive, open-source lessons on system design, AI engineering, infrastructure, and computer science._
- A **live, working mini load-balancer simulation** above the fold. It is real, small, and labeled as a teaching model, and it is the same model used in Lesson 1.
- Domain grid (7) · featured paths · featured lessons · "Open source — contribute a lesson" with the GitHub link.
- "Recently added" is derived from git or `lastReviewed` data and is hidden if not meaningful.
- No metrics, testimonials, star counts, or social proof.

---

## 8. Search, navigation & progress

- **Search:** build-time index of title (boost 4), description (2), tags (2), headings (1.5), and body text. Facets: domain, difficulty, type. `⌘K`/`Ctrl K` palette plus a full `/search` page. The index loads on first open (about 100–300 KB gzipped at v1 scale, to be measured).
- **Navigation:** breadcrumbs (also emitted as `BreadcrumbList` JSON-LD), previous/next within module and path, "Before you start" (prerequisites), related lessons, a TOC with scroll-spy, keyboard-reachable everything, and a helpful 404 that suggests search and domains.
- **Progress:** a `localStorage` store (`ve:progress:v1`) parsed with Zod and falling back safely if corrupt or unavailable, plus JSON export/import. Read-only state such as completed lessons, quiz scores, and path progress. It never blocks rendering.

---

## 9. Quality gates, testing & budgets

### 9.1 Test plan

| Layer      | Tool                                             | Covers                                                                                                                                                                                                                             |
| ---------- | ------------------------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Content    | Vitest + `scripts/content.ts`                    | schema validity, unique slugs, reserved slugs, refs resolve, prerequisite DAG acyclic, every visualization id registered, https references                                                                                         |
| Simulation | Vitest                                           | each model's state transitions, determinism (same seed gives the same frames), action replay, invariants (for example a ReplicaSet converges to desired replicas; a dead server receives no requests once health checks detect it) |
| Player     | Vitest + RTL                                     | play/pause/restart/next/prev, speed, keyboard shortcuts, reduced-motion (no autoplay, instant frames), aria-live announcements                                                                                                     |
| Search     | Vitest                                           | ranking sanity, filters, empty/no-result states                                                                                                                                                                                    |
| Components | RTL                                              | quiz grading and feedback, lens switching, TOC, theme toggle                                                                                                                                                                       |
| E2E        | Playwright (Chromium; desktop + mobile viewport) | home → lesson → interact with simulation → quiz; search → filter → open; 404; keyboard-only journey; reduced-motion emulation                                                                                                      |
| A11y       | `@axe-core/playwright`                           | zero serious/critical violations on every page type                                                                                                                                                                                |
| Perf       | Lighthouse CI (against built `out/`)             | budgets below                                                                                                                                                                                                                      |
| Contrast   | Vitest                                           | WCAG ratios computed from design tokens                                                                                                                                                                                            |

### 9.2 Performance budgets

These are targets to measure, not claims.

- First-load JS on a lesson page, excluding the lazily loaded scene: **≤ 150 KB gzipped**. Each scene chunk: **≤ 60 KB gzipped** (React Flow playgrounds exempt; tracked separately).
- Lighthouse mobile (simulated): Performance **≥ 90**, Accessibility **≥ 95** (goal 100), Best Practices **≥ 95**, SEO **≥ 95**.
- LCP < 2.5s and CLS < 0.1 in lab conditions. INP is a field metric; the lab proxy is TBT < 200ms.
- Bundle sizes are reported in the CI summary so regressions are visible in PRs.

### 9.3 CI (`.github/workflows/ci.yml`)

`install (frozen lockfile)` → `lint` → `format:check` → `typecheck` → `content:validate` → `test` → `build` → `e2e + axe` (against `out/`) → `lighthouse` (budgets asserted). Node 24 LTS, pnpm cache, `permissions: contents: read`, actions pinned by SHA, concurrency cancel-in-progress. Dependabot runs weekly for npm (grouped by ecosystem) and github-actions.

---

## 10. SEO

- `metadataBase` comes from `NEXT_PUBLIC_SITE_URL`. **No domain is invented.** Until one is set, canonical URLs and the sitemap's absolute URLs are omitted and the build warns.
- Per-page `title` and `description` come from validated metadata. Open Graph images are generated per lesson via `opengraph-image.tsx` (support under static export will be verified in Phase 1, with a fallback of build-time PNG generation).
- JSON-LD: `LearningResource` (or `TechArticle`) per lesson with `educationalLevel`, `teaches`, `dateModified`, plus `BreadcrumbList`, validated against schema.org types.
- Domain landing pages carry real introductory prose, not only lesson lists. Internal linking comes from prerequisites, related lessons, glossary terms, and paths.
- Descriptive URLs without keyword stuffing: `/containers/kubernetes-self-healing`, `/ai/how-rag-works`.

---

## 11. Phased delivery

Each phase ends with a report in your requested 9-point format, plus actual command output for tests and builds. **Work stays local and uncommitted to any remote until you approve publication.**

| Phase                     | Deliverables                                                                                                                                                                                                                                                                                                                                                                                                                  | Exit criteria (verified, not assumed)                                                                                                                              | Size |
| ------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ---- |
| **0 — Plan**              | This document                                                                                                                                                                                                                                                                                                                                                                                                                 | Your approval and answers to §13                                                                                                                                   | done |
| **1 — Foundation**        | `pnpm create next-app` baseline pinned to the versions above; strict TS; ESLint/Prettier; Tailwind tokens; light/dark theme without flash; app shell (header, nav, footer, skip link, breadcrumbs); route skeletons with real empty states; Zod schemas plus `scripts/content.ts`; one sample lesson end to end; Vitest/RTL/Playwright/axe wired; CI workflow + Dependabot; README skeleton; ADRs 0001–0008; local `git init` | `pnpm lint typecheck test build e2e` all pass locally, output pasted; static `out/` serves with real 404s                                                          | M    |
| **2 — Engine**            | `lib/simulation` (rng, runner, timeline); player components; primitives; the 3 demos from §5.5; reduced-motion; keyboard shortcuts; URL-hash scenarios; animation authoring guide                                                                                                                                                                                                                                             | Unit tests for 3 models plus player; E2E interaction on all 3; axe clean; Lighthouse run on a demo lesson with actual scores reported                              | L    |
| **3a — Lessons 1–6**      | Six complete lessons, quizzes, glossary entries                                                                                                                                                                                                                                                                                                                                                                               | Content validation passes; **checkpoint with you on tone, depth and accuracy** before 3b                                                                           | L    |
| **3b — Lessons 7–12**     | Remaining six, plus stretch lessons if quality allows                                                                                                                                                                                                                                                                                                                                                                         | Same                                                                                                                                                               | L    |
| **4 — Platform features** | Search page and ⌘K; filters; learning paths; glossary; interview hub; related/prev/next; progress tracking; **System Design Sandbox v0** (fixed topology: LB, servers, cache, DB; traffic, capacity, failures; reuses models); home page final                                                                                                                                                                                | Search/filter/progress tests; journeys E2E; mobile/tablet/desktop screenshots reviewed                                                                             | L    |
| **5 — Quality & docs**    | Accessibility pass (axe, keyboard-only, VoiceOver spot checks), Lighthouse budgets enforced, perf fixes, CONTRIBUTING, lesson authoring guide, SECURITY, CODE_OF_CONDUCT (Contributor Covenant 2.1), LICENSE, issue/PR templates, CODEOWNERS, roadmap, "How this platform works" page                                                                                                                                         | All gates green in a clean clone; known limitations documented                                                                                                     | M    |
| **6 — Release gate**      | Release checklist: repo name/visibility, file list, license, test/build output, Gitleaks result, limitations, deploy config, **exact git/gh commands**                                                                                                                                                                                                                                                                        | **Your explicit approval**, then create repo, push, set topics, enable security features, deploy, and verify URL, visibility, default branch, files, and CI status | S    |

**Approval gates:** after Phase 0 (now) · after 3a (content checkpoint) · Phase 6 (any remote or public action). You can also ask to review at any phase boundary.

---

## 12. Post-v1 roadmap

Ordered by the central promise. Each item gets its own ADR and plan before implementation.

1. **System Design Simulator (full):** drag-and-connect builder (React Flow, lazy-loaded) on the same deterministic models; traffic spikes, failures, bottleneck highlighting, side-by-side architecture comparison under identical seeded workloads.
2. **AI Engineering Playground:** chunking visualizer, keyword vs vector search comparison, prompt/context/tool-call inspector, token budget and cost estimator with explicitly illustrative pricing inputs, an agent loop and MCP walkthrough. All deterministic mock data; no API key.
3. **Break-and-Fix / Production Incident Simulator:** fictional incidents (latency spike, crash-looping pod, DNS misconfiguration, queue backlog, slow query) with synthetic logs, metrics, traces, and deploy history; hypothesis → investigate → fix → debrief.
4. **System Design Interview Arena:** prompt + constrained components + **transparent, rule-based rubric** (graph analysis for single points of failure, redundancy, caching for read-heavy load, async for spikes) plus a self-assessment rubric for written reasoning. All rules published; no opaque scoring.
5. **Trade-off Explorer & Capacity Planning Lab:** change assumptions and see the recommendation shift, with every formula and assumption displayed.
6. **Visual code execution:** event loop, call stack/heap, recursion, data structure mutation, using **pre-traced curated programs** (no arbitrary code execution).
7. **Knowledge map** from the prerequisite DAG plus local progress; predict-before-play everywhere.
8. Case studies (the 12 from the brief), observability lab, security attack simulations (safe, isolated, no live payloads), cloud cost explorer, architecture evolution and migration planner.
9. Narration via the browser Web Speech API with captions; offline mode via a service worker; i18n; optional bring-your-own-key AI tutor kept outside the core experience.

---

## 13. Decisions needed from you

1. **Approve this plan** (or tell me what to change: scope, lesson list, design direction, stack).
2. **Hosting target**, which affects ADR-0009, security headers, and URLs:
   - **Vercel (recommended):** free hobby tier, zero config for Next, supports security headers via `vercel.json`, preview deploy per PR. Requires your Vercel account to be connected to GitHub.
   - **Cloudflare Pages:** free, `_headers` file for CSP, fast global edge. Requires a Cloudflare account.
   - **GitHub Pages:** no extra account, but **cannot set HTTP headers** (CSP only via `<meta>`, no `frame-ancestors`), and without a custom domain everything lives under `/visual-engineering` (`basePath`).
   - **Decide later:** I build host-agnostic static output and add deploy config in Phase 6.
3. **Domain:** do you have one? If not, I will omit canonical URLs and absolute sitemap URLs until you do.
4. **License:** **MIT for code + CC BY 4.0 for lesson prose and diagrams** (recommended; the common model for educational open source, and it requires attribution on reuse of content), or MIT for everything.
5. **Repository timing:** keep everything **local until Phase 6** (as your brief specifies), or create the public repo **at the end of Phase 1** so CI runs on real PRs during development. The second option still requires your explicit go-ahead at that point.
6. **Optional:** replace the broad classic PAT with a token scoped to `repo` + `workflow`.

---

## 14. Risks

| Risk                                                         | Impact                          | Mitigation                                                                                                                |
| ------------------------------------------------------------ | ------------------------------- | ------------------------------------------------------------------------------------------------------------------------- |
| Scope (the brief describes 250+ lessons and 10+ major tools) | Shallow content, never shipping | v1 limited to engine + 12 lessons + core platform; everything else is sequenced post-v1                                   |
| Technical accuracy of lessons                                | Credibility                     | Official-source citations, `lastReviewed`, uncertainty flagged in PRs, SME review recommended for Kubernetes/TLS/RAG      |
| Simulations read as benchmarks                               | Misleading learners             | Mandatory `assumptions` field rendered as a Teaching-model notice; illustrative labels on all numbers                     |
| Next 16.4.0 is 6 days old                                    | Regressions                     | Exact pin; fall back to 16.3.8 if Phase 1 hits a blocking bug; Dependabot for patches                                     |
| TS 7 / lint ecosystem lag                                    | Toolchain breakage              | Pin TS 6.0.3 (ADR-0006)                                                                                                   |
| Static export limits (no headers/redirects)                  | Weaker CSP on some hosts        | Host choice (§13); CSP meta fallback; documented                                                                          |
| Animation performance on low-end mobile                      | Jank, battery                   | Transform-only tweens, one rAF loop per player, offscreen pause, entity caps, simplified mobile scenes, Lighthouse in CI  |
| Accessibility of complex visuals                             | Exclusion                       | Transcript + live narration + data tables; keyboard map; reduced-motion step mode; axe in CI; manual screen-reader checks |
| MDX contributions are executable                             | Supply-chain / XSS via PR       | Review-only merges, CODEOWNERS, no runtime MDX, CI on forks with read-only token                                          |
| Bundle creep (Motion, React Flow, Radix)                     | Slow pages                      | Budgets enforced in CI; React Flow only on playground routes; per-scene lazy chunks                                       |

**Costs:** $0 expected. Public repos get GitHub Actions minutes free; Vercel, Cloudflare Pages, and GitHub Pages free tiers are sufficient for a static site; no paid APIs.

---

## Decision log (since approval)

| Date       | Decision                                                                                                                           | Notes                                                                                                                                                                                                                                                                                                                                                                                           |
| ---------- | ---------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 2026-10-12 | Plan approved; create the public repository now rather than at Phase 6                                                             | So CI runs from the start                                                                                                                                                                                                                                                                                                                                                                       |
| 2026-10-12 | Hosting: **GitHub Pages** via Actions, only after CI passes                                                                        | ADR-0009 · <https://aqkprogrammer.github.io/visual-engineering/>                                                                                                                                                                                                                                                                                                                                |
| 2026-10-12 | Domain: GitHub Pages project URL for now                                                                                           | Canonicals and sitemap use it; a custom domain needs no code change                                                                                                                                                                                                                                                                                                                             |
| 2026-10-12 | License: **MIT for everything** (code and content)                                                                                 | ADR-0010                                                                                                                                                                                                                                                                                                                                                                                        |
| 2026-10-12 | Cache Components / Partial Prefetching disabled                                                                                    | Not useful for a fully static site; incompatible with `force-static` route handlers (ADR-0001)                                                                                                                                                                                                                                                                                                  |
| 2026-10-12 | ESLint 10 instead of 9                                                                                                             | ESLint 9 is end-of-life; Next's plugins work on 10 despite their peer ranges (ADR-0008)                                                                                                                                                                                                                                                                                                         |
| 2026-10-12 | radix-ui 1.7.0, zod 4.6.5, vitest 5.0.3                                                                                            | pnpm's minimum-release-age guard rejected the day-old releases; we pin the previous ones instead of bypassing it                                                                                                                                                                                                                                                                                |
| 2026-10-12 | MDX excluded from Prettier                                                                                                         | Prettier reflowed Markdown nested inside JSX and merged an ordered list; an E2E test now guards it                                                                                                                                                                                                                                                                                              |
| 2026-10-12 | Shiki GitHub **high-contrast** themes                                                                                              | Default GitHub themes failed axe colour-contrast on our surfaces                                                                                                                                                                                                                                                                                                                                |
| 2026-10-12 | README generated from real data                                                                                                    | `scripts/readme.ts` renders the animated banner from design tokens and the curriculum from `content/`; CI fails if it is stale                                                                                                                                                                                                                                                                  |
| 2026-10-12 | Commits carry no AI co-author trailer                                                                                              | Maintainer preference                                                                                                                                                                                                                                                                                                                                                                           |
| 2026-10-12 | Phase 2: every control change is a recorded action                                                                                 | Parameter changes take effect "now" without rewriting the past (ADR-0003)                                                                                                                                                                                                                                                                                                                       |
| 2026-10-12 | Phase 2: CSS transitions instead of Motion                                                                                         | Frames are precomputed; `motion` removed (ADR-0004)                                                                                                                                                                                                                                                                                                                                             |
| 2026-10-12 | Phase 2: demos live at `/playground`; the load balancing lesson embeds its simulation                                              | TLS and Kubernetes lessons arrive in Phase 3                                                                                                                                                                                                                                                                                                                                                    |
| 2026-10-12 | Measured JavaScript (compressed transfer): content pages 158 KB, playground pages 173 KB                                           | React + Next.js runtime is ~150 KB of that, so the §9.2 "≤ 150 KB first load" target is not achievable with this stack. New budget: own code ≤ 25 KB on content pages and ≤ 40 KB on demo pages (currently ~8 KB and ~23 KB). Lighthouse budgets in Phase 5                                                                                                                                     |
| 2026-10-12 | Known: Turbopack merges a ~6 KB chunk containing the load balancer simulation into every page                                      | Small; revisit with chunking configuration in Phase 5                                                                                                                                                                                                                                                                                                                                           |
| 2026-10-12 | Phase 3a lesson set: load balancing, TLS 1.3, Kubernetes self-healing, caching, rate limiting, embeddings                          | TLS and Kubernetes pulled forward because their demos existed; B-trees moved to 3b. Covers four domains before the content checkpoint                                                                                                                                                                                                                                                           |
| 2026-10-12 | Every published lesson must have a knowledge check (`quiz.ts`), validated at build time                                            | Exactly one correct option per question, explanations for every option                                                                                                                                                                                                                                                                                                                          |
| 2026-10-12 | Quiz options are shown in a stable, seeded shuffle                                                                                 | Authors tended to put the correct answer second; a test now checks no display position holds more than half the correct answers                                                                                                                                                                                                                                                                 |
| 2026-10-12 | Playground demo kinds: simulation, walkthrough, explorer                                                                           | The embeddings explorer is interactive but not time-based                                                                                                                                                                                                                                                                                                                                       |
| 2026-10-13 | Phase 3b: database indexes (B+ tree), DNS, RAG, Docker images and layers, tokenization, message queues                             | Completes the 12-lesson target, each with an interactive demo and quiz; 12 playground demos in total                                                                                                                                                                                                                                                                                            |
| 2026-10-13 | RAG demo uses a transparent word-overlap scorer and pre-written answers                                                            | Keeps it key-free and deterministic while showing real failure modes: outdated retrieval, conflicting sources, grounded refusal                                                                                                                                                                                                                                                                 |
| 2026-10-13 | Phase 4 split into 4a (search, learning paths, glossary, local progress) and 4b (interview hub, incident lab, sandbox)             | Keeps each pull request reviewable                                                                                                                                                                                                                                                                                                                                                              |
| 2026-10-13 | Search: own scorer, no library; index embedded in the `/search` page                                                               | 58 terms + 28 other entries ≈ 19 KB gzipped HTML, no extra request. Stemmed whole-word, prefix and one-typo matching; title and aliases weigh most. `⌘K` palette and facets deferred — the header links to `/search`                                                                                                                                                                            |
| 2026-10-13 | Four learning paths; validation requires every step's prerequisites to appear earlier in the path                                  | §3.4 listed seven planned paths; only paths that can be built from published lessons exist                                                                                                                                                                                                                                                                                                      |
| 2026-10-13 | Progress: `localStorage` key `ve:progress`, versioned record, hand-written validation instead of Zod                               | Keeps Zod out of every page's bundle. Completion is an explicit "Mark as complete"; finished knowledge checks store best and last score; reset needs confirmation. Export/import deferred                                                                                                                                                                                                       |
| 2026-10-13 | Glossary: 58 plain-language terms, each linked to the lesson that explains it                                                      | Validated: unique ids and names (including aliases), published lessons, resolvable related terms                                                                                                                                                                                                                                                                                                |
| 2026-10-13 | Fixed: every page shipped every simulation (~37 KB gzipped on main)                                                                | Cause: the generated registry imported all lesson MDX, so each route that read the catalog bundled every scene. Lesson bodies now live in `content/.generated/bodies.ts` (lesson route only) and lessons embed demos with a lazy `<Demo slug>`; `pnpm content` rejects direct scene imports. This also removes the ~6 KB load-balancer chunk noted above                                        |
| 2026-10-13 | Measured JS (sum of gzip -9 of each `<script>` on the page), main → this branch                                                    | Home and other non-demo pages 233 → 177 KB; lesson pages 234 → 190 KB; playground pages 234 → 179 KB, plus the page's own scene chunk loaded on demand. Not comparable with the 2026-10-12 row, which used a different method                                                                                                                                                                   |
| 2026-10-13 | Primary navigation collapses to the menu below 768 px (was 640 px)                                                                 | Five links plus GitHub, search and theme no longer fit at 640 px                                                                                                                                                                                                                                                                                                                                |
| 2026-10-13 | Phase 4b scope: interview hub and incident lab; the system design sandbox becomes Phase 4c                                         | The sandbox is the largest feature and gets its own pull request                                                                                                                                                                                                                                                                                                                                |
| 2026-10-13 | Interview questions move from MDX blocks to a typed `interview.ts` per lesson                                                      | 49 questions migrated by script; each now has a level, a kind and a published rubric (core points, strong signals, red flags). Lesson pages and `/interview` render from the same data; answer words still count towards reading time                                                                                                                                                           |
| 2026-10-13 | Interview self-grading uses a published, rule-based verdict                                                                        | Strong / Solid / Partly there / Not there yet, from ticked rubric points; the rules are shown next to the checklist. Answers typed in practice are kept in memory only                                                                                                                                                                                                                          |
| 2026-10-13 | Incident lab evidence is produced by the simulation models, not drawn by hand                                                      | Four incidents (queue backlog, health-check window, LRU scan, node eviction). Unit tests assert each chart and log shows what the briefing and answers claim. The load-balancer incident uses slower checks than the demo (500 ms × 3), proportionate to common real settings                                                                                                                   |
| 2026-10-13 | Primary navigation collapses below 1024 px; About moves to the menu and footer                                                     | Six links (Explore, Paths, Playground, Interview, Incidents, Glossary) plus GitHub, search and theme don't fit at 768 px                                                                                                                                                                                                                                                                        |
| 2026-10-13 | Search ranks glossary terms above interview questions on ties, and aliases count as titles for phrases                             | "idempotent" finds the glossary definition before the interview question that contains the word                                                                                                                                                                                                                                                                                                 |
| 2026-10-13 | Sandbox as a structured architecture builder, not a free-form canvas                                                               | Fixed slots (app servers, cache, replicas, write queue, primary) keep it keyboard- and screen-reader-operable and need no graph library. A table repeats the diagram's numbers                                                                                                                                                                                                                  |
| 2026-10-13 | Sandbox model: capacity-based request flow with a 1 / (1 − utilisation) latency approximation                                      | Illustrative capacities, labelled as such. Shows that latency rises well before errors appear. Overload fails requests rather than retrying                                                                                                                                                                                                                                                     |
| 2026-10-13 | Four sandbox challenges with explicit goals (errors, latency, cost units, write wait)                                              | Tests check each starting design fails, a documented solution passes, and — by brute force over all 1,120 designs — that checkout needs the queue and the catalogue needs the cache, as their hints claim                                                                                                                                                                                       |
| 2026-10-13 | Page-weight budgets enforced by `scripts/budget.ts`: 215 KB initial JS, 60 KB per page-specific chunk, 80 KB HTML                  | Counts `<script>` tags and script preloads. Correction: earlier "lesson pages ≈ 190 KB" excluded each page's preloaded simulation chunk; measured with it, lesson and demo pages are 199–202 KB                                                                                                                                                                                                 |
| 2026-10-13 | Lighthouse budgets enforced in a CI job (`scripts/lighthouse.ts`), using Playwright's Chromium                                     | `lighthouse` + `chrome-launcher` instead of Lighthouse CI, for fewer dependencies. Median of three mobile runs. Local runs on a loaded machine vary (LCP 1.6–3.8 s for the same page); CI is the reference                                                                                                                                                                                      |
| 2026-10-13 | On phones, any simulation can be enlarged into a horizontally scrollable view                                                      | A general fix in the player instead of 13 phone-specific layouts; the page itself never scrolls sideways (tested)                                                                                                                                                                                                                                                                               |
| 2026-10-13 | Code of conduct adopts the Contributor Covenant 2.1 by reference                                                                   | Links the official text rather than reproducing it; reports go to the maintainer privately                                                                                                                                                                                                                                                                                                      |
| 2026-10-13 | Known: `braces` advisory (GHSA-vfj7-8cjw-p6xm) in a dev-only ESLint dependency, no patched release yet                             | Not in the deployed site; the CI audit covers production dependencies. Override once a fix is published                                                                                                                                                                                                                                                                                         |
| 2026-10-13 | Search index moved to a static `/search-index.json`, fetched after the search page renders                                         | As §8 originally planned. The search page's HTML falls from 73 KB to 26 KB; space for results is reserved to avoid layout shift                                                                                                                                                                                                                                                                 |
| 2026-10-13 | Monospace font no longer preloaded; rubric markers drawn in CSS instead of SVG icons                                               | Fewer bytes competing for first paint, and the interview page's DOM drops from 5,334 to 3,554 elements                                                                                                                                                                                                                                                                                          |
| 2026-10-13 | Lighthouse budgets use the median of five runs (was three)                                                                         | Identical code on CI measured caching-lesson TBT 90 ms then 203 ms, and sandbox LCP 1.96 s then 2.63 s. The budgets themselves are unchanged                                                                                                                                                                                                                                                    |
| 2026-10-13 | Cache model copies only the state a step changes, instead of `structuredClone`                                                     | Its 300 frames are precomputed during hydration: 20 ms → 1 ms on a desktop CPU (×4 on Lighthouse's phone profile), the main cause of the caching lesson's borderline TBT                                                                                                                                                                                                                        |
| 2026-10-13 | LCP and TBT become warning budgets; category scores and CLS still fail CI                                                          | Maintainer decision. With identical code, CI measured home-page LCP at ~1.96 s or ~2.58 s (LCP element: server-rendered hero text, ~40–110 ms render delay); performance stayed 97–99. Both metrics still feed the performance score, which is a failing budget                                                                                                                                 |
| 2026-10-13 | Phase 7a: cloud lessons — Regions and Availability Zones, blue-green and canary deployments, autoscaling                           | Each with a new deterministic demo. Facts checked against AWS (fault isolation boundaries, static stability, target tracking, cooldowns), Kubernetes (HPA, Deployments) and Google's SRE workbook (canarying). Unit tests pin every behaviour the lessons describe                                                                                                                              |
| 2026-10-13 | New learning path: Running applications in the cloud; the deployments lesson also joins the containers path                        | Load balancing → zones → autoscaling → deployments                                                                                                                                                                                                                                                                                                                                              |
| 2026-10-13 | Phase 7b: software architecture lessons — monoliths and microservices, hexagonal architecture, event sourcing and CQRS             | Two new simulations and one explorer. Facts checked against Fowler and Lewis (microservices, MonolithFirst, CQRS), Dean and Barroso (The Tail at Scale), Microsoft's Event Sourcing pattern, Cockburn (hexagonal architecture) and Martin (Clean Architecture). Unit tests pin every behaviour the lessons describe                                                                             |
| 2026-10-13 | The hexagonal demo is a static explorer over a hand-written change-impact table                                                    | Labelled as one plausible layered design; tests check the table's internal consistency and the lesson's claims                                                                                                                                                                                                                                                                                  |
| 2026-10-14 | Phase 8: targeted state copies for the load balancer, queue, rate limiter, Kubernetes and B+ tree models                           | Same approach as the cache model. Per 300–400-tick run on a desktop CPU: load balancer 16.0 → 2.5 ms, queue 14.5 → 0.7 ms, rate limiter 8.7–14.6 → 0.4–0.5 ms, Kubernetes 2.4 → 0.3 ms. Fingerprint tests pin outputs to the `structuredClone` versions; deep-frozen inputs make any mutation of an earlier frame throw                                                                         |
| 2026-10-14 | Progress export and import as a JSON file; imports merge rather than replace                                                       | Moving between browsers without an account or server. Merging never loses progress: earliest completion date, latest quiz attempt, best score only when the question count matches. Files over 256 KB, invalid JSON and other versions are rejected with a reason                                                                                                                               |
| 2026-10-14 | Sandbox designs are shareable as readable query strings, applied after hydration                                                   | `?scenario=…&app=…&cache=…&failures=12f.20c`. Decoding accepts only values the controls offer (bad values fall back to the scenario's start, at most 50 failures), so a crafted link can't produce a state the UI can't. The button also updates the address bar; the clipboard has a visible fallback                                                                                          |
| 2026-10-24 | Phase 9: AI engineering playground — chunking, keyword/vector/hybrid search, context-window budgets                                | Three lessons, each with a deterministic explorer, no API calls. Facts checked against Elastic (BM25 defaults k1 = 1.2, b = 0.75; RRF rank constant 60), Cormack, Clarke and Büttcher 2009 (k = 60), Robertson and Zaragoza 2009, LangChain (recursive splitter separators), Anthropic (context windows, prompt caching, contextual retrieval numbers) and Liu et al. 2023 (lost in the middle) |
| 2026-10-24 | Keyword search in the hybrid demo is real BM25; vector search is a hand-written concept lexicon, labelled as such                  | Learners can read why each article matched. Real embeddings are opaque; a toy one makes the failure modes (unknown codes, paraphrases) inspectable. Unit tests pin BM25 to the textbook formula and every example's ranking                                                                                                                                                                     |
| 2026-10-24 | Context-budget demo treats reserved output as a hard limit and uses illustrative token counts and prices                           | APIs differ: some reject input plus maximum output over the window, others accept and stop early; the assumptions say so. Prices are round numbers, not any provider's                                                                                                                                                                                                                          |
| 2026-10-24 | AI path extended to six lessons: tokens → context windows → embeddings → RAG → chunking → hybrid search                            | Context windows right after tokens (both are about what a request costs); chunking and hybrid search after RAG, which introduces them                                                                                                                                                                                                                                                           |
| 2026-10-24 | Six Dependabot updates combined into one PR with a single regenerated lockfile, then released as v1.2.0                            | Avoids six sequential lockfile rebases; the originals were closed with a link to #22                                                                                                                                                                                                                                                                                                            |
| 2026-10-24 | Phase 10a: AI agents lesson with a scripted agent-loop walkthrough                                                                 | Facts checked against the MCP specification (2026-07-28: tools/list, tools/call, isError, human-in-the-loop guidance, server and client security duties), Anthropic's tool-use docs and "Building effective agents", and OWASP's 2025 LLM Top 10 (LLM01 prompt injection, LLM06 excessive agency)                                                                                               |
| 2026-10-24 | The agent demo's model is a hand-written script, labelled as such                                                                  | Real model behaviour under prompt injection is not deterministic; a script shows the failure honestly and lets the defences (validation, approval, step limits) be compared on identical runs                                                                                                                                                                                                   |
| 2026-10-24 | Phase 10b: replication and sharding lessons, with a replication simulation and a sharding explorer                                 | Facts checked against PostgreSQL's replication documentation (asynchronous by default, loss proportional to delay, synchronous_commit levels, commits that may never complete without a synchronous standby), the Dynamo paper (virtual nodes, R + W > N, (3,2,2)), Cassandra's architecture docs (tokens, QUORUM) and DynamoDB's partition-key guidance (3,000 RCU / 1,000 WCU per partition)  |
| 2026-10-24 | Replication demo: a steady stream of writes from all users, plus one user's profile save every second                              | An earlier draft with one writer made stale reads near-constant and failover loss depend on luck; with background writes, loss on failover is always visible and proportional to lag, as PostgreSQL describes                                                                                                                                                                                   |
| 2026-10-24 | Sharding explorer hashes with FNV-1a plus a mixing step over 600 keys                                                              | Small and deterministic; unit tests pin modulo moving about 80% of keys, one-token rings being roughly 2× unbalanced, and 64 virtual nodes moving within 3 points of the 20% minimum                                                                                                                                                                                                            |
| 2026-10-24 | Phase 11: knowledge map at /map — rows by domain, prerequisite links, learning paths as numbered routes, progress from the browser | Prerequisites alone are sparse (9 links), so paths carry most of the structure. Links that span rows run through column gutters; tests assert no link crosses a box. Titles are never truncated, because axe requires a link's visible text to match its name                                                                                                                                   |
| 2026-10-24 | Sandbox comparison runs design B with the same traffic, seed and actions (scripted and user-injected) as design A                  | Only then is the comparison fair. Differences below a small tolerance count as ties so rounding noise doesn't name a winner                                                                                                                                                                                                                                                                     |
| 2026-10-24 | Resilience lesson: a fluid-flow retries model with a FIFO dependency that still does work for timed-out calls                      | Wasted work is what makes a retry storm self-sustaining (a metastable failure). Facts checked against the Amazon Builders' Library (p99.9 timeouts, 3^5 = 243 amplification, retry token buckets since 2016), AWS's backoff-and-jitter analysis (no jitter is 'the clear loser'), Martin Fowler and Microsoft (breaker states)                                                                  |
| 2026-10-24 | v1.4.0 tagged only after main CI and the deploy both reported success                                                              | Process fix after v1.3.0 was tagged before a (transient) main CI failure was noticed                                                                                                                                                                                                                                                                                                            |
| 2026-10-24 | Dev-only fast-uri advisories fixed with a pnpm override to 3.1.9                                                                   | Dependabot's security updates fail for transitive dependencies; the override mirrors the existing one for compression                                                                                                                                                                                                                                                                           |

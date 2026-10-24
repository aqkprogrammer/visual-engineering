# Changelog

All notable changes to this project are recorded here. The format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/), and versions follow [Semantic Versioning](https://semver.org/).

## [Unreleased]

### Added

- **CAP, PACELC and consistency models** — a lesson and simulation: replicate a likes counter across three regions, cut one off, and compare a majority quorum (consistent, slower, refuses the cut-off side), last-writer-wins (fast, but one side's likes vanish on healing) and a merging CRDT counter (nothing lost). With 5 new glossary terms.

## [1.5.0] — 2026-10-24

Connections and speed: a knowledge map, design comparisons, quick search, and lessons on resilience and CDNs — 26 lessons and 27 demos in all.

### Added

- **Knowledge map** (`/map`) — every lesson on one map, row by domain, with arrows to the lessons that build on each one and every learning path drawn as a numbered route. Lessons you've completed, and the ones you're ready for, are marked from the progress saved in your browser.
- **Compare two sandbox designs** — run a second design under exactly the same traffic and failures, and compare goals, cost, requests served, worst error rate and latency, and the usual bottleneck side by side.
- **Quick search** — press ⌘K or Ctrl+K on any page to search lessons, demos, paths, incidents, interview questions and terms, and jump straight to a result with the arrow keys and Enter. It loads only when first used, so pages are no heavier.
- **CDNs and edge caching** — a lesson and simulation: serve three regions from one origin or from edge caches, publish an update and watch long TTLs serve old pages, purge every cache and see the origin burst, and add stale-while-revalidate and an origin shield. With 4 new glossary terms.
- **Timeouts, retries and circuit breakers** — a lesson and simulation: slow a dependency for five seconds and watch immediate retries keep it overloaded long afterwards, backoff fail to help on its own, and a retry budget or circuit breaker let it recover. The first lesson in the Resilience module, with 4 new glossary terms.

### Changed

- Fonts are bundled with the site from the Fontsource packages instead of being downloaded from Google during the build, which had failed intermittently. The same IBM Plex fonts, still one preloaded file.
- `fast-uri`, used only by development tools, is pinned to 3.1.9 for four security advisories.

## [1.4.0] — 2026-10-24

Agents, replication and sharding: three lessons, each with its own demo — 24 lessons and 25 demos in all.

### Added

- **AI agents, tool calling and MCP** — a lesson with a step-by-step agent loop: a support assistant refunds an order using tools from an MCP server, and you can break it with a timeout, a prompt injection hidden in a tool result, and a task that never finishes, then fix it with a step limit, human approval and server-side validation.
- The **AI engineering foundations** path ends with the agents lesson, and the glossary gains 4 terms.
- **Database replication** — a lesson and simulation: a leader streams changes to two followers; watch replication lag cause stale reads, fix them with read-your-writes, crash the leader and lose unshipped writes, and compare synchronous replication's safety and latency.
- **Sharding and consistent hashing** — a lesson and explorer: see hash modulo move 80% of keys when a node is added, consistent hashing move far fewer, virtual nodes even out the load, and a hot key overload one node whatever you do.
- The **System design foundations** path gains both lessons, and the glossary 12 terms.

## [1.3.0] — 2026-10-24

The AI engineering playground: three lessons on retrieval and context, each with its own explorer.

### Added

- **Three AI engineering lessons**, each with a new explorer: chunking documents for retrieval (fixed-size, sentence and structure-aware chunks, overlap and headings, and what each question can still find), keyword, vector and hybrid search (BM25, a toy embedding and reciprocal rank fusion, with recall@k), and context windows and token budgets (what fills a request, what to cut when it overflows, and what a conversation costs).
- The **AI engineering foundations** path now has six lessons, and the glossary 10 new terms.

## [1.2.0] — 2026-10-24

Polish: faster demos, portable progress and shareable sandbox designs.

### Added

- **Progress export and import.** Save your progress as a file from the learning paths page and import it in another browser. Imports are checked and combined with what is already there; nothing is replaced.
- **Shareable sandbox links.** "Copy link to this design" captures the scenario, the architecture, free-play traffic and any failures you injected, so someone else can open exactly the same run.

### Changed

- The load balancer, message queue, rate limiter, Kubernetes and B+ tree demos compute their timelines 6–30× faster by copying only the state each step changes.
- Dependencies: Next.js 16.4.2, React 19.3.1, Playwright 1.64.1, Vitest 5.0.5, ESLint 10.13.0, zod 4.6.7, lucide-react 1.58.0 and radix-ui 1.8.1.

## [1.1.0] — 2026-10-14

Every domain now has published lessons: 18 lessons, 19 interactive demos, 6 learning paths and 79 glossary terms.

### Added

- **Three cloud lessons**, each with a new simulation: Regions and Availability Zones (fail a zone, a region or the control plane, and see what static stability buys), blue-green and canary deployments (ship a buggy release four ways and count the failed requests), and autoscaling (target tracking against ramps, spikes and bursts).
- A **Running applications in the cloud** learning path, and 10 glossary terms.
- **Three software architecture lessons**: monoliths and microservices (watch failures and tail latency compound across service calls, then add timeouts and fallbacks), hexagonal architecture (an explorer comparing what five changes touch in a layered and a hexagonal design), and event sourcing and CQRS (an event log with read models that lag, catch up, rebuild and appear from history).
- A **Software architecture foundations** learning path, and 11 glossary terms.

## [1.0.0] — 2026-10-13

The first release: an open, static, accessible platform for learning how technology works by watching it, changing it and breaking it.

### Learn

- **12 lessons** in five domains — system design (load balancing, caching, rate limiting, message queues), networking (DNS, the TLS 1.3 handshake), containers (Docker images and layers, Kubernetes self-healing), AI engineering (tokenization, embeddings, retrieval-augmented generation) and computer science (database indexes). Each follows the same arc, from analogy to production failure modes, cites primary sources and shows when it was last reviewed.
- **Knowledge checks** for every lesson, with an explanation for every option.
- **4 learning paths**, ordered so every lesson comes after its prerequisites.
- **A glossary** of 58 plain-language terms, each linked to the lesson that explains it.
- **Search** across lessons, paths, demos, incidents, interview questions and glossary terms, entirely in the browser.
- **Progress** — completed lessons and knowledge-check scores, kept only in the reader's browser.

### Play

- **13 interactive demos** on one deterministic simulation engine and player: play, pause, step, scrub, change speed, inject failures, read the event log and each model's assumptions.
- **A system design sandbox** — build a backend from app servers, a cache, read replicas and a write queue, load-test it, and meet four challenges with explicit goals.

### Practise

- **49 interview questions** with model answers and a published rubric (core points, strong signals, red flags), with self-grading by a rule shown on the page.
- **An incident lab** — four production incidents to diagnose from charts and logs produced by the simulation models themselves, each with a postmortem and steps to reproduce it.

### Quality

- Content is typed and validated before every build; incident evidence is tested against the stories it supports.
- CI runs lint, strict types, 330+ unit and component tests, a static build, page-weight budgets, an internal link check, end-to-end journeys on desktop and phone (including keyboard-only journeys and a no-third-party-requests check), axe WCAG 2.2 AA audits of every page type in both themes, Lighthouse budgets and a full-history secret scan. The site deploys only when all of them pass.
- No accounts, analytics, cookies or third-party requests.

[Unreleased]: https://github.com/aqkprogrammer/visual-engineering/compare/v1.5.0...HEAD
[1.5.0]: https://github.com/aqkprogrammer/visual-engineering/releases/tag/v1.5.0
[1.4.0]: https://github.com/aqkprogrammer/visual-engineering/releases/tag/v1.4.0
[1.3.0]: https://github.com/aqkprogrammer/visual-engineering/releases/tag/v1.3.0
[1.2.0]: https://github.com/aqkprogrammer/visual-engineering/releases/tag/v1.2.0
[1.1.0]: https://github.com/aqkprogrammer/visual-engineering/releases/tag/v1.1.0
[1.0.0]: https://github.com/aqkprogrammer/visual-engineering/releases/tag/v1.0.0

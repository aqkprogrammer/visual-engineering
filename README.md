<div align="center">

<a href="https://aqkprogrammer.github.io/visual-engineering/">
  <picture>
    <source media="(prefers-color-scheme: dark)" srcset="docs/assets/hero-dark.svg">
    <img alt="Animated illustration: requests flow through a load balancer to three servers; when one fails its health checks, traffic is rerouted to the others." src="docs/assets/hero-light.svg" width="100%">
  </picture>
</a>

# Visual Engineering

**Complex engineering concepts. Made visual. Made simple.**

Interactive, open-source lessons on system design, AI engineering, containers, cloud, networking and computer science —<br>
built to be watched, changed and broken, not just read.

<p>
  <a href="https://aqkprogrammer.github.io/visual-engineering/"><b>🌐 Open the live site</b></a>
  &nbsp;·&nbsp;
  <a href="https://aqkprogrammer.github.io/visual-engineering/system-design/load-balancing/">▶️ Start the first lesson</a>
  &nbsp;·&nbsp;
  <a href="https://aqkprogrammer.github.io/visual-engineering/playground/">🕹️ Playground</a>
  &nbsp;·&nbsp;
  <a href="#-curriculum">🧭 Curriculum</a>
  &nbsp;·&nbsp;
  <a href="#-roadmap">🗺️ Roadmap</a>
  &nbsp;·&nbsp;
  <a href="#-contributing">🤝 Contribute</a>
</p>

[![CI](https://github.com/aqkprogrammer/visual-engineering/actions/workflows/ci.yml/badge.svg?branch=main)](https://github.com/aqkprogrammer/visual-engineering/actions/workflows/ci.yml)
[![Deploy](https://github.com/aqkprogrammer/visual-engineering/actions/workflows/deploy.yml/badge.svg?branch=main)](https://github.com/aqkprogrammer/visual-engineering/actions/workflows/deploy.yml)
![Next.js 16](https://img.shields.io/badge/Next.js-16-111?logo=nextdotjs&logoColor=white)
![TypeScript strict](https://img.shields.io/badge/TypeScript-strict-3178c6?logo=typescript&logoColor=white)
![Tailwind CSS 4](https://img.shields.io/badge/Tailwind_CSS-4-38bdf8?logo=tailwindcss&logoColor=white)
![Accessibility checked with axe in CI](https://img.shields.io/badge/a11y-axe_checked_in_CI-5b8def)
[![License: MIT](https://img.shields.io/badge/license-MIT-2ea44f)](LICENSE)

</div>

---

## ✨ Why this exists

Most explanations of how systems work are static — a diagram and a wall of text. But the interesting part of a system is what it **does**: what happens when traffic doubles, a server dies, or a cache goes cold. Visual Engineering shows that behaviour directly.

| | |
|---|---|
| 🎯 **One lesson, every level** | Beginners get an analogy and a picture; engineers get the internals; seniors get failure modes and trade-offs. |
| 🧪 **Honest simulations** | Deterministic *teaching models* that state their assumptions. Illustrative numbers are labelled — never passed off as benchmarks. |
| 📚 **Sourced, dated content** | Every lesson cites official docs and specs and shows when it was last reviewed. Analogies are marked as analogies. |
| ♿ **Accessible by default** | Keyboard-operable, screen-reader friendly, reduced-motion aware, never colour-only — checked by axe on every page type. |
| 🧭 **Guided and searchable** | Learning paths in a deliberate order, a plain-language glossary, instant search, and progress that stays in your browser. |
| 🔓 **Free, private, open** | No account, no API key, no tracking. Fonts are self-hosted at build time. |

## 🕹️ Playground

Every demo runs on the same deterministic simulation engine: play, pause, step, scrub, change the speed, inject failures — and the same actions always produce the same result. Each one lists the simplifications it makes.

<!-- playground:start -->
| Demo | Type | What you can do |
|---|---|---|
| [**Load balancer simulator**](https://aqkprogrammer.github.io/visual-engineering/playground/load-balancer/) | 🧪 Simulation · System Design | Send traffic through a load balancer, crash servers, switch routing algorithms and watch health checks, queues and tail latency respond. |
| [**TLS 1.3 handshake, step by step**](https://aqkprogrammer.github.io/visual-engineering/playground/tls-handshake/) | 👣 Walkthrough · Networking & Web | Walk through every message of a TLS 1.3 handshake, see what each side knows at each moment, and compare it with what an eavesdropper can read. |
| [**Kubernetes self-healing**](https://aqkprogrammer.github.io/visual-engineering/playground/kubernetes-self-healing/) | 🧪 Simulation · Containers & Kubernetes | Crash containers, delete pods and take down a node, then watch the kubelet, ReplicaSet, scheduler and node controller each play their part. |
| [**Cache simulator**](https://aqkprogrammer.github.io/visual-engineering/playground/cache/) | 🧪 Simulation · System Design | Watch hits, misses and evictions as you change the eviction policy, capacity, access pattern and expiry — then write to the database and catch a stale read. |
| [**Rate limiter simulator**](https://aqkprogrammer.github.io/visual-engineering/playground/rate-limiter/) | 🧪 Simulation · System Design | Compare token bucket, fixed window, sliding log and sliding window counter on the same traffic, and see a fixed window let twice the limit through. |
| [**Embedding similarity explorer**](https://aqkprogrammer.github.io/visual-engineering/playground/embeddings/) | 🧭 Explorer · AI Engineering | Pick a word in a toy embedding space and compare how cosine similarity, dot product and Euclidean distance rank its nearest neighbours. |
| [**B+ tree index explorer**](https://aqkprogrammer.github.io/visual-engineering/playground/btree-index/) | 👣 Walkthrough · Computer Science | Search a table with and without an index, count the page reads, and insert keys to watch B+ tree pages split. |
| [**DNS resolution, step by step**](https://aqkprogrammer.github.io/visual-engineering/playground/dns-resolution/) | 👣 Walkthrough · Networking & Web | Follow a lookup from your browser through recursive, root, TLD and authoritative servers, then see how caching short-circuits repeat lookups. |
| [**RAG pipeline inspector**](https://aqkprogrammer.github.io/visual-engineering/playground/rag-pipeline/) | 👣 Walkthrough · AI Engineering | Inspect every stage of a retrieval-augmented generation pipeline and see how chunking, top-k and reranking decide whether the answer is right. |
| [**Docker build cache simulator**](https://aqkprogrammer.github.io/visual-engineering/playground/docker-build-cache/) | 👣 Walkthrough · Containers & Kubernetes | Edit files and rebuild to see which Dockerfile steps hit the layer cache, why instruction order matters, and what gets pushed to a registry. |
| [**Byte-pair encoding explorer**](https://aqkprogrammer.github.io/visual-engineering/playground/tokenizer/) | 🧭 Explorer · AI Engineering | Type any text and watch a toy BPE tokenizer split it into tokens, then change how many merges it has learned. |
| [**Message queue simulator**](https://aqkprogrammer.github.io/visual-engineering/playground/message-queue/) | 🧪 Simulation · System Design | Change producer rate, consumer count and downstream speed, and watch backlogs, message age, retries and the dead-letter queue respond. |
| [**System design sandbox**](https://aqkprogrammer.github.io/visual-engineering/playground/system-design-sandbox/) | 🧪 Simulation · System Design | Design a backend from app servers, a cache, read replicas and a write queue, then load-test it: watch utilisation, latency and the bottleneck move. |
<!-- playground:end -->

## 🎓 How every lesson teaches

```mermaid
flowchart LR
  A["💡 Intuition<br/>everyday analogy"] --> B["🖼️ Visual<br/>the moving parts"]
  B --> C["▶️ Simulation<br/>play · change · break"]
  C --> D["⚙️ Technical<br/>real internals"]
  D --> E["🏭 Production<br/>failures & trade-offs"]
  E --> F["✅ Check<br/>interview questions"]
```

## 🧭 Curriculum

<!-- curriculum:start -->
**12 live lessons** · 7 domains · 43 modules · 207 planned topics. Expand a domain to see what's inside.

<details open>
<summary><b>System Design</b> — How large systems stay fast, available and correct under real traffic. <sub>🟢 4 live · 45 planned</sub></summary>

| Module | Live lessons | Planned topics |
|---|---|---|
| **Foundations** | — | System design fundamentals · Functional and non-functional requirements · Scalability and performance · Availability, reliability, durability and consistency · Horizontal versus vertical scaling |
| **Traffic & Edge** | [How load balancing works](https://aqkprogrammer.github.io/visual-engineering/system-design/load-balancing/)<br>[How rate limiting works](https://aqkprogrammer.github.io/visual-engineering/system-design/rate-limiting/) | Reverse proxies · API gateways · CDN and edge computing |
| **Data at Scale** | [Caching: hits, eviction and stale data](https://aqkprogrammer.github.io/visual-engineering/system-design/caching/) | Database indexing and query optimization · SQL versus NoSQL · Replication and partitioning · Sharding · Consistent hashing |
| **Consistency & Coordination** | — | CAP theorem · PACELC · Eventual consistency · Distributed transactions · Saga pattern · Idempotency · Distributed locking |
| **Messaging & Async** | [Message queues and backpressure](https://aqkprogrammer.github.io/visual-engineering/system-design/message-queues/) | Event streaming (logs versus queues) · Kafka fundamentals · RabbitMQ fundamentals · Synchronous versus asynchronous communication · Event-driven architecture |
| **Resilience** | — | Circuit breakers, retries, timeouts and bulkheads · High availability · Disaster recovery · Observability |
| **Real-time & APIs** | — | WebSockets, polling and Server-Sent Events · API versioning · Service discovery · Multi-tenancy |
| **Case Studies** | — | URL shortener · Chat and messaging application · Social media feed · Video streaming platform · E-commerce system · Ride-booking platform · Notification service · File storage service · Payment processing system · Real-time analytics platform · Search service · AI-powered application |

</details>
<details>
<summary><b>Software Architecture</b> — Structuring code and services so they stay changeable. <sub>⚪ in progress · 22 planned</sub></summary>

| Module | Live lessons | Planned topics |
|---|---|---|
| **Architectural Styles** | — | Layered architecture · Clean architecture · Hexagonal architecture (ports and adapters) · Modular monolith architecture · Monoliths versus microservices · Micro-frontends |
| **Domain Modeling** | — | Domain-driven design · Service boundaries · CQRS · Event sourcing |
| **Design Principles** | — | SOLID principles · DRY, KISS and YAGNI · Dependency injection · Repository and unit-of-work patterns · Design patterns · Code organization |
| **API Design** | — | API-first design · REST versus GraphQL versus gRPC · Backend-for-frontend |
| **Evolving Systems** | — | Refactoring and technical debt · Strangler migration pattern · Architecture decision records |

</details>
<details open>
<summary><b>AI Engineering</b> — From tokens and embeddings to retrieval, agents and production LLM systems. <sub>🟢 3 live · 33 planned</sub></summary>

| Module | Live lessons | Planned topics |
|---|---|---|
| **Foundations** | — | AI, ML, deep learning and generative AI · Supervised, unsupervised and reinforcement learning · Neural networks · Training versus inference |
| **Language Models** | [Embeddings and vector similarity](https://aqkprogrammer.github.io/visual-engineering/ai/embeddings/)<br>[Tokens and tokenization](https://aqkprogrammer.github.io/visual-engineering/ai/tokenization/) | Attention mechanisms · Transformers · Large language models · Pretraining, fine-tuning and inference |
| **Building with LLMs** | — | Prompt engineering · Structured outputs · Function and tool calling |
| **Retrieval & RAG** | [How retrieval-augmented generation (RAG) works](https://aqkprogrammer.github.io/visual-engineering/ai/how-rag-works/) | Document ingestion and chunking · Embedding pipelines · Vector databases · Hybrid retrieval and reranking · RAG evaluation |
| **Agents** | — | AI agents and agentic workflows · Planning, memory, tools and execution · Model Context Protocol (MCP) · Multi-agent systems |
| **Production AI** | — | AI gateways and model routing · Semantic caching · Model latency, throughput and cost · GPU inference fundamentals · Quantization · AI observability and tracing |
| **Safety & Quality** | — | Hallucinations and grounding · Guardrails and prompt injection · LLM evaluation · AI security and privacy |
| **Multimodal AI** | — | Multimodal AI · Computer vision · Speech recognition and text-to-speech |

</details>
<details open>
<summary><b>Containers & Kubernetes</b> — Packaging software and keeping it running across a fleet of machines. <sub>🟢 2 live · 33 planned</sub></summary>

| Module | Live lessons | Planned topics |
|---|---|---|
| **Containers & Docker** | [How Docker images and layers work](https://aqkprogrammer.github.io/visual-engineering/containers/docker-images-and-layers/) | Virtual machines versus containers · Container isolation · Docker architecture · Multi-stage builds · Container registries · Volumes and persistent storage · Container networking · Compose · Environment variables and secrets · Image optimization · Container security |
| **Kubernetes Core** | — | Kubernetes architecture · Control plane and worker nodes · Pods · Deployments and ReplicaSets · Services · Ingress and Gateway API concepts · ConfigMaps and Secrets · Namespaces · Labels and selectors |
| **Workloads & Storage** | — | StatefulSets · DaemonSets · Jobs and CronJobs · Persistent volumes and claims |
| **Kubernetes Operations** | [How Kubernetes heals itself](https://aqkprogrammer.github.io/visual-engineering/containers/kubernetes-self-healing/) | Resource requests and limits · Health checks and probes · Horizontal Pod Autoscaler · Scheduling · Rolling deployments and rollbacks · Service discovery · Network policies · Helm · Troubleshooting common Kubernetes failures |

</details>
<details>
<summary><b>Cloud & Infrastructure</b> — Networks, compute, storage and delivery pipelines in the cloud. <sub>⚪ in progress · 32 planned</sub></summary>

| Module | Live lessons | Planned topics |
|---|---|---|
| **Cloud Foundations** | — | Cloud computing fundamentals · AWS global infrastructure · Regions and Availability Zones |
| **Cloud Networking** | — | VPCs, subnets, routing and NAT · Security groups and network ACLs · DNS and Route 53 · Load balancers · CloudFront |
| **Compute & Data Services** | — | EC2 · Lambda · ECS versus EKS versus Lambda · S3 · RDS · DynamoDB · SQS and SNS · API Gateway |
| **Identity & Security** | — | IAM users, roles and policies · IAM least privilege · Secrets management |
| **Infrastructure as Code** | — | Infrastructure as Code · Terraform · State files and modules |
| **Delivery** | — | CI/CD · GitHub Actions · Blue-green and canary deployments |
| **Operations & Cost** | — | Autoscaling · Backups and disaster recovery · CloudWatch · Metrics, logs, traces and alerting · SLI, SLO and SLA · Cost optimization · FinOps fundamentals |

</details>
<details open>
<summary><b>Networking & Web</b> — What actually happens between typing a URL and seeing a page. <sub>🟢 2 live · 18 planned</sub></summary>

| Module | Live lessons | Planned topics |
|---|---|---|
| **Internet Basics** | — | How the internet works · IP addressing and ports · Packet routing · TCP versus UDP · Network latency |
| **Naming** | [How DNS resolution works](https://aqkprogrammer.github.io/visual-engineering/networking/dns-resolution/) | — |
| **Web Protocols** | [How the TLS 1.3 handshake works](https://aqkprogrammer.github.io/visual-engineering/networking/tls-handshake/) | HTTP and HTTPS · HTTP/1.1, HTTP/2 and HTTP/3 · Browser request lifecycle · WebSockets · Connection pooling |
| **Web Identity** | — | Cookies and sessions · JWT · OAuth 2.0 and OpenID Connect · CORS |
| **Edge & Network Security** | — | Reverse proxy versus forward proxy · CDN · Firewalls · Zero-trust networking |

</details>
<details open>
<summary><b>Computer Science</b> — The data structures, algorithms and systems concepts everything else is built on. <sub>🟢 1 live · 24 planned</sub></summary>

| Module | Live lessons | Planned topics |
|---|---|---|
| **Data Structures** | — | Arrays, linked lists, stacks and queues · Hash tables · Trees and graphs · Heaps and tries |
| **Algorithms** | — | Big O notation · Sorting and searching · Recursion · Dynamic programming · Greedy algorithms |
| **Concurrency** | — | Concurrency and parallelism · Threads and processes · Async programming · Race conditions and deadlocks |
| **Operating Systems** | — | Operating system fundamentals · Memory management · Garbage collection |
| **Database Internals** | [How database indexes work](https://aqkprogrammer.github.io/visual-engineering/computer-science/database-indexes/) | Database transactions · ACID properties · Database isolation levels |
| **Engineering Practice** | — | Testing strategies · Unit, integration, contract and end-to-end testing · Security fundamentals · OWASP concepts · Performance profiling |

</details>
<!-- curriculum:end -->

## 🗺️ Roadmap

- [x] **Phase 0 — Plan.** Requirements, taxonomy, architecture, design direction → [`docs/PLAN.md`](docs/PLAN.md)
- [x] **Phase 1 — Foundation.** Static site, design system, content pipeline, first lesson, tests, CI, GitHub Pages
- [x] **Phase 2 — Simulation engine.** Deterministic engine and shared player (play, pause, step, scrub, speed, event log, keyboard shortcuts, reduced motion); load balancer, TLS 1.3 and Kubernetes self-healing demos
- [x] **Phase 3 — First 12 lessons** across system design, AI, containers, networking and computer science, each with an interactive demo and a knowledge check
- [x] **Phase 4a — Discovery.** Search, four learning paths, a 58-term glossary, and progress saved in your browser
- [x] **Phase 4b — Practice.** 49 interview questions with published rubrics and self-grading; an incident lab with evidence from real simulation runs
- [x] **Phase 4c — System design sandbox.** Build a backend from servers, a cache, replicas and a write queue, load-test it, and meet four challenges
- [x] **Phase 5 — Quality.** Page-weight and Lighthouse budgets in CI, keyboard-only and privacy tests, readable diagrams on phones, contributor and authoring guides
- [ ] **Phase 6 — Release 1.0.** Release checklist, full-history secret scan, link check, changelog, tagged release
- [ ] **Later.** Software architecture and cloud lessons, shareable scenario links, progress export, AI engineering playground

## ⚠️ Known limitations

Honest about what 1.0 doesn't do yet:

- **Coverage.** 12 lessons in five of the seven domains; software architecture and cloud have planned topics but no published lessons yet.
- **Teaching models, not benchmarks.** Simulations simplify on purpose, list their assumptions, and use illustrative capacities and timings.
- **Phones.** Diagrams are fitted to the screen and their text is small; each simulation can be enlarged into a scrollable view, and its numbers are also shown as text.
- **Progress is per browser.** It isn't synced between devices and can't be exported yet.
- **English only.** No translations yet.
- **Lab performance only.** Speed budgets are checked with Lighthouse in CI; there is no field (real-user) data, because the site doesn't collect any.

## 🏗️ How it's built

```mermaid
flowchart LR
  subgraph Authoring
    D["domains.ts<br/>curriculum"]
    M["meta.ts<br/>typed metadata"]
    X["index.mdx<br/>lesson body"]
  end
  subgraph Build["Build · Node"]
    V{{"Zod validation<br/>+ cross-references"}}
    R[("generated<br/>registry")]
    N["next build<br/>static export"]
  end
  D & M & X --> V --> R --> N --> O["out/ · static HTML, CSS, JS"]
  O --> P["GitHub Pages"]
```

**Next.js 16** (App Router, fully static) · **React 19** · **TypeScript 6** (strict) · **Tailwind CSS 4** with OKLCH design tokens · **MDX** + **Zod** · **Shiki** (build-time highlighting) · **Vitest** · **Playwright** + **axe-core** · **GitHub Actions**

Every route is prerendered — there is no server. Simulations are pure TypeScript models replayed from a seed plus a log of your actions, so frames are reproducible and testable without a browser. Read the [architecture overview](docs/ARCHITECTURE.md) and the [decision records](docs/adr/) for the why behind each choice.

<details>
<summary><b>📁 Project structure</b></summary>

```
app/                     routes and layouts (all statically generated)
components/
  layout/                header, footer, breadcrumbs, theme toggle
  lessons/               lesson building blocks used from MDX
  visualizations/
    player/              shared player: controls, timeline, event log, playback hooks
    scenes/              one folder per demo: SVG scene + interactive container
content/
  domains.ts             curriculum: domains → modules → planned topics
  playground.ts          playground demos and their "try this" prompts
  lessons/<domain>/<slug>/
    meta.ts              typed metadata (validated)
    index.mdx            lesson body
lib/
  content/               schemas, validation, MDX analysis, catalog queries
  design/                design tokens and colour-contrast maths
  simulation/            engine (seeded RNG, runner, playback) and models — no React
scripts/
  content.ts             validates content, generates the registry
  readme.ts              generates this README's banner and curriculum
tests/                   unit, component and end-to-end suites
docs/                    plan, architecture, ADRs, assets
```

</details>

## 🚀 Quick start

Requires **Node.js 24+** and **pnpm 11** (`corepack enable` installs the pinned version).

```bash
pnpm install
pnpm dev
```

Then open http://localhost:3000.

<details>
<summary><b>⌨️ All commands</b></summary>

| Command | What it does |
|---|---|
| `pnpm dev` | Validate content, then start the dev server |
| `pnpm build` | Validate content and build the static site into `out/` |
| `pnpm preview` | Serve `out/` locally on port 3000 |
| `pnpm content` | Validate all content and regenerate the registry |
| `pnpm readme` | Regenerate the README banner and curriculum section |
| `pnpm lint` · `pnpm format` | ESLint (zero warnings allowed) · Prettier |
| `pnpm typecheck` | Strict TypeScript check |
| `pnpm test` | Unit and component tests |
| `pnpm test:e2e` | End-to-end and accessibility tests against `out/` (run `pnpm build` and `pnpm exec playwright install chromium` first) |
| `pnpm check` | Everything CI runs except E2E |

</details>

## ✍️ Writing a lesson

<details>
<summary><b>Add a lesson in five steps</b></summary>

1. Create `content/lessons/<domain>/<slug>/` — the domain must exist in `content/domains.ts`.
2. Add `meta.ts`:

   ```ts
   import { defineLesson } from "@/lib/content/schema";

   export default defineLesson({
     slug: "consistent-hashing",
     domain: "system-design",
     module: "data",
     title: "How consistent hashing works",
     description: "Why adding a server to a hash ring moves only a fraction of keys, and how virtual nodes keep load even.",
     difficulty: "intermediate",
     prerequisites: ["system-design/load-balancing"],
     tags: ["hashing", "partitioning"],
     references: [/* at least two https sources, official docs first */],
     lastReviewed: "2026-10-12",
     status: "draft",
   });
   ```

3. Write `index.mdx`. `<Definition>`, `<Analogy>`, `<Callout kind="note|warning|illustrative">`, `<Steps>`, `<TradeOffs>` and `<Demo slug="…" />` (any playground demo, lazy-loaded) are available without imports. Leave a blank line inside block tags so their content is parsed as Markdown.
4. Add `quiz.ts` (3–8 questions, `defineQuiz`) and `interview.ts` (3–8 questions, `defineInterview`) — both required before a lesson is published. Quiz questions have exactly one correct option and an explanation for every option; interview questions have a level, a model answer and a rubric of core points, strong signals and red flags.
5. Run `pnpm content` — it reports every problem at once: unknown modules, broken prerequisite links, cycles, links to drafts, unknown demos.

Drafts are visible in `pnpm dev` only. Reading time and the table of contents are generated for you.

Building an interactive simulation? Follow [docs/SIMULATION-GUIDE.md](docs/SIMULATION-GUIDE.md): a pure model, an SVG scene and a small container, with the shared player doing the rest.

</details>

## ✅ Quality gates

| Check | Tooling | Runs |
|---|---|---|
| Lint (React, hooks, Next.js, jsx-a11y) with zero warnings | ESLint 10 | CI |
| Formatting | Prettier | CI |
| Strict types | TypeScript 6 | CI |
| Content schema, cross-references, prerequisite cycles | Zod + custom validation | every build |
| Unit and component tests: simulation models, playback rules, player controls, WCAG contrast of every design token | Vitest + Testing Library | CI |
| Journeys, 404s, keyboard, theme, no horizontal scroll — desktop and mobile | Playwright | CI |
| WCAG 2.2 A/AA scan of every page type in both themes | axe-core | CI |
| Production dependency audit | pnpm audit | CI |
| README banner and curriculum match the real content | `scripts/readme.ts --check` | CI |
| Page weight: ≤ 215 KB JS up front per page, ≤ 60 KB per simulation, ≤ 80 KB HTML (gzipped) | `scripts/budget.ts` | CI |
| Lighthouse (mobile, median of 3): performance ≥ 90; accessibility, best practices, SEO ≥ 95; LCP ≤ 2.5 s, TBT ≤ 200 ms, CLS ≤ 0.1 | `scripts/lighthouse.ts` | CI |
| Keyboard-only journeys; no third-party requests or cookies | Playwright | CI |
| Only green commits deploy | GitHub Actions → Pages | on `main` |

## 🤝 Contributing

Corrections, new lessons and simulation ideas are welcome. Start with [CONTRIBUTING.md](CONTRIBUTING.md); lesson writers should read the [authoring guide](docs/AUTHORING.md), and simulation builders the [simulation guide](docs/SIMULATION-GUIDE.md). Everyone is expected to follow the [code of conduct](CODE_OF_CONDUCT.md). Please report security problems privately as described in [SECURITY.md](SECURITY.md).

Curious how the site checks itself? See [How this platform works](https://aqkprogrammer.github.io/visual-engineering/how-it-works/).

## 📄 License

[MIT](LICENSE) © 2026 Abdul Qadir Khan — covering the code, lessons and diagrams alike.

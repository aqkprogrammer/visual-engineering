# Changelog

All notable changes to this project are recorded here. The format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/), and versions follow [Semantic Versioning](https://semver.org/).

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

[1.0.0]: https://github.com/aqkprogrammer/visual-engineering/releases/tag/v1.0.0

# 0003. Deterministic simulation engine with precomputed frames

- **Status:** Accepted — implementation in Phase 2
- **Date:** 2026-10-12

## Context

The defining feature is interactive visualization: play, pause, step forwards and backwards, change parameters and inject failures. These must be reproducible (the same inputs always give the same result), testable without a browser, accessible, and cheap on low-end phones.

## Options considered

1. **Live, time-driven state mutated in `requestAnimationFrame`** — simple to start, but stepping backwards, restart and tests become hard, and results depend on frame timing.
2. **State machines (e.g. XState)** — good for UI flows, heavier than needed for numeric simulations.
3. **Pure models that produce a list of frames from `(params, seed, actions)`** — the player only chooses which frame to show.

## Decision

Option 3. Simulation models in `lib/simulation/` are pure TypeScript with no React: `init(params, rng)`, `tick(state, rng)`, `apply(state, action)` and `describe(state)` (a plain-language snapshot for screen readers). A seeded PRNG makes runs deterministic. User actions are recorded as `(tick, action)` pairs and replayed from the seed, which makes backward stepping, restart and shareable scenario URLs exact. Authored walkthroughs (for example a TLS handshake) produce the same frame list, so one player serves both kinds.

## Consequences

- Models are unit-tested for exact outcomes and invariants.
- Frame counts and on-screen entities must be bounded so precomputation stays cheap.
- Every simulation must declare its assumptions, which the UI shows as a "teaching model" notice.

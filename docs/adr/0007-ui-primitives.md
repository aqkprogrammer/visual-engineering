# 0007. Radix-based primitives owned in-repo

- **Status:** Accepted
- **Date:** 2026-10-12

## Context

Player controls (sliders, toggle groups, tooltips, dialogs) need robust keyboard and screen-reader behaviour, which is hard to build correctly from scratch.

## Decision

Use Radix primitives (the `radix-ui` package) wrapped in small components under `components/ui/`, in the copy-in style popularised by shadcn/ui, styled with the project's design tokens. Components are added only when a feature needs them.

## Consequences

The repository owns its component code, so there is no upstream component-library upgrade path to manage, but accessibility behaviour comes from a well-tested base.

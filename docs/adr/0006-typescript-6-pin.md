# 0006. Pin TypeScript 6.0 until the lint toolchain supports 7

- **Status:** Accepted
- **Date:** 2026-10-12

## Context

TypeScript 7.0 (the native compiler) is the `latest` release, but `typescript-eslint` 8.71 declares support for `typescript >=4.8.4 <6.1.0`, and `eslint-config-next` depends on it.

## Decision

Pin `typescript@6.0.3` with `strict`, `noUncheckedIndexedAccess`, `noImplicitReturns` and `noImplicitOverride` enabled.

## Consequences

Dependabot will propose TypeScript 7 once the ecosystem catches up; adopt it when `typescript-eslint` officially supports it.

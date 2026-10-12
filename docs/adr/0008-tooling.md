# 0008. Tooling: ESLint 10, Prettier, Vitest, Playwright + axe

- **Status:** Accepted
- **Date:** 2026-10-12

## Context

The project needs linting with React, hooks, Next.js and accessibility rules, consistent formatting, fast unit and component tests, and end-to-end tests against the real static build.

## Decisions

- **ESLint 10** with `eslint-config-next` (core-web-vitals + TypeScript), which bundles React, hooks, Next and `jsx-a11y` rules. ESLint 9 is end-of-life. Some bundled plugins (`eslint-plugin-react`, `eslint-plugin-jsx-a11y`, `eslint-plugin-import`) do not yet list ESLint 10 in their peer ranges; we verified that their rules load and report on ESLint 10. Biome was not chosen because it does not cover Next's and jsx-a11y's rules.
- **Prettier** with the Tailwind class-sorting plugin. `*.mdx` is excluded (see ADR-0002).
- **Vitest 5** with jsdom per file and React Testing Library.
- **Playwright** against `out/` served by a static server, on desktop and mobile projects, with `@axe-core/playwright` scanning every page type in both themes for WCAG 2.2 A/AA violations.
- **pnpm 11** with its default minimum-release-age supply-chain guard. When the guard blocks a fresh release we pin the previous version rather than adding an exclusion.

## Consequences

`pnpm check` runs lint, format, typecheck, unit tests and build locally; CI runs the same steps plus E2E.

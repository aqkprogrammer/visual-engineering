# 0002. Content as MDX with typed, Zod-validated metadata

- **Status:** Accepted
- **Date:** 2026-10-12

## Context

Lessons mix long-form prose with interactive React components. Metadata (difficulty, prerequisites, references, review dates) drives navigation, SEO and validation, so it must be typed and checked. Contributors should be able to add a lesson by adding files, without a CMS or database.

## Options considered

1. **`@next/mdx` + per-lesson `meta.ts` validated by Zod + a small build script** — first-party MDX, metadata gets TypeScript autocomplete and refactor safety, about 200 lines of in-repo loader code to own.
2. **Velite** — capable, but pre-1.0.
3. **Fumadocs MDX** — couples the project to the Fumadocs documentation framework.
4. **YAML frontmatter** — familiar, but untyped until parsed and easy to get subtly wrong.

## Decision

Each lesson is a folder `content/lessons/<domain>/<slug>/` containing `index.mdx` (the body) and `meta.ts` (metadata via `defineLesson`). `scripts/content.ts`:

1. loads `content/domains.ts` and every `meta.ts`, and validates them with Zod schemas in `lib/content/schema.ts`;
2. runs cross-document checks in `lib/content/validate.ts` — unique slugs, resolvable prerequisites and related lessons, no published-to-draft links, an acyclic prerequisite graph, and domain ids that do not shadow static routes;
3. derives reading time and the table of contents from the MDX body (`lib/content/mdx-text.ts`), using the same slug algorithm as `rehype-slug`;
4. writes `content/.generated/registry.ts` (git-ignored) with validated data and typed lazy MDX loaders.

The script runs before `dev`, `build`, `test` and `typecheck`, and fails with every issue listed at once.

## Consequences

- Invalid content cannot reach a build; CI reports all problems in one pass.
- **MDX compiles to code.** Only trusted, reviewed repository content is compiled; nothing renders MDX from user input. `CODEOWNERS` review on `content/**` is part of the security model.
- Prettier does not understand MDX 3 and reflowed Markdown nested in JSX, so `*.mdx` is excluded from formatting. An E2E test asserts the step list still renders as a list.

# Architecture Decision Records

Each record captures one significant decision: the context, the options considered, what was chosen and its consequences. Records are immutable once accepted; a changed decision gets a new record that supersedes the old one.

| #                                                  | Decision                                                             | Status                             |
| -------------------------------------------------- | -------------------------------------------------------------------- | ---------------------------------- |
| [0001](0001-static-first-nextjs.md)                | Static-first Next.js App Router with `output: "export"`              | Accepted                           |
| [0002](0002-content-as-mdx-with-typed-metadata.md) | Content as MDX with typed, Zod-validated metadata                    | Accepted                           |
| [0003](0003-deterministic-simulation-engine.md) | Deterministic simulation engine with precomputed frames | Accepted · implemented |
| [0004](0004-svg-and-motion-rendering.md) | SVG + CSS transitions for visualizations; React Flow only for editable graphs | Accepted · updated |
| [0005](0005-client-side-search.md)                 | Client-side search over a build-time index                           | Accepted, amended 2026-10-13      |
| [0006](0006-typescript-6-pin.md)                   | Pin TypeScript 6.0 until the lint toolchain supports 7               | Accepted                           |
| [0007](0007-ui-primitives.md)                      | Radix-based primitives owned in-repo                                 | Accepted                           |
| [0008](0008-tooling.md)                            | ESLint 10, Prettier, Vitest, Playwright + axe                        | Accepted                           |
| [0009](0009-hosting-github-pages.md) | Host on GitHub Pages, deployed by GitHub Actions | Accepted |
| [0010](0010-mit-license.md) | MIT license for code and content | Accepted |

New record: copy [`template.md`](template.md) to the next number.

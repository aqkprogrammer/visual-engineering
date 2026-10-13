# Contributing to Visual Engineering

Thank you for helping. Corrections are as valuable as new lessons: if something is wrong, unclear or out of date, please say so.

By taking part you agree to follow the [code of conduct](CODE_OF_CONDUCT.md). Contributions are licensed under the project's [MIT License](LICENSE).

## Ways to contribute

| You want to…                          | Start here                                                                           |
| ------------------------------------- | ------------------------------------------------------------------------------------ |
| Report a factual error or typo        | Open a **Content correction** issue, with a source if you have one                   |
| Report a bug in the site              | Open a **Bug report** issue                                                          |
| Propose a new lesson                  | Open a **Lesson proposal** issue before writing, so we can agree scope and placement |
| Write or improve a lesson             | Read the [lesson authoring guide](docs/AUTHORING.md)                                 |
| Build a simulation or playground demo | Read the [simulation guide](docs/SIMULATION-GUIDE.md)                                |
| Report a security problem             | Follow [SECURITY.md](SECURITY.md) — never in a public issue                          |

## Setting up

You need Node.js 24 (see `.nvmrc`) and pnpm 11 (`corepack enable` installs the version in `package.json`).

```bash
pnpm install
pnpm dev
```

The site runs at <http://localhost:3000>. Drafts are visible in `pnpm dev` only.

## Before you open a pull request

Run the same checks as CI:

```bash
pnpm check
```

That runs, in order: ESLint, Prettier, TypeScript, content validation and every unit and component test, the README check, a static build, and the page-weight budgets. Then run the end-to-end and accessibility tests against the build:

```bash
pnpm exec playwright install chromium
pnpm test:e2e
```

Optionally, run the Lighthouse budgets (`pnpm lighthouse`). Lab scores vary with how busy your machine is; CI runs them on a quiet runner.

If `pnpm readme --check` fails, run `pnpm readme` — the README's curriculum and playground tables are generated from `content/`.

## Pull requests

- Keep each pull request to one change: one lesson, one fix, one feature.
- Explain **what** changed and **why**, and how you checked it. For content, list the sources you used.
- Add or update tests with behaviour changes. Simulation models need tests for their invariants; incident stories need tests that the evidence shows what the story claims.
- Screenshots help for visual changes, at desktop and phone widths, in light and dark themes.
- Everything must pass CI. A maintainer reviews every change (`.github/CODEOWNERS`): lessons compile to code and simulations shape what learners believe.

## Standards we hold to

- **Accurate.** Facts come from primary sources — official documentation, specifications, papers — and are cited. Never copy text, diagrams or code from a source; explain in your own words and link to it.
- **Honest.** Analogies are labelled as analogies. Illustrative numbers are labelled as illustrative. Simulations list their assumptions. No claim of performance, popularity or test coverage that hasn't been measured.
- **Accessible.** Everything works with a keyboard and a screen reader, meets WCAG 2.2 AA in both themes, respects reduced motion, and never relies on colour alone. Every page type is checked by axe in CI.
- **Lean.** No new runtime dependency without a good reason. Pages stay within the budgets in `scripts/budget.ts`, and simulations load only on the pages that show them.
- **Private.** No tracking, no accounts, no external requests at runtime. Anything stored stays in the reader's browser.

## Dependencies and supply chain

pnpm refuses packages published very recently (`minimumReleaseAge`). If an install fails because of it, pin the previous release rather than adding an exclusion. GitHub Actions are pinned by commit SHA; update them together with their version comments.

## Questions

Open a discussion in an issue. There are no silly questions — if the docs didn't answer it, that's a docs bug.

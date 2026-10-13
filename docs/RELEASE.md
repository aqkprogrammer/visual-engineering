# Release checklist

Use this for every release. Steps marked **(maintainer)** change public state or repository settings and are run only with the maintainer's explicit approval.

## 1. Before tagging

- [ ] `main` is green in CI: lint, types, tests, build, page-weight budgets, link check, end-to-end and accessibility, Lighthouse, and the full-history secret scan.
- [ ] A clean clone passes: `git clone`, `pnpm install --frozen-lockfile`, `pnpm check`, `pnpm test:e2e`.
- [ ] The live site serves the commit being released (the deploy workflow ran for it) and every sitemap URL returns 200.
- [ ] `CHANGELOG.md` has a section for the version; `package.json` has the same version.
- [ ] README roadmap and "Known limitations" are accurate.
- [ ] Open Dependabot pull requests have been merged or closed with a reason.

## 2. Tag and publish **(maintainer)**

```bash
git checkout main
```

```bash
git pull --ff-only
```

```bash
git tag -a v1.0.0 -m "Visual Engineering 1.0.0"
```

```bash
git push origin v1.0.0
```

```bash
awk '/^## \[1.0.0\]/{f=1;next} /^## \[|^\[1.0.0\]:/{f=0} f' CHANGELOG.md > /tmp/release-notes.md
```

```bash
gh release create v1.0.0 --verify-tag --title "Visual Engineering 1.0.0" --notes-file /tmp/release-notes.md
```

## 3. Repository security settings **(maintainer)**

Private vulnerability reporting (used by `SECURITY.md`), Dependabot alerts, and Dependabot security updates:

```bash
gh api -X PUT repos/aqkprogrammer/visual-engineering/private-vulnerability-reporting
```

```bash
gh api -X PUT repos/aqkprogrammer/visual-engineering/vulnerability-alerts
```

```bash
gh api -X PUT repos/aqkprogrammer/visual-engineering/automated-security-fixes
```

## 4. After publishing

- [ ] The release page shows the notes and the tag points at the intended commit.
- [ ] Tick the release in the README roadmap (in an ordinary pull request).

## Record: 1.0.0

| Item                                                                            | State                                                                                                                                      |
| ------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------ |
| Repository                                                                      | `aqkprogrammer/visual-engineering`, public, default branch `main`, MIT licence                                                             |
| Description, homepage, topics                                                   | Already set; homepage is <https://aqkprogrammer.github.io/visual-engineering/>                                                             |
| Hosting                                                                         | GitHub Pages, deployed by `.github/workflows/deploy.yml` only after CI succeeds on `main`                                                  |
| Secret scanning and push protection                                             | Enabled (GitHub default for public repositories)                                                                                           |
| Private vulnerability reporting, Dependabot alerts, Dependabot security updates | Disabled — awaiting approval (section 3)                                                                                                   |
| Full-history secret scan                                                        | gitleaks 8.30.1 in CI; a local pattern scan of all 35 commits found nothing                                                                |
| Commit identities                                                               | Only the maintainer's GitHub no-reply address, GitHub's merge identity and Dependabot                                                      |
| Dependency audit                                                                | Production: no known vulnerabilities. Development only: `braces` (GHSA-vfj7-8cjw-p6xm) via ESLint's Next.js plugin, no patched release yet |
| Open Dependabot PRs                                                             | #1 (TypeScript 7) and #3 (`@types/node` 26) — both conflict with pinned decisions; recommended to close; ignore rules added                |

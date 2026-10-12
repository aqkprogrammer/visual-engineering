# 0009. Host on GitHub Pages, deployed by GitHub Actions

- **Status:** Accepted
- **Date:** 2026-10-12

## Context

The maintainer wants a public link for the site. The build is a static export (ADR-0001), so any static host works. There is no custom domain yet.

## Options considered

1. **GitHub Pages** — no extra account, lives next to the code, deploys through Actions with short-lived OIDC credentials. Cannot set custom HTTP headers; a project site is served from a sub-path (`/visual-engineering`) until a custom domain is configured.
2. **Vercel / Cloudflare Pages** — support security headers and preview deployments, but need a separate account connected to the repository.

## Decision

GitHub Pages, deployed by `.github/workflows/deploy.yml`:

- runs only after the **CI** workflow succeeds for a push to `main` (or a manual run on `main`), and checks out exactly the commit CI tested;
- reads the site origin and base path from `actions/configure-pages`, so moving to a custom domain later needs no code change;
- builds with `NEXT_PUBLIC_SITE_URL` and `NEXT_PUBLIC_BASE_PATH`, and deploys with `pages: write` / `id-token: write` granted to the deploy job only.

The site uses `trailingSlash: true`, so every route is emitted as `route/index.html`, which GitHub Pages serves without rewrites.

## Consequences

- Live at <https://aqkprogrammer.github.io/visual-engineering/>.
- **No custom security headers** (CSP, `frame-ancestors`, `Permissions-Policy`). The site has no forms, accounts or third-party scripts, which limits the impact; a `<meta>` CSP can be added later, and moving to a host with header support is the stronger fix.
- `robots.txt` is served at `/visual-engineering/robots.txt`. Crawlers only read `robots.txt` at a domain root, so it has no effect until a custom domain is used. The sitemap still works when submitted directly.
- E2E tests run in CI against a root-path build; the sub-path build is checked by the deploy itself and a post-deploy smoke check.

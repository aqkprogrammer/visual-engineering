# 0001. Static-first Next.js App Router with `output: "export"`

- **Status:** Accepted
- **Date:** 2026-10-12

## Context

The product is a free, public learning site. Its content changes only when the repository changes, it needs no login, and it must be cheap to run and easy for contributors to run locally. The brief asks for Next.js App Router, React and TypeScript, and explicitly prefers a static-first architecture with no backend.

## Options considered

1. **Next.js with `output: "export"`** — every route prerendered at build time into plain HTML/CSS/JS; hostable on any static host. Loses request-time features: middleware, `headers`/`redirects` in config, ISR, server actions, the default image optimizer.
2. **Next.js with a Node server (e.g. on Vercel)** — all features available, but ties operation to a server runtime the site does not need.
3. **Astro** — excellent for static content with islands of interactivity, but diverges from the requested stack and from the React ecosystem used for the visualizations.

## Decision

Use the Next.js 16 App Router with `output: "export"`. Every dynamic route defines `generateStaticParams` and sets `dynamicParams = false`, so unknown URLs are real 404s. `sitemap.ts` and `robots.ts` are `force-static`.

**Cache Components and Partial Prefetching are disabled**, although `create-next-app` 16.4 enables them by default. They exist to mix static shells with request-time data; this site has none, and Cache Components rejects `export const dynamic = "force-static"`, which static route handlers require.

## Consequences

- Hosting is portable: any static host, CDN or object store can serve `out/`.
- Security headers (CSP, `frame-ancestors`, HSTS) must be configured at the host. ADR-0009 will record how.
- The default `next/image` optimizer is unavailable (`images.unoptimized: true`). Diagrams are inline SVG, so this costs little.
- If a future feature genuinely needs a server, this decision must be revisited explicitly rather than drifting.

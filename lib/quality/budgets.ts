/**
 * Quality budgets, shared by the CI scripts (`scripts/budget.ts`, `scripts/lighthouse.ts`) and the
 * "How this platform works" page, so what the site says about itself is what CI enforces.
 */

/** Page weight in gzipped kilobytes. The React and Next.js runtime is ~150 KB of every page. */
export const PAGE_WEIGHT_BUDGETS = {
  /** Scripts a page loads up front, including its own simulation. */
  initialJs: 215,
  /** Any chunk that not every page loads, such as one simulation. */
  pageChunk: 60,
  /** A page's HTML, including data embedded for client components (search, interview). */
  html: 80,
} as const;

/** Minimum Lighthouse category scores (0–1), mobile, median of three runs. */
export const LIGHTHOUSE_CATEGORY_BUDGETS = {
  performance: 0.9,
  accessibility: 0.95,
  "best-practices": 0.95,
  seo: 0.95,
} as const;

/** Maximum lab metric values (lower is better). */
export const LIGHTHOUSE_METRIC_BUDGETS = {
  "largest-contentful-paint": { max: 2500, unit: "ms" },
  "total-blocking-time": { max: 200, unit: "ms" },
  "cumulative-layout-shift": { max: 0.1, unit: "" },
} as const;

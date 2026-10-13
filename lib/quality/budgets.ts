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

/** Minimum Lighthouse category scores (0–1), mobile, median of five runs. */
export const LIGHTHOUSE_CATEGORY_BUDGETS = {
  performance: 0.9,
  accessibility: 0.95,
  "best-practices": 0.95,
  seo: 0.95,
} as const;

/**
 * Maximum lab metric values (lower is better). `fail` budgets fail CI; `warn` budgets are reported
 * in the CI summary only. LCP and TBT are warnings because simulated LCP for identical code flipped
 * between ~1.96 s and ~2.58 s across CI runs; both already count towards the performance score,
 * which is a failing budget.
 */
export const LIGHTHOUSE_METRIC_BUDGETS = {
  "largest-contentful-paint": { max: 2500, unit: "ms", enforce: "warn" },
  "total-blocking-time": { max: 200, unit: "ms", enforce: "warn" },
  "cumulative-layout-shift": { max: 0.1, unit: "", enforce: "fail" },
} as const;

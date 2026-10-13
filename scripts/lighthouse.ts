/**
 * Lighthouse budgets for key pages, run against the static export in `out/`.
 *
 *   pnpm lighthouse        (run `pnpm build` first; uses Playwright's Chromium)
 *
 * Uses Lighthouse's default mobile emulation with simulated throttling. Each page is audited
 * five times and the median is compared with the budget: on shared CI runners a single page's
 * LCP and TBT varied by 30% or more between runs of identical code.
 * Budgets come from docs/PLAN.md §9.2. In CI the report also goes to the job summary.
 */
import { spawn } from "node:child_process";
import { appendFile } from "node:fs/promises";
import { chromium } from "@playwright/test";
import * as chromeLauncher from "chrome-launcher";
import lighthouse from "lighthouse";
import { LIGHTHOUSE_CATEGORY_BUDGETS, LIGHTHOUSE_METRIC_BUDGETS } from "../lib/quality/budgets";

const PORT = 4173;
const ORIGIN = `http://127.0.0.1:${PORT}`;
const RUNS = 5;

const PAGES = [
  "/",
  "/system-design/caching/",
  "/playground/system-design-sandbox/",
  "/interview/",
  "/search/",
];

const CATEGORY_BUDGETS = LIGHTHOUSE_CATEGORY_BUDGETS;
type Category = keyof typeof CATEGORY_BUDGETS;
const METRIC_BUDGETS = LIGHTHOUSE_METRIC_BUDGETS;
type Metric = keyof typeof METRIC_BUDGETS;

const median = (values: number[]) => {
  const sorted = [...values].sort((a, b) => a - b);
  return sorted[Math.floor(sorted.length / 2)] ?? 0;
};

async function waitForServer(url: string, attempts = 50) {
  for (let i = 0; i < attempts; i++) {
    try {
      if ((await fetch(url)).ok) return;
    } catch {
      // not up yet
    }
    await new Promise((r) => setTimeout(r, 200));
  }
  throw new Error(`Static server did not start at ${url}`);
}

async function main() {
  const server = spawn(
    "pnpm",
    ["exec", "serve", "out", "--listen", `tcp://127.0.0.1:${PORT}`, "--no-request-logging"],
    { stdio: "ignore" },
  );
  const chrome = await chromeLauncher.launch({
    chromePath: chromium.executablePath(),
    chromeFlags: ["--headless=new", "--no-sandbox", "--disable-gpu"],
  });

  const rows: string[] = [];
  const failures: string[] = [];
  try {
    await waitForServer(ORIGIN);
    for (const page of PAGES) {
      const scores: Record<Category, number[]> = {
        performance: [],
        accessibility: [],
        "best-practices": [],
        seo: [],
      };
      const metrics: Record<Metric, number[]> = {
        "largest-contentful-paint": [],
        "total-blocking-time": [],
        "cumulative-layout-shift": [],
      };
      for (let run = 0; run < RUNS; run++) {
        const result = await lighthouse(`${ORIGIN}${page}`, {
          port: chrome.port,
          output: "json",
          logLevel: "error",
          onlyCategories: Object.keys(CATEGORY_BUDGETS),
        });
        const lhr = result?.lhr;
        if (!lhr) throw new Error(`Lighthouse returned no result for ${page}`);
        for (const c of Object.keys(scores) as Category[]) {
          scores[c].push(lhr.categories[c]?.score ?? 0);
        }
        for (const m of Object.keys(metrics) as Metric[]) {
          metrics[m].push(lhr.audits[m]?.numericValue ?? Infinity);
        }
      }

      const cells: string[] = [];
      for (const c of Object.keys(scores) as Category[]) {
        const score = median(scores[c]);
        cells.push(String(Math.round(score * 100)));
        if (score < CATEGORY_BUDGETS[c]) {
          failures.push(`${page}: ${c} ${Math.round(score * 100)} < ${CATEGORY_BUDGETS[c] * 100}`);
        }
      }
      for (const m of Object.keys(metrics) as Metric[]) {
        const value = median(metrics[m]);
        const { max, unit } = METRIC_BUDGETS[m];
        cells.push(unit ? `${Math.round(value)} ${unit}` : value.toFixed(3));
        if (value > max) failures.push(`${page}: ${m} ${value.toFixed(3)} > ${max}`);
      }
      rows.push(`| \`${page}\` | ${cells.join(" | ")} |`);
      console.log(`✓ audited ${page}`);
    }
  } finally {
    chrome.kill();
    server.kill();
  }

  const summary = [
    `### Lighthouse (mobile, median of ${RUNS} runs)`,
    "",
    `Budgets: performance ≥ 90, accessibility ≥ 95, best practices ≥ 95, SEO ≥ 95, LCP ≤ 2,500 ms, TBT ≤ 200 ms, CLS ≤ 0.1.`,
    "",
    "| Page | Perf | A11y | Best practices | SEO | LCP | TBT | CLS |",
    "| --- | --- | --- | --- | --- | --- | --- | --- |",
    ...rows,
    "",
    failures.length === 0
      ? "✓ All Lighthouse budgets met."
      : `✗ ${failures.length} budget(s) missed:`,
    ...failures.map((f) => `- ${f}`),
  ].join("\n");
  console.log(`\n${summary}`);
  if (process.env.GITHUB_STEP_SUMMARY) {
    await appendFile(process.env.GITHUB_STEP_SUMMARY, `${summary}\n`);
  }
  if (failures.length > 0) process.exit(1);
}

main().catch((error: unknown) => {
  console.error(error);
  process.exit(1);
});

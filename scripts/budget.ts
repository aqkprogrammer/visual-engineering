/**
 * Page-weight budgets, checked against the static export in `out/`.
 *
 *   pnpm budget            check budgets (run `pnpm build` first)
 *
 * Deterministic, unlike lab performance scores: it sums the gzipped size of every script a page
 * loads up front (script tags and script preloads), checks each page-specific chunk such as a
 * simulation, and fails if anything exceeds its budget. In CI the report also goes to the job
 * summary.
 */
import { appendFile, readdir, readFile } from "node:fs/promises";
import path from "node:path";
import { gzipSync } from "node:zlib";
import { PAGE_WEIGHT_BUDGETS } from "../lib/quality/budgets";

const OUT = path.resolve("out");

export const BUDGETS = PAGE_WEIGHT_BUDGETS;

const kb = (bytes: number) => Math.round((bytes / 1024) * 10) / 10;

async function htmlFiles(dir: string): Promise<string[]> {
  const entries = await readdir(dir, { withFileTypes: true });
  const nested = await Promise.all(
    entries.map(async (e) => {
      const full = path.join(dir, e.name);
      if (e.isDirectory()) return e.name === "_next" ? [] : htmlFiles(full);
      return e.name.endsWith(".html") ? [full] : [];
    }),
  );
  return nested.flat();
}

const sizes = new Map<string, number>();
async function gzipped(file: string): Promise<number> {
  const cached = sizes.get(file);
  if (cached !== undefined) return cached;
  const size = gzipSync(await readFile(file), { level: 9 }).length;
  sizes.set(file, size);
  return size;
}

type PageReport = { route: string; initialJs: number; html: number; chunks: string[] };

async function main() {
  const pages = await htmlFiles(OUT);
  if (pages.length === 0) {
    console.error("No pages in out/. Run `pnpm build` first.");
    process.exit(1);
  }

  const reports: PageReport[] = [];
  for (const page of pages) {
    const html = await readFile(page, "utf8");
    // Scripts the browser loads up front: <script src> tags and script preloads. Other chunk
    // paths in the page (the framework's manifest of what it *might* load) don't count.
    const tags = html.match(/<(?:script|link)\b[^>]*>/g) ?? [];
    const scripts = [
      ...new Set(
        tags
          .filter((t) => t.startsWith("<script") || /\bas="script"/.test(t))
          .flatMap((t) => t.match(/(?:src|href)="[^"]*?(\/_next\/static\/[^"]+\.js)"/)?.[1] ?? []),
      ),
    ].map((src) => path.join(OUT, src.replace(/^\/_next\//, "_next/")));
    const js = (await Promise.all(scripts.map(gzipped))).reduce((a, b) => a + b, 0);
    const route =
      "/" +
      path
        .relative(OUT, page)
        .replace(/(^|\/)index\.html$/, "")
        .replace(/\.html$/, "");
    reports.push({
      route,
      initialJs: js,
      html: gzipSync(html, { level: 9 }).length,
      chunks: scripts,
    });
  }

  // Chunks every page loads are the shared runtime; everything else is specific to some pages.
  const loads = new Map<string, number>();
  for (const r of reports) for (const c of r.chunks) loads.set(c, (loads.get(c) ?? 0) + 1);
  const chunkDir = path.join(OUT, "_next/static/chunks");
  const pageChunks: { file: string; size: number }[] = [];
  for (const name of await readdir(chunkDir)) {
    const file = path.join(chunkDir, name);
    if (name.endsWith(".js") && loads.get(file) !== reports.length) {
      pageChunks.push({ file: name, size: await gzipped(file) });
    }
  }

  const failures: string[] = [];
  for (const r of reports) {
    if (kb(r.initialJs) > BUDGETS.initialJs) {
      failures.push(`${r.route}: initial JS ${kb(r.initialJs)} KB > ${BUDGETS.initialJs} KB`);
    }
    if (kb(r.html) > BUDGETS.html) {
      failures.push(`${r.route}: HTML ${kb(r.html)} KB > ${BUDGETS.html} KB`);
    }
  }
  for (const c of pageChunks) {
    if (kb(c.size) > BUDGETS.pageChunk) {
      failures.push(`chunk ${c.file}: ${kb(c.size)} KB > ${BUDGETS.pageChunk} KB`);
    }
  }

  const heaviest = [...reports].sort((a, b) => b.initialJs - a.initialJs).slice(0, 8);
  const largestChunk = [...pageChunks].sort((a, b) => b.size - a.size)[0];
  const summary = [
    "### Page weight (gzipped)",
    "",
    `${reports.length} pages · budgets: initial JS ≤ ${BUDGETS.initialJs} KB, HTML ≤ ${BUDGETS.html} KB, page-specific chunk ≤ ${BUDGETS.pageChunk} KB`,
    "",
    "| Page | Initial JS | HTML |",
    "| --- | --- | --- |",
    ...heaviest.map((r) => `| \`${r.route}\` | ${kb(r.initialJs)} KB | ${kb(r.html)} KB |`),
    "",
    `Largest page-specific chunk: ${largestChunk ? `${kb(largestChunk.size)} KB` : "none"} (${pageChunks.length} chunks).`,
    "",
    failures.length === 0 ? "✓ All budgets met." : `✗ ${failures.length} budget(s) exceeded:`,
    ...failures.map((f) => `- ${f}`),
  ].join("\n");

  console.log(summary);
  if (process.env.GITHUB_STEP_SUMMARY) {
    await appendFile(process.env.GITHUB_STEP_SUMMARY, `${summary}\n`);
  }
  if (failures.length > 0) process.exit(1);
}

main().catch((error: unknown) => {
  console.error(error);
  process.exit(1);
});

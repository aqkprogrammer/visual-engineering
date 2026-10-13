/**
 * Internal link check for the static export in `out/`.
 *
 *   pnpm links             (run `pnpm build` first)
 *
 * Every internal href and src on every page must resolve to a file in the export, and every
 * `#fragment` must match an element id on the target page. External links are not fetched.
 */
import { access, readdir, readFile } from "node:fs/promises";
import path from "node:path";

const OUT = path.resolve("out");

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

async function exists(file: string) {
  try {
    await access(file);
    return true;
  } catch {
    return false;
  }
}

/** The file a site path is served from, as the static host resolves it. */
async function resolveTarget(sitePath: string): Promise<string | null> {
  const clean = decodeURIComponent(sitePath.split("?")[0] ?? "");
  const candidates = clean.endsWith("/")
    ? [path.join(OUT, clean, "index.html")]
    : path.extname(clean)
      ? [path.join(OUT, clean)]
      : [path.join(OUT, clean, "index.html"), path.join(OUT, `${clean}.html`)];
  for (const c of candidates) if (await exists(c)) return c;
  return null;
}

const ids = new Map<string, Set<string>>();
async function idsIn(file: string): Promise<Set<string>> {
  let found = ids.get(file);
  if (!found) {
    const html = await readFile(file, "utf8");
    found = new Set([...html.matchAll(/\sid="([^"]+)"/g)].map((m) => m[1] ?? ""));
    ids.set(file, found);
  }
  return found;
}

async function main() {
  const pages = await htmlFiles(OUT);
  if (pages.length === 0) {
    console.error("No pages in out/. Run `pnpm build` first.");
    process.exit(1);
  }
  const broken: string[] = [];
  let checked = 0;

  for (const page of pages) {
    const html = await readFile(page, "utf8");
    // Only real link and resource attributes; framework data in scripts is not markup.
    const markup = html.replace(/<script\b[\s\S]*?<\/script>/g, "");
    const refs = [...markup.matchAll(/\s(?:href|src)="([^"]+)"/g)].map((m) => m[1] ?? "");
    const from = "/" + path.relative(OUT, page);

    for (const ref of new Set(refs)) {
      if (/^(?:[a-z]+:|\/\/)/i.test(ref)) continue; // external, mailto:, data: …
      checked++;
      const [target = "", fragment] = ref.split("#");
      const file = target === "" ? page : await resolveTarget(target);
      if (!file) {
        broken.push(`${from}: ${ref} (no such page or file)`);
        continue;
      }
      if (fragment && file.endsWith(".html") && !(await idsIn(file)).has(fragment)) {
        broken.push(`${from}: ${ref} (no element with id "${fragment}")`);
      }
    }
  }

  if (broken.length > 0) {
    console.error(`✖ ${broken.length} broken internal link(s):`);
    for (const b of broken) console.error(`  • ${b}`);
    process.exit(1);
  }
  console.log(`✓ ${checked} internal links on ${pages.length} pages all resolve`);
}

main().catch((error: unknown) => {
  console.error(error);
  process.exit(1);
});

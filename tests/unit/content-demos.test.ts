import { cp, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { CONTENT_DIR, loadCatalog } from "@/lib/content/load";

/** Runs the real loader on a copy of the curriculum with one lesson body changed. */
describe("demos embedded in lessons", () => {
  let dir: string;
  const body = () => path.join(dir, "lessons/system-design/caching/index.mdx");

  beforeAll(async () => {
    dir = await mkdtemp(path.join(tmpdir(), "ve-content-"));
    await cp(CONTENT_DIR, dir, {
      recursive: true,
      filter: (source) => !source.includes(".generated"),
    });
  });

  afterAll(async () => {
    await rm(dir, { recursive: true, force: true });
  });

  async function issuesWith(edit: (source: string) => string) {
    const original = await readFile(body(), "utf8");
    await writeFile(body(), edit(original));
    try {
      return (await loadCatalog(dir)).issues.map((i) => `${i.where}: ${i.message}`);
    } finally {
      await writeFile(body(), original);
    }
  }

  it("accepts the real lessons", async () => {
    expect(await issuesWith((s) => s)).toEqual([]);
  });

  it("rejects an unknown demo slug", async () => {
    const issues = await issuesWith((s) =>
      s.replace('<Demo slug="cache" />', '<Demo slug="nope" />'),
    );
    expect(issues).toEqual([
      'content/lessons/system-design/caching/index.mdx: unknown demo "nope" (see content/playground.ts)',
    ]);
  });

  it("rejects importing a scene directly, which would bundle it into every lesson page", async () => {
    const issues = await issuesWith(
      (s) =>
        'import { CacheSimulation } from "@/components/visualizations/scenes/cache/cache-simulation";\n\n' +
        s,
    );
    expect(issues).toEqual([
      'content/lessons/system-design/caching/index.mdx: embed demos with <Demo slug="…" /> instead of importing a scene directly',
    ]);
  });
});

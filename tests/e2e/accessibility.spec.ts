import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";

const PAGES = [
  "/",
  "/explore",
  "/system-design",
  "/ai",
  "/system-design/load-balancing",
  "/playground",
  "/playground/load-balancer",
  "/playground/tls-handshake",
  "/playground/kubernetes-self-healing",
  "/playground/cache",
  "/playground/rate-limiter",
  "/playground/embeddings",
  "/networking/tls-handshake",
  "/containers/kubernetes-self-healing",
  "/system-design/caching",
  "/system-design/rate-limiting",
  "/ai/embeddings",
  "/computer-science/database-indexes",
  "/networking/dns-resolution",
  "/ai/how-rag-works",
  "/containers/docker-images-and-layers",
  "/ai/tokenization",
  "/system-design/message-queues",
  "/playground/btree-index",
  "/playground/dns-resolution",
  "/playground/rag-pipeline",
  "/playground/docker-build-cache",
  "/playground/tokenizer",
  "/playground/message-queue",
  "/about",
  "/missing-page",
];

for (const theme of ["dark", "light"] as const) {
  test.describe(`axe (${theme} theme)`, () => {
    test.use({ colorScheme: theme });

    for (const path of PAGES) {
      test(`${path} has no WCAG A/AA violations`, async ({ page }) => {
        await page.goto(path);
        await expect(page.locator("html")).toHaveAttribute("data-theme", theme);
        // Open collapsed interview answers so their contents are audited too.
        await page.evaluate(() =>
          document.querySelectorAll("details").forEach((d) => (d.open = true)),
        );

        const results = await new AxeBuilder({ page })
          .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"])
          .analyze();

        const summary = results.violations.map((v) => ({
          id: v.id,
          impact: v.impact,
          targets: v.nodes.slice(0, 3).map((n) => n.target.join(" ")),
        }));
        expect(summary).toEqual([]);
      });
    }
  });
}

test("reduced motion preference disables CSS transitions", async ({ browser }) => {
  const durationFor = async (reducedMotion: "reduce" | "no-preference") => {
    const context = await browser.newContext({ reducedMotion });
    const page = await context.newPage();
    await page.goto("/");
    // The theme toggle has a colour transition and is visible at every screen size.
    const value = await page
      .getByRole("button", { name: /theme/ })
      .evaluate((el) => getComputedStyle(el).transitionDuration);
    await context.close();
    return Number.parseFloat(value);
  };

  // Control: the link really does animate when motion is allowed…
  expect(await durationFor("no-preference")).toBeGreaterThan(0.05);
  // …and effectively stops when the user asks for reduced motion.
  expect(await durationFor("reduce")).toBeLessThanOrEqual(0.00001);
});

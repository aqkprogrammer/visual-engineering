import { expect, test } from "@playwright/test";

test.describe("core journeys", () => {
  test("home → explore → domain → lesson", async ({ page }) => {
    await page.goto("/");
    await expect(page.getByRole("heading", { level: 1 })).toHaveText(
      "Watch it work. Change it. Break it.",
    );

    await page
      .getByRole("navigation", { name: "Primary" })
      .getByRole("link", { name: "Explore" })
      .click();
    await expect(page).toHaveURL(/\/explore\/?$/);
    await expect(page.getByRole("heading", { level: 1 })).toHaveText("Explore");

    await page.getByRole("link", { name: "System Design", exact: true }).click();
    await expect(page).toHaveURL(/\/system-design\/?$/);
    await expect(page.getByRole("heading", { level: 1 })).toHaveText("System Design");

    await page.getByRole("link", { name: /How load balancing works/ }).click();
    await expect(page).toHaveURL(/\/system-design\/load-balancing\/?$/);
    await expect(page.getByRole("heading", { level: 1 })).toHaveText("How load balancing works");
    await expect(page).toHaveTitle("How load balancing works · Visual Engineering");
  });

  test("lesson page structure", async ({ page }) => {
    await page.goto("/system-design/load-balancing");

    const breadcrumb = page.getByRole("navigation", { name: "Breadcrumb" });
    await expect(breadcrumb.getByRole("link")).toHaveText(["Explore", "System Design"]);
    await expect(breadcrumb.locator('[aria-current="page"]')).toHaveText(
      "How load balancing works",
    );

    // The step-by-step walkthrough must render as a real ordered list (guards MDX formatting).
    await expect(page.locator(".prose-ve ol").first().locator("> li")).toHaveCount(6);

    await expect(
      page.getByRole("img", { name: /Load balancer distributing requests/ }),
    ).toBeVisible();
    await expect(page.getByRole("complementary", { name: "Analogy" })).toContainText("not literal");
    await expect(page.getByRole("heading", { name: "Further reading" })).toBeVisible();
    await expect(page.locator("pre.shiki")).toHaveCount(1);
  });

  test("table of contents links jump to their section", async ({ page, isMobile }) => {
    test.skip(isMobile, "The table of contents sidebar is shown on large screens only.");
    await page.goto("/system-design/load-balancing");
    const toc = page.getByRole("navigation", { name: "On this page" });
    await toc.getByRole("link", { name: "Health checks: noticing failure" }).click();
    await expect(page).toHaveURL(/#health-checks-noticing-failure$/);
    await expect(
      page.getByRole("heading", { name: "Health checks: noticing failure" }),
    ).toBeInViewport();
  });

  test("unknown routes return the helpful 404 page", async ({ page }) => {
    for (const path of ["/system-design/not-a-lesson", "/not-a-domain"]) {
      const response = await page.goto(path);
      expect(response?.status(), path).toBe(404);
      await expect(page.getByRole("heading", { level: 1 })).toHaveText("This page doesn’t exist");
      await expect(page.getByRole("link", { name: "Explore all topics" })).toBeVisible();
    }
  });

  test("planned topics are labelled and not linked", async ({ page }) => {
    await page.goto("/ai");
    await expect(page.getByRole("heading", { name: /Planned topics/ }).first()).toBeVisible();
    await expect(page.getByRole("link", { name: "Embeddings" })).toHaveCount(0);
  });
});

test.describe("keyboard and preferences", () => {
  test("skip link is the first tab stop and moves focus to main content", async ({
    page,
    isMobile,
  }) => {
    test.skip(isMobile, "Keyboard tabbing is a desktop interaction.");
    await page.goto("/system-design/load-balancing");
    await page.keyboard.press("Tab");
    const skip = page.getByRole("link", { name: "Skip to content" });
    await expect(skip).toBeFocused();
    await expect(skip).toBeVisible();
    await page.keyboard.press("Enter");
    await expect(page).toHaveURL(/#main$/);
  });

  test("theme follows the OS and an explicit choice persists across pages", async ({ browser }) => {
    const context = await browser.newContext({ colorScheme: "light" });
    const page = await context.newPage();
    await page.goto("/");
    const html = page.locator("html");
    await expect(html).toHaveAttribute("data-theme", "light");

    await page.getByRole("button", { name: /Switch to dark theme/ }).click();
    await expect(html).toHaveAttribute("data-theme", "dark");

    await page.goto("/about");
    await expect(html).toHaveAttribute("data-theme", "dark");
    await context.close();
  });

  test("pages never scroll horizontally", async ({ page }) => {
    for (const path of [
      "/",
      "/explore",
      "/system-design",
      "/system-design/load-balancing",
      "/about",
    ]) {
      await page.goto(path);
      const overflow = await page.evaluate(
        () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
      );
      expect(overflow, path).toBeLessThanOrEqual(0);
    }
  });
});

import { expect, test } from "@playwright/test";

test.describe("search", () => {
  test("finds a glossary term and opens it", async ({ page }) => {
    await page.goto("/");
    await page.getByRole("link", { name: "Search", exact: true }).first().click();
    await expect(page).toHaveURL(/\/search\/?$/);

    const box = page.getByRole("searchbox");
    await box.fill("dead letter");
    await expect(page).toHaveURL(/\?q=dead\+letter$/);
    await expect(page.getByText(/results? for “dead letter”/)).toBeVisible();

    await page.getByRole("link", { name: /Dead-letter queue/ }).click();
    await expect(page).toHaveURL(/\/glossary\/#dead-letter-queue$/);
    await expect(page.locator("#dead-letter-queue")).toBeInViewport();
  });

  test("restores a shared query from the URL", async ({ page }) => {
    await page.goto("/search/?q=kubernetes");
    await expect(page.getByRole("searchbox")).toHaveValue("kubernetes");
    await expect(page.getByRole("link", { name: /How Kubernetes heals itself/ })).toBeVisible();
  });

  test("explains when nothing matches", async ({ page }) => {
    await page.goto("/search/");
    await page.getByRole("searchbox").fill("zzqxv");
    await expect(page.getByText("No results for “zzqxv”.")).toBeVisible();
  });
});

test.describe("learning paths and progress", () => {
  test("completing a lesson advances the path and survives a reload", async ({ page }) => {
    await page.goto("/paths/how-a-web-request-is-served/");
    await expect(page.getByText("0 of 5 lessons completed")).toBeVisible();
    await page.getByRole("link", { name: /Start: How DNS resolution works/ }).click();
    await expect(page).toHaveURL(/\/networking\/dns-resolution\/?$/);

    const paths = page.getByRole("region", { name: "Learning paths" });
    await expect(paths.getByText("Step 1 of 5")).toBeVisible();
    await page.getByRole("button", { name: "Mark as complete" }).click();
    await expect(page.getByRole("button", { name: "Completed" })).toHaveAttribute(
      "aria-pressed",
      "true",
    );

    await page.reload();
    await expect(page.getByRole("button", { name: "Completed" })).toBeVisible();

    await paths.getByRole("link", { name: "How a web request is served" }).click();
    await expect(page.getByText("1 of 5 lessons completed")).toBeVisible();
    await expect(
      page.getByRole("link", { name: /Continue: How the TLS 1.3 handshake works/ }),
    ).toBeVisible();

    await page.goto("/paths/");
    await expect(
      page.getByRole("region", { name: "Your progress" }).getByText(/^1 of \d+ lessons completed/),
    ).toBeVisible();
    await page.getByRole("button", { name: "Reset progress" }).click();
    await page.getByRole("button", { name: "Yes, reset progress" }).click();
    await expect(
      page.getByRole("region", { name: "Your progress" }).getByText(/^0 of \d+ lessons completed/),
    ).toBeVisible();
  });

  test("a finished knowledge check shows its score", async ({ page }) => {
    await page.goto("/system-design/caching/");
    const questions = page.getByRole("group", { name: /^Question \d+:/ });
    const count = await questions.count();
    for (let i = 0; i < count; i++) {
      const question = questions.nth(i);
      await question.getByRole("radio").first().check();
      await question.getByRole("button", { name: "Check answer" }).click();
    }
    await expect(page.getByRole("region", { name: "Your progress" })).toContainText(
      new RegExp(`Knowledge check: best \\d of ${count}`),
    );
  });
});

test.describe("glossary", () => {
  test("letters jump to sections and terms link to their lesson", async ({ page }) => {
    await page.goto("/glossary/");
    await page
      .getByRole("navigation", { name: "Glossary letters" })
      .getByRole("link", {
        name: "T",
        exact: true,
      })
      .click();
    await expect(page).toHaveURL(/#letter-T$/);

    const term = page.locator("#token-bucket");
    await term.getByRole("link", { name: /Learn it: How rate limiting works/ }).click();
    await expect(page).toHaveURL(/\/system-design\/rate-limiting\/?$/);
  });

  test("lessons list their key terms", async ({ page }) => {
    await page.goto("/system-design/message-queues/");
    const terms = page.getByRole("region", { name: "Key terms" });
    await terms.getByRole("link", { name: "Idempotency" }).click();
    await expect(page).toHaveURL(/\/glossary\/#idempotency$/);
  });
});

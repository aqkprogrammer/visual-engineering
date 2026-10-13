import { expect, test, type Page } from "@playwright/test";

/**
 * Keyboard-only journeys: nothing here clicks. Each step moves focus with Tab and acts with
 * Enter, Space or the player's documented shortcuts, the way a keyboard user would.
 */

/** Presses Tab until the focused element's accessible text matches, failing after `max` tabs. */
async function tabTo(page: Page, name: RegExp, max = 120) {
  for (let i = 0; i < max; i++) {
    await page.keyboard.press("Tab");
    const label = await page.evaluate(() => {
      const el = document.activeElement as HTMLElement | null;
      if (!el) return "";
      return (el.getAttribute("aria-label") ?? el.innerText ?? el.textContent ?? "").trim();
    });
    if (name.test(label)) return;
  }
  throw new Error(`Never reached an element matching ${name} by pressing Tab`);
}

test.beforeEach(({ isMobile }) => {
  test.skip(isMobile, "Keyboard journeys run on the desktop layout.");
});

test("a lesson can be read, simulated, checked and completed by keyboard alone", async ({
  page,
}) => {
  await page.goto("/system-design/caching/");

  // Skip link first, straight to the content.
  await page.keyboard.press("Tab");
  await expect(page.getByRole("link", { name: "Skip to content" })).toBeFocused();
  await page.keyboard.press("Enter");
  await expect(page).toHaveURL(/#main$/);

  // Play the simulation, then pause and step it with the player's shortcuts.
  await tabTo(page, /^Play$/);
  await page.keyboard.press("Enter");
  await expect(page.getByRole("button", { name: "Pause" })).toBeVisible();
  await page.keyboard.press("k");
  await expect(page.getByRole("button", { name: "Play" })).toBeVisible();
  const position = page.locator("input[type=range]").first();
  const before = Number(await position.inputValue());
  await page.keyboard.press("ArrowRight");
  await expect(position).toHaveValue(String(before + 1));

  // Answer the first knowledge-check question.
  const first = page.getByRole("group", { name: /^Question 1:/ });
  await first.getByRole("radio").first().focus();
  await page.keyboard.press("Space");
  await expect(first.getByRole("radio").first()).toBeChecked();
  await tabTo(page, /^Check answer$/);
  await page.keyboard.press("Enter");
  await expect(first.getByRole("status")).toBeVisible();

  // Mark the lesson complete.
  await tabTo(page, /^Mark as complete$/);
  await page.keyboard.press("Enter");
  await expect(page.getByRole("button", { name: "Completed" })).toHaveAttribute(
    "aria-pressed",
    "true",
  );
});

test("an interview question can be practised and graded by keyboard alone", async ({ page }) => {
  await page.goto("/interview/");
  await tabTo(page, /^Random question$/);
  await page.keyboard.press("Enter");
  const heading = page.locator("#practice-question");
  await expect(heading).toBeFocused();

  await page.keyboard.press("Tab");
  await expect(page.getByLabel("Your answer")).toBeFocused();
  await page.keyboard.type("Spread the load and route around failures.");
  await page.keyboard.press("Tab");
  await expect(page.getByRole("button", { name: "Grade my answer" })).toBeFocused();
  await page.keyboard.press("Enter");

  await page.keyboard.press("Tab");
  await page.keyboard.press("Space");
  await expect(page.getByText(/^Verdict:/)).toContainText(/1 of \d core points/);
});

test("the search page works from the keyboard", async ({ page }) => {
  await page.goto("/");
  await tabTo(page, /^Search$/);
  await page.keyboard.press("Enter");
  await expect(page).toHaveURL(/\/search\/?$/);

  const box = page.getByRole("searchbox");
  await box.focus();
  await page.keyboard.type("stampede");
  await expect(page.getByText(/results? for “stampede”/)).toBeVisible();
  // The next tab stop after the search box is the best result.
  await page.keyboard.press("Tab");
  await expect(page.getByRole("link", { name: /Cache stampede/ }).first()).toBeFocused();
  await page.keyboard.press("Enter");
  await expect(page).toHaveURL(/\/glossary\/#cache-stampede$/);
});

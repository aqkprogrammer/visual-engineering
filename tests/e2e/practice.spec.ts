import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";

test.describe("interview hub", () => {
  test("practise a random question and grade it against the rubric", async ({ page }) => {
    await page.goto("/interview/");
    await expect(page.getByText(/^\d+ questions$/)).toBeVisible();

    await page.getByRole("button", { name: "Random question" }).click();
    const panel = page.getByRole("region").filter({ has: page.getByLabel("Your answer") });
    await expect(panel.getByRole("heading", { level: 2 })).toBeFocused();
    await panel.getByLabel("Your answer").fill("My answer, out loud.");
    await panel.getByRole("button", { name: "Grade my answer" }).click();

    const core = panel.getByRole("group", { name: /Every good answer covers/ });
    for (const box of await core.getByRole("checkbox").all()) await box.check();
    await expect(panel.getByText(/^Verdict:/)).toContainText("Solid");
    await panel.getByText("How the verdict is decided").click();
    await expect(panel.getByText("The first rule that matches wins.")).toBeVisible();

    const results = await new AxeBuilder({ page })
      .include("main")
      .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"])
      .analyze();
    expect(results.violations.map((v) => v.id)).toEqual([]);
  });

  test("filters narrow the list, and a deep link opens one question", async ({ page }) => {
    await page.goto("/interview/#cache-stampede");
    await expect(page.locator("details#cache-stampede")).toHaveAttribute("open", "");
    await page.getByLabel("Level").selectOption("senior");
    await expect(page.getByText(/^\d+ of \d+ questions$/)).toBeVisible();
    for (const tag of await page.locator("details summary").allTextContents()) {
      expect(tag).toContain("Senior");
    }
  });
});

test.describe("incident lab", () => {
  test("diagnose an incident, then reproduce it in the playground", async ({ page }) => {
    await page.goto("/incidents/");
    await page.getByRole("link", { name: /Errors after a server crash/ }).click();
    await expect(page.getByRole("heading", { level: 1 })).toHaveText(
      "Errors after a server crash, then silence",
    );
    await expect(page.getByRole("img", { name: "Requests per 100 ms" })).toBeVisible();
    await expect(page.getByRole("region", { name: "Load balancer log for app-2" })).toContainText(
      "removed from rotation",
    );

    const diagnosis = page.getByRole("group", { name: /Question 1:/ });
    await diagnosis.getByLabel(/three health checks in a row/).check();
    await diagnosis.getByRole("button", { name: "Check answer" }).click();
    await expect(diagnosis.getByText("Correct.")).toBeVisible();

    await page.getByText("Read the postmortem").click();
    await page.getByRole("link", { name: "Open the demo: Load balancer simulator" }).click();
    await expect(page).toHaveURL(/\/playground\/load-balancer\/?$/);
  });

  test("charts offer their data as a table", async ({ page }) => {
    await page.goto("/incidents/orders-arriving-late/");
    const chart = page.locator("figure").first();
    await chart.getByText("Show the data").click();
    const table = chart.getByRole("region", { name: /data table/ });
    await expect(table.getByRole("columnheader", { name: "Arriving" })).toBeVisible();
  });
});

test.describe("lessons link to practice", () => {
  test("interview questions render from data and the lesson links its incident", async ({
    page,
    isMobile,
  }) => {
    await page.goto("/system-design/caching/");
    const section = page.getByRole("region", { name: "Interview questions" });
    await expect(section.locator("details")).toHaveCount(4);
    await section.getByText("What is a cache stampede and how do you prevent it?").click();
    await expect(
      section.locator("details[open]").getByText("Every good answer covers"),
    ).toBeVisible();

    if (!isMobile) {
      await page
        .getByRole("navigation", { name: "On this page" })
        .getByRole("link", { name: "Interview questions" })
        .click();
      await expect(page).toHaveURL(/#interview-questions$/);
    }

    await page
      .getByRole("region", { name: "Debug it" })
      .getByRole("link", { name: /The cache stops working every night/ })
      .click();
    await expect(page).toHaveURL(/\/incidents\/cache-collapse-at-night\/?$/);
  });
});

test.describe("system design sandbox", () => {
  test("design an architecture that passes a challenge", async ({ page }) => {
    await page.goto("/playground/system-design-sandbox/");
    await page.getByLabel("Scenario").selectOption("read-heavy-catalogue");
    const result = page.getByText(/^Load test result for this design:/);
    await expect(result).toContainText("goals missed");

    await page.getByLabel("App servers").selectOption("10");
    await page.getByText("Cache", { exact: true }).click(); // the visible label, as a user would
    await expect(page.getByRole("switch", { name: /Cache/ })).toBeChecked();
    await page.getByRole("group", { name: "Hit ratio" }).getByText("95%").click();
    await expect(result).toContainText("all goals met");

    await page.getByRole("button", { name: "Next step" }).click();
    await expect(page.getByRole("region", { name: "Load on each component" })).toContainText(
      "App servers",
    );
    await expect(page.getByRole("heading", { name: "Related lessons" })).toBeVisible();
  });
});

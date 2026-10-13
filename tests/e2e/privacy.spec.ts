import { expect, test } from "@playwright/test";

/**
 * The site promises no analytics, cookies or third-party requests ("How this platform works").
 * This holds it to that: every request on these pages must go to the site's own origin.
 */
const PAGES = [
  "/",
  "/system-design/caching/",
  "/playground/system-design-sandbox/",
  "/interview/",
  "/incidents/orders-arriving-late/",
  "/search/?q=cache",
];

test("pages make no third-party requests and set no cookies", async ({ page, baseURL }) => {
  const origin = new URL(baseURL!).origin;
  const external: string[] = [];
  page.on("request", (request) => {
    const url = new URL(request.url());
    if (url.protocol !== "data:" && url.protocol !== "blob:" && url.origin !== origin) {
      external.push(request.url());
    }
  });

  for (const path of PAGES) {
    await page.goto(path);
    await page.waitForLoadState("networkidle");
  }
  // Interact, so lazily loaded code and progress storage are exercised too.
  await page.goto("/system-design/caching/");
  await page.getByRole("button", { name: "Mark as complete" }).click();

  expect(external).toEqual([]);
  expect(await page.context().cookies()).toEqual([]);
});

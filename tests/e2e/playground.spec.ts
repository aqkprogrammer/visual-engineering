import { expect, test, type Page } from "@playwright/test";

const player = (page: Page) =>
  page.getByRole("region", { name: /simulation|handshake|self-healing/i });
const caption = (page: Page) => player(page).locator("p[aria-live]");

/** Move the timeline the way a user dragging the slider would. */
async function seek(page: Page, frame: number) {
  await player(page)
    .getByRole("slider", { name: "Timeline" })
    .evaluate((input: HTMLInputElement, value) => {
      Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value")!.set!.call(
        input,
        String(value),
      );
      input.dispatchEvent(new Event("input", { bubbles: true }));
    }, frame);
}

test("playground lists every demo", async ({ page }) => {
  await page.goto("/playground");
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Playground");
  for (const name of [
    "Load balancer simulator",
    "TLS 1.3 handshake, step by step",
    "Kubernetes self-healing",
  ]) {
    await expect(page.getByRole("link", { name: new RegExp(name) })).toBeVisible();
  }
});

test("load balancer: crashing a server leads to its removal from rotation", async ({ page }) => {
  await page.goto("/playground/load-balancer");
  // Server-rendered first frame, before any interaction.
  await expect(caption(page)).toContainText("3 of 3 servers in rotation");

  await seek(page, 200);
  await page.getByRole("button", { name: "Crash app-2" }).click();
  await expect(page.getByRole("button", { name: "Restart app-2" })).toBeVisible();
  await expect(player(page)).toContainText("app-2 crashed");

  await seek(page, 240);
  await expect(caption(page)).toContainText("2 of 3 servers in rotation");
  await expect(player(page)).toContainText("removed from rotation");

  await page.getByRole("button", { name: "Reset scenario" }).click();
  await expect(page.getByRole("button", { name: "Crash app-2" })).toBeVisible();
  await expect(caption(page)).toContainText("0.00 s");
});

test("load balancer: play advances time and pause stops it", async ({ page }) => {
  await page.goto("/playground/load-balancer");
  await player(page).getByRole("button", { name: "Play" }).click();
  await expect(caption(page)).not.toContainText("0.00 s");
  await player(page).getByRole("button", { name: "Pause" }).click();
  const paused = await caption(page).textContent();
  await page.waitForTimeout(400);
  await expect(caption(page)).toHaveText(paused ?? "");
});

test("TLS: stepping and the eavesdropper view", async ({ page }) => {
  await page.goto("/playground/tls-handshake");
  await expect(caption(page)).toContainText("Before the handshake");
  await player(page).getByRole("button", { name: "Next step" }).click();
  await expect(caption(page)).toContainText("ClientHello");
  await expect(player(page).getByText("server_name (SNI)")).toBeVisible();

  await page.getByText("All steps").click();
  await page.getByRole("button", { name: /6\.\s*Certificate$/ }).click();
  await expect(caption(page)).toContainText("Certificate.");
  await page.getByText("Eavesdropper on the network").click();
  await expect(player(page)).toContainText("the certificate is encrypted in TLS 1.3");
});

test("Kubernetes: deleting a pod creates a replacement", async ({ page }) => {
  await page.goto("/playground/kubernetes-self-healing");
  const firstDelete = page.getByRole("button", { name: /^Delete pod web-/ }).first();
  const victim = (await firstDelete.getAttribute("aria-label"))!.replace("Delete pod ", "");
  await firstDelete.click();
  await expect(player(page)).toContainText(`${victim} deleted`);
  await seek(page, 20);
  await expect(player(page)).toContainText("ReplicaSet created");
  await expect(caption(page)).toContainText("ready 3");
});

test("keyboard shortcuts drive the player", async ({ page, isMobile }) => {
  test.skip(isMobile, "Keyboard shortcuts are a desktop interaction.");
  await page.goto("/playground/tls-handshake");
  await player(page).getByRole("button", { name: "Next step" }).focus();
  await page.keyboard.press("ArrowRight");
  await page.keyboard.press("ArrowRight");
  await expect(player(page).getByText(/Step 3 of 11/)).toBeVisible();
  await page.keyboard.press("Home");
  await expect(player(page).getByText(/Step 1 of 11/)).toBeVisible();
});

test("the load balancing lesson embeds a working simulation", async ({ page }) => {
  await page.goto("/system-design/load-balancing");
  const sim = page.getByRole("region", { name: "Load balancer simulation" });
  await expect(sim).toBeVisible();
  // Interactive, not just server-rendered: stepping changes the caption.
  await seek(page, 40);
  await expect(sim.locator("p[aria-live]")).toContainText("1.00 s");
  await sim.getByRole("button", { name: "Crash app-1" }).click();
  await expect(sim).toContainText("app-1 crashed");
});

test("the player starts paused when reduced motion is requested", async ({ browser }) => {
  const context = await browser.newContext({ reducedMotion: "reduce" });
  const page = await context.newPage();
  await page.goto("/playground/load-balancer");
  await expect(player(page).getByRole("button", { name: "Play" })).toBeVisible();
  await expect(caption(page)).toContainText("0.00 s");
  await context.close();
});

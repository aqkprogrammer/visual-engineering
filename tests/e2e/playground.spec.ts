import { expect, test, type Page } from "@playwright/test";

const player = (page: Page) =>
  page
    .getByRole("region", {
      name: /simulation|handshake|self-healing|explorer|index|resolution|pipeline|cache|zones|strategies|autoscaling|microservices|event sourcing/i,
    })
    .first();
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
    "Regions and Availability Zones",
    "Deployment strategies",
    "Autoscaling",
    "Monolith versus microservices",
    "Event sourcing and CQRS",
    "Hexagonal architecture explorer",
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

test("cache: a write without invalidation produces stale reads", async ({ page }) => {
  await page.goto("/playground/cache");
  const invalidate = page.getByRole("switch", { name: /Invalidate on write/ });
  await expect(invalidate).toBeChecked();
  await page.getByText("Invalidate on write", { exact: true }).click(); // the visible label, as a user would
  await expect(invalidate).not.toBeChecked();
  await seek(page, 30); // let the hot key A get cached first
  await page.getByRole("button", { name: "Write a new version of A" }).click();
  await expect(player(page)).toContainText("the cache still holds v1");
  await seek(page, 60);
  await expect(player(page)).toContainText("Stale read: served A v1");
});

test("rate limiter: a fixed window lets twice the limit through at a boundary", async ({
  page,
}) => {
  await page.goto("/playground/rate-limiter");
  await page.getByText("Fixed window", { exact: true }).click();
  await page.getByText("Window-edge bursts", { exact: true }).click();
  await seek(page, 52);
  await expect(caption(page)).toContainText("20 accepted in the last second (limit 10)");
  await page.getByText("Sliding log", { exact: true }).click();
  await seek(page, 120);
  const peak = player(page)
    .getByText("Peak in any one second", { exact: true })
    .locator("xpath=following-sibling::dd");
  expect(Number(await peak.textContent())).toBeLessThanOrEqual(10);
});

test("embeddings: changing the measure changes the ranking", async ({ page }) => {
  await page.goto("/playground/embeddings");
  const summary = player(page).locator("p[aria-live]");
  await expect(summary).toContainText("Top 3 by cosine similarity: kitten");
  await page.getByText("Dot product", { exact: true }).click();
  await expect(summary).toContainText("Top 3 by dot product: animals");
  await page.getByRole("combobox", { name: "Query word" }).selectOption("apple");
  await expect(summary).toContainText("Query “apple”");
});

test("lessons end with a working knowledge check", async ({ page }) => {
  await page.goto("/system-design/rate-limiting");
  const quiz = page.getByRole("region", { name: "Check your understanding" });
  const first = quiz.getByRole("group").first();
  await first.getByRole("radio").first().click();
  await first.getByRole("button", { name: "Check answer" }).click();
  await expect(first.getByRole("status")).toBeVisible();
  await expect(quiz).toContainText(/of 4 correct/);
});

test("B+ tree: a lookup reads far fewer pages than a scan, and inserts can split pages", async ({
  page,
}) => {
  await page.goto("/playground/btree-index");
  await seek(page, 10);
  await expect(caption(page)).toContainText("Total: 3 index pages + 1 heap page = 4 reads");
  await page.getByRole("button", { name: "Insert" }).click();
  await seek(page, 10);
  await expect(caption(page)).toContainText("13");
});

test("DNS: a repeat lookup is answered from the resolver's cache", async ({ page }) => {
  await page.goto("/playground/dns-resolution");
  await page.getByText("Repeat lookup", { exact: true }).click();
  await seek(page, 2);
  await expect(caption(page)).toContainText("Cache hit");
});

test("RAG: whole-document chunks with top-k 1 retrieve the outdated policy", async ({ page }) => {
  await page.goto("/playground/rag-pipeline");
  await page.getByRole("combobox", { name: "Question" }).selectOption("deadline");
  await page.getByText("Whole documents", { exact: true }).click();
  await page.getByRole("group", { name: "Top k" }).getByText("1", { exact: true }).click();
  await seek(page, 10);
  await expect(caption(page)).toContainText("Grounded in an outdated source — wrong");
  await page.getByText("Reranker", { exact: true }).click();
  await seek(page, 10);
  await expect(caption(page)).toContainText("Correct and grounded");
});

test("Docker: editing source code reruns the dependency install when everything is copied first", async ({
  page,
}) => {
  await page.goto("/playground/docker-build-cache");
  await page.getByRole("button", { name: "Edit src/server.js" }).click();
  await page.getByRole("button", { name: /docker build/ }).click();
  await seek(page, 4);
  await expect(caption(page)).toContainText("BUILT RUN npm ci");
});

test("tokenizer: fewer merges means more tokens", async ({ page }) => {
  await page.goto("/playground/tokenizer");
  const summary = page.getByText(/tokens · \d+ words/);
  await expect(summary).toContainText("10 tokens");
  await page.getByRole("slider").fill("0");
  await expect(summary).toContainText("20 tokens");
});

test("message queue: a slow downstream grows the backlog", async ({ page }) => {
  await page.goto("/playground/message-queue");
  await seek(page, 50);
  await page.getByText("Slow downstream", { exact: true }).click();
  await seek(page, 250);
  const waiting = player(page)
    .getByText("Waiting", { exact: true })
    .locator("xpath=following-sibling::dd");
  expect(Number(await waiting.textContent())).toBeGreaterThan(50);
});

test("zones: three lean zones lose a third of capacity; headroom loses nothing", async ({
  page,
}) => {
  await page.goto("/playground/availability-zones");
  await seek(page, 2);
  await page.getByRole("button", { name: "Fail zone a2" }).click();
  await expect(caption(page)).toContainText("33% of requests failing");

  await page.getByText("Survive a zone", { exact: true }).click();
  await seek(page, 2);
  await page.getByRole("button", { name: "Fail zone a2" }).click();
  await seek(page, 6);
  await expect(caption(page)).toContainText("All 3,000 requests a second served");
});

test("deployments: canary analysis rolls back a bad release at 5% of traffic", async ({ page }) => {
  await page.goto("/playground/deployment-strategies");
  await seek(page, 8);
  await expect(caption(page)).toContainText("Rolled back");
  await expect(player(page)).toContainText("Canary analysis");

  await page.getByText("All at once", { exact: true }).click();
  await seek(page, 6);
  await expect(caption(page)).toContainText("every request fails");
});

test("autoscaling: without a scale-in window, bursty traffic keeps failing", async ({ page }) => {
  await page.goto("/playground/autoscaling");
  await page.getByText("Bursty", { exact: true }).click();
  await page.getByRole("group", { name: "Scale-in window" }).getByText("None").click();
  await seek(page, 40);
  await expect(player(page)).toContainText("Overloaded");
});

test("service calls: a crashed optional service is survivable only with a fallback", async ({
  page,
}) => {
  await page.goto("/playground/service-calls");
  await seek(page, 2);
  await page.getByRole("button", { name: "Crash recommendations service" }).click();
  await seek(page, 5);
  await expect(caption(page)).toContainText("0% of requests succeeded");

  await page.getByText("Fallback for recommendations", { exact: true }).click();
  await seek(page, 2);
  await page.getByRole("button", { name: "Crash recommendations service" }).click();
  await seek(page, 5);
  await expect(caption(page)).toContainText("without recommendations");
});

test("event sourcing: a stopped projector leaves the balance view behind", async ({ page }) => {
  await page.goto("/playground/event-sourcing");
  await seek(page, 5);
  await page.getByRole("button", { name: "Stop the projector" }).click();
  await seek(page, 10);
  await expect(caption(page)).toContainText("behind");
  await page.getByRole("button", { name: "Restart the projector" }).click();
  await seek(page, 25);
  await expect(caption(page)).toContainText("up to date");
});

test("hexagonal explorer: swapping the database adds only an adapter", async ({ page }) => {
  await page.goto("/playground/hexagonal-architecture");
  const table = page.getByRole("region", { name: "Impact of this change in each architecture" });
  await expect(table.getByRole("row", { name: /hexagonal/i })).toContainText("no");
  await page.getByText("Layered", { exact: true }).click();
  await expect(page.getByText("ORM entities (shared model)").locator("..")).toContainText("edited");
  await page.getByLabel("Change a discount rule").check();
  await expect(table.getByRole("row", { name: /layered/i })).toContainText("yes");
});

test("chunking explorer: structure-aware chunks with headings find the failover approval", async ({
  page,
}) => {
  await page.goto("/playground/chunking");
  await page.getByLabel(/Who has to approve a database failover/).check();
  await expect(page.getByText(/^Not answerable/)).toBeVisible();
  await page.getByText("Structure-aware", { exact: true }).click();
  await page.getByText("Add section headings", { exact: true }).click();
  await expect(page.getByText(/^Answerable/)).toBeVisible();
});

test("hybrid search: only vector search finds a paraphrased question", async ({ page }) => {
  await page.goto("/playground/hybrid-search");
  await page.getByText("how do I get my money back", { exact: true }).click();
  const keyword = page.getByRole("region", { name: "Keyword (BM25) results" });
  const vector = page.getByRole("region", { name: "Vector (toy embedding) results" });
  await expect(keyword).not.toContainText("Refunds for cancelled orders");
  await expect(vector.getByRole("listitem").first()).toContainText("Refunds for cancelled orders");
});

test("context budget: dropping old turns loses the order number; summarising keeps it", async ({
  page,
}) => {
  await page.goto("/playground/context-budget");
  await expect(page.getByText(/^Rejected:/)).toBeVisible();
  await page.getByRole("radio", { name: /Drop the oldest turns/ }).check();
  await expect(page.getByText(/has lost the order number/)).toBeVisible();
  await page.getByRole("radio", { name: /Summarise older turns/ }).check();
  await expect(page.getByText(/The assistant can answer/)).toBeVisible();
});

test("agent loop: approval blocks an injected refund", async ({ page }) => {
  await page.goto("/playground/agent-loop");
  await page.getByText("Prompt injection", { exact: true }).click();
  await expect(page.getByText(/Where this run ends: Harmful/)).toBeVisible();
  await page.getByText("Human approval for refunds", { exact: true }).click();
  await expect(page.getByText(/the injected \$500 refund was blocked/)).toBeVisible();
  await page.getByRole("button", { name: "Next step" }).click();
  await expect(
    page.getByRole("list", { name: "Messages so far" }).getByRole("listitem"),
  ).toHaveCount(2);
});

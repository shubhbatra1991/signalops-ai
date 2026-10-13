import { expect, test } from "@playwright/test";
import { dismissGuideBeforeLoad } from "./helpers";

test("public-demo gate rejects direct connection and insight requests", async ({ request, baseURL }) => {
  const headers = { Origin: baseURL!, "Content-Type": "application/json" };
  const connection = await request.post("/api/ai/connection", {
    headers: { ...headers, "X-SignalOps-Action": "test-connection" },
    data: { provider: "openai", model: "gpt-4.1-mini", apiKey: "e2e-not-a-real-key" },
  });
  expect(connection.status()).toBe(403);
  await expect(connection.json()).resolves.toMatchObject({ ok: false, code: "provider_requests_disabled" });

  const insights = await request.post("/api/ai/insights", {
    headers: { ...headers, "X-SignalOps-Action": "insights" },
    data: {},
  });
  expect(insights.status()).toBe(403);
  await expect(insights.json()).resolves.toMatchObject({ ok: false, code: "provider_requests_disabled" });
});

test("browser BYOK test uses mocked transport and never persists its key", async ({ page, context }) => {
  await dismissGuideBeforeLoad(page);
  const secret = "e2e-synthetic-key-never-send";
  await page.route("**/api/ai/connection", async (route) => {
    if (route.request().method() === "GET") {
      await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ status: "unconfigured", serverTestsEnabled: false, serverInsightsEnabled: false, deployment: { mode: "self-hosted", providerRequestsEnabled: true, configurationValid: true } }) });
      return;
    }
    expect(route.request().postData()).toContain(secret);
    await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ ok: true, provider: "openai", model: "gpt-4.1-mini", requestId: "e2e-mocked" }) });
  });
  await page.goto("/demo/settings");
  await page.getByRole("combobox", { name: "Provider" }).selectOption("openai");
  await page.getByRole("textbox", { name: "API key" }).fill(secret);
  await page.getByRole("link", { name: "AI Insights" }).click();
  await page.getByRole("link", { name: "Settings" }).click();
  await expect(page.getByRole("textbox", { name: "API key" })).toHaveValue(secret);
  await page.getByRole("button", { name: "Test connection" }).click();
  await expect(page.getByText(/Connection verified with a synthetic request/)).toBeVisible();

  const storage = await page.evaluate(() => ({ local: JSON.stringify(localStorage), session: JSON.stringify(sessionStorage), href: location.href }));
  expect(`${storage.local}${storage.session}${storage.href}`).not.toContain(secret);
  expect(JSON.stringify(await context.cookies())).not.toContain(secret);

  await page.getByRole("link", { name: "Switch experience" }).first().click();
  await expect(page).toHaveURL(/\/start$/);
  await page.getByRole("link", { name: /Open guest demo/ }).click();
  await expect(page).toHaveURL(/\/demo$/);
  await expect(page.getByRole("heading", { name: "Overview", exact: true })).toBeVisible();
  await page.getByRole("link", { name: "Settings" }).click();
  await expect(page).toHaveURL(/\/demo\/settings$/);
  await expect(page.getByRole("textbox", { name: "API key" })).toHaveValue("");
});

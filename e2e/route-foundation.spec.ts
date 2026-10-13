import { expect, test } from "@playwright/test";
import { dismissalKey } from "./helpers";

test("legacy application routes preserve supported queries and redirect to the guest application", async ({ page }) => {
  await page.goto("/app/events?project=demo-project-flowpilot&range=first-week&q=report");
  await expect(page).toHaveURL(/\/demo\/events\?project=demo-project-flowpilot&range=first-week&q=report$/);
  await expect(page.getByRole("heading", { name: "Events" })).toBeVisible();

  await page.goto("/funnels?range=second-week");
  await expect(page).toHaveURL(/\/demo\/funnels\?range=second-week$/);

  await page.goto("/?project=demo-project-flowpilot&range=all");
  await expect(page).toHaveURL(/\/demo\?project=demo-project-flowpilot&range=all$/);
});

test("workspace routes fail closed and do not consume guest browser state", async ({ page }) => {
  await page.goto("/demo/missions");
  await page.evaluate(({ guideKey }) => {
    localStorage.setItem(guideKey, "1");
    localStorage.setItem("signalops.missions.v1", JSON.stringify({ version: 1, missions: [] }));
  }, { guideKey: dismissalKey });

  const response = await page.goto("/w/personal");
  expect(response?.status()).toBe(404);
  await expect(page.getByRole("heading", { level: 1, name: "404" })).toBeVisible();
  await expect(page.getByText("FlowPilot Demo")).toHaveCount(0);
  expect(await page.evaluate(() => localStorage.getItem("signalops.missions.v1"))).toBe(JSON.stringify({ version: 1, missions: [] }));
});

test("landing page distinguishes the available guest journey from deferred sign-in", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("link", { name: "Open demo" })).toHaveAttribute("href", "/start");
  await page.getByRole("link", { name: "Open demo" }).click();
  await expect(page).toHaveURL(/\/start$/);
  await expect(page.getByRole("link", { name: /Open guest demo/ })).toHaveAttribute("href", "/demo");
  await expect(page.getByLabel("My Workspace sign-in unavailable")).toBeVisible();
  await expect(page.getByText(/Google authentication and private personal workspaces are not available yet/)).toBeVisible();
  await expect(page.getByRole("link", { name: "SignalOps-AI home" })).toHaveAttribute("href", "/");
});

test("experience selection supports themes and a 320px viewport without horizontal overflow", async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 800 });
  await page.goto("/start");
  await page.getByRole("combobox", { name: "Appearance" }).selectOption("dark");
  await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");
  await page.getByRole("combobox", { name: "Appearance" }).selectOption("light");
  await expect(page.locator("html")).toHaveAttribute("data-theme", "light");
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth)).toBe(true);
});

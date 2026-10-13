import { expect, test } from "@playwright/test";
import { dismissGuideBeforeLoad } from "./helpers";

test.beforeEach(async ({ page }) => dismissGuideBeforeLoad(page));

test("overview, events and funnels share filter navigation", async ({ page }) => {
  await page.goto("/app");
  await expect(page.getByRole("heading", { name: "Overview" })).toBeVisible();
  await page.getByRole("combobox", { name: "Date range" }).selectOption("first-week");
  await page.getByRole("button", { name: "Apply filters" }).click();
  await expect(page).toHaveURL(/range=first-week/);

  await page.getByRole("link", { name: "Events" }).click();
  await page.getByRole("searchbox", { name: "Search events" }).fill("report");
  await page.getByRole("button", { name: "Apply filters" }).click();
  await expect(page).toHaveURL(/q=report/);
  await expect(page.getByRole("heading", { name: "Events" })).toBeVisible();

  await page.getByRole("link", { name: "Funnels" }).click();
  await expect(page.getByRole("heading", { name: "Funnels" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Sequential funnel methodology" })).toBeVisible();
});

test("feedback theme exposes record and event evidence links", async ({ page }) => {
  await page.goto("/app/feedback?range=all&theme=integration-permissions&sort=desc&page=1");
  await expect(page.getByRole("heading", { name: "Feedback", exact: true })).toBeVisible();
  await expect(page.getByRole("combobox", { name: "Theme" })).toHaveValue("integration-permissions");
  const evidenceLink = page.locator(".opportunity-grid .evidence-links a").first();
  await expect(evidenceLink).toBeVisible();
  await evidenceLink.click();
  await expect(page).toHaveURL(/q=demo-feedback-/);
  await page.locator("details.feedback-detail summary").first().click();
  const eventLink = page.locator(".feedback-context-links a").first();
  await expect(eventLink).toBeVisible();
  await expect(eventLink).toHaveAttribute("href", /\/app\/events/);
});

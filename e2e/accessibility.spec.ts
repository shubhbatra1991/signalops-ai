import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page } from "@playwright/test";
import { dismissGuideBeforeLoad } from "./helpers";

const wcagTags = ["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22a", "wcag22aa"];

async function expectNoAxeViolations(page: Page) {
  const results = await new AxeBuilder({ page }).withTags(wcagTags).analyze();
  expect(results.violations.map((violation) => ({
    id: violation.id,
    impact: violation.impact,
    targets: violation.nodes.flatMap((node) => node.target),
  }))).toEqual([]);
}

test("landing page has no detectable WCAG A/AA violations", async ({ page }) => {
  await page.goto("/");
  await expectNoAxeViolations(page);
});

for (const [name, path] of [
  ["Overview", "/app"],
  ["Events", "/app/events"],
  ["Funnels", "/app/funnels"],
  ["Feedback", "/app/feedback"],
  ["AI Insights", "/app/insights"],
  ["Product Missions", "/app/missions"],
  ["Impact Analytics", "/app/impact"],
  ["Settings", "/app/settings"],
] as const) {
  test(`${name} has no detectable WCAG A/AA violations`, async ({ page }) => {
    await dismissGuideBeforeLoad(page);
    await page.goto(path);
    await expect(page.getByRole("heading", { name, exact: true })).toBeVisible();
    await expectNoAxeViolations(page);
  });
}

test("mission editor dialog has no detectable WCAG A/AA violations", async ({ page }) => {
  await dismissGuideBeforeLoad(page);
  await page.goto("/app/missions");
  await page.getByRole("button", { name: "New Mission" }).click();
  await expect(page.getByRole("dialog", { name: "Review new mission" })).toBeVisible();
  await expectNoAxeViolations(page);
});

test("mobile navigation has no detectable WCAG A/AA violations", async ({ page }) => {
  await dismissGuideBeforeLoad(page);
  await page.setViewportSize({ width: 320, height: 800 });
  await page.goto("/app");
  await page.locator("summary[aria-label='Menu — toggle navigation']").click();
  await expect(page.getByRole("navigation", { name: "Mobile navigation" })).toBeVisible();
  await expectNoAxeViolations(page);
});

test("active guided demo has no detectable WCAG A/AA violations", async ({ page }) => {
  await page.goto("/app");
  await page.getByRole("button", { name: "Start guided demo" }).click();
  await expect(page.getByRole("heading", { name: "Start with the Overview" })).toBeVisible();
  await expectNoAxeViolations(page);
});

test("reduced motion, forced colours and chart alternatives remain available", async ({ page }) => {
  await dismissGuideBeforeLoad(page);
  await page.emulateMedia({ reducedMotion: "reduce", forcedColors: "active" });
  await page.goto("/app");
  expect(await page.evaluate(() => matchMedia("(prefers-reduced-motion: reduce)").matches)).toBe(true);
  expect(await page.evaluate(() => matchMedia("(forced-colors: active)").matches)).toBe(true);
  const skipLink = page.getByRole("link", { name: "Skip to main content" });
  await skipLink.focus();
  expect(await skipLink.evaluate((element) => getComputedStyle(element).outlineStyle)).not.toBe("none");
  await expect(page.getByRole("img", { name: /Exact counts in the table below/ })).toBeVisible();
  await page.getByText("View daily counts as a table").click();
  await expect(page.getByRole("table", { name: "Demo event occurrences by UTC date" })).toBeVisible();
});

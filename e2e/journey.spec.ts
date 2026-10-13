import { expect, test } from "@playwright/test";
import { dismissalKey } from "./helpers";

test("landing page opens the application and completes the six-stage guide", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("heading", { level: 1 })).toContainText("From customer signals");
  await page.getByRole("link", { name: /Explore the demo/ }).click();
  await expect(page).toHaveURL(/\/start$/);
  await page.getByRole("link", { name: /Open guest demo/ }).click();
  await expect(page).toHaveURL(/\/demo$/);
  await expect(page.getByRole("heading", { name: "See the evidence trail in six steps" })).toBeVisible();
  await page.getByRole("button", { name: "Start guided demo" }).click();

  const titles = [
    "Start with the Overview",
    "Inspect the onboarding funnel",
    "Follow a recurring feedback theme",
    "Understand optional BYOK research",
    "Review a Product Mission",
    "Separate completion from impact",
  ];
  for (let index = 0; index < titles.length; index += 1) {
    await expect(page.getByRole("heading", { name: titles[index] })).toBeVisible();
    if (index < titles.length - 1) await page.getByRole("button", { name: "Next", exact: true }).click();
  }
  await expect(page).toHaveURL(/\/demo\/impact/);
  await page.getByRole("button", { name: "Finish guide" }).click();
  await expect(page.getByRole("button", { name: /Demo guide/ })).toBeVisible();
  expect(await page.evaluate((key) => localStorage.getItem(key), dismissalKey)).toBe("1");

  await page.getByRole("button", { name: /Demo guide/ }).click();
  await expect(page.getByRole("heading", { name: titles[0] })).toBeVisible();
  await page.getByRole("button", { name: "Skip guide" }).click();
});

test("guide can be dismissed before starting and restarted", async ({ page }) => {
  await page.goto("/demo");
  await page.getByRole("button", { name: "Not now" }).click();
  await expect(page.getByRole("button", { name: /Demo guide/ })).toBeFocused();
  await page.getByRole("button", { name: /Demo guide/ }).click();
  await expect(page.getByText("Step 1 of 6")).toBeVisible();
});

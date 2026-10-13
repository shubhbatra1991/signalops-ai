import { expect, test } from "@playwright/test";
import { dismissGuideBeforeLoad, fillMission } from "./helpers";

test.beforeEach(async ({ page }) => dismissGuideBeforeLoad(page));

test("manual mission can be edited, completed and restored after reload", async ({ page }) => {
  const title = "E2E onboarding research";
  await page.goto("/demo/missions");
  const newMission = page.getByRole("button", { name: "New Mission" });
  await fillMission(page, title);
  await expect(newMission).toBeFocused();
  await expect(page.getByRole("heading", { name: title })).toBeVisible();
  await page.reload();
  await expect(page.getByRole("heading", { name: title })).toBeVisible();

  await page.getByRole("button", { name: `View details for ${title}` }).click();
  await expect(page.getByRole("dialog", { name: title })).toBeVisible();
  expect(await page.evaluate(() => document.activeElement?.closest("dialog") !== null)).toBe(true);
  await page.getByRole("button", { name: `Edit ${title}` }).click();
  await page.getByRole("textbox", { name: "Mission title" }).fill(`${title} updated`);
  await page.getByRole("checkbox", { name: /I reviewed these fields/ }).check();
  await page.getByRole("button", { name: "Save mission" }).click();
  await page.getByRole("combobox", { name: `Status for ${title} updated` }).selectOption("completed");

  await page.goto("/demo/impact");
  await expect(page.getByRole("heading", { name: "Impact Analytics" })).toBeVisible();
  await expect(page.getByRole("button", { name: `${title} updated` })).toBeVisible();
  await expect(page.getByText("not evaluated", { exact: true })).toBeVisible();
  await expect(page.getByText(/Completion never verifies success/)).toBeVisible();
});

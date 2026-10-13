import { expect, test } from "@playwright/test";
import { dismissGuideBeforeLoad } from "./helpers";

test.beforeEach(async ({ page }) => dismissGuideBeforeLoad(page));

test("Light, Dark, controlled-time Auto and an accent apply consistently", async ({ page }) => {
  await page.clock.setFixedTime(new Date(2030, 5, 1, 19, 0, 0));
  await page.goto("/demo/settings");
  const root = page.locator("html");
  await expect(root).toHaveAttribute("data-theme", "light");
  await page.getByRole("combobox", { name: "Appearance" }).selectOption("dark");
  await expect(root).toHaveAttribute("data-theme", "dark");
  await page.getByRole("combobox", { name: "Appearance" }).selectOption("light");
  await expect(root).toHaveAttribute("data-theme", "light");
  await page.getByRole("combobox", { name: "Appearance" }).selectOption("auto");
  await expect(root).toHaveAttribute("data-theme", "dark");
  await page.getByRole("combobox", { name: "Accent" }).selectOption("violet");
  await expect(root).toHaveAttribute("data-accent", "violet");
});

test("keyboard navigation and application layout remain usable at 320px", async ({ page, browserName }) => {
  await page.setViewportSize({ width: 320, height: 800 });
  await page.goto("/demo");
  const skipLink = page.getByRole("link", { name: "Skip to main content" });
  if (browserName === "webkit") await skipLink.focus();
  else await page.keyboard.press("Tab");
  await expect(skipLink).toBeFocused();
  await page.keyboard.press("Enter");
  await expect(page.locator("#main-content")).toBeFocused();
  const menu = page.locator("summary[aria-label='Menu — toggle navigation']");
  await menu.focus();
  await page.keyboard.press("Enter");
  await expect(page.getByRole("navigation", { name: "Mobile navigation" })).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(menu).toBeFocused();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth)).toBe(true);
});

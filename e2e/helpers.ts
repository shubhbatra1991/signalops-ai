import type { Page } from "@playwright/test";

export const dismissalKey = "signalops.demo-guide.dismissed";

export async function dismissGuideBeforeLoad(page: Page) {
  await page.addInitScript((key) => localStorage.setItem(key, "1"), dismissalKey);
}

export async function fillMission(page: Page, title: string) {
  await page.getByRole("button", { name: "New Mission" }).click();
  await page.getByRole("textbox", { name: "Mission title" }).fill(title);
  await page.getByRole("textbox", { name: "Objective" }).fill("Investigate the observed onboarding friction.");
  await page.getByRole("textbox", { name: "Success criteria" }).fill("Review the selected evidence and define a measurable next step.");
  await page.getByRole("textbox", { name: "Metric or evidence to monitor" }).fill("Onboarding completion");
  await page.getByRole("textbox", { name: "Planned evaluation approach" }).fill("Compare compatible UTC windows after completion.");
  await page.getByRole("checkbox", { name: /I reviewed these fields/ }).check();
  await page.getByRole("button", { name: "Save mission" }).click();
}

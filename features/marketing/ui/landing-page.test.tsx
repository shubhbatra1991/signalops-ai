// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, expect, test, vi } from "vitest";
import { renderToString } from "react-dom/server";
import type { DemoScreenModel } from "@/server/modules/demo/read-demo-screen";
import { LandingPage } from "./landing-page";

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

const preview = {
  project: { name: "FlowPilot Demo" },
  activity: [{ date: "2026-06-01", events: 3 }, { date: "2026-06-02", events: 5 }],
  eventSummary: { totalEvents: 8, uniqueCustomers: 2 },
  funnel: { name: "Onboarding", entrants: 5, completed: 3, conversionRate: 60 },
  metadata: { datasetVersion: "demo-v1" },
} as DemoScreenModel;

test("routes primary entry actions through the experience chooser", () => {
  render(<LandingPage preview={preview} />);
  expect(screen.getAllByRole("link", { name: "SignalOps-AI home" })).toHaveLength(2);
  expect(screen.getAllByRole("link", { name: "SignalOps-AI home" })[0]).toHaveAttribute("href", "/");
  for (const name of ["Open demo", /Explore the demo/, /Open SignalOps-AI/]) {
    expect(screen.getByRole("link", { name })).toHaveAttribute("href", "/start");
  }
});

test("server markup keeps deterministic preview values and primary actions readable without hydration", () => {
  const html = renderToString(<LandingPage preview={preview} />);
  expect(html).toContain("Total events");
  expect(html).toContain(">8<");
  expect(html).toContain("60.0%");
  expect(html).toContain("Explore the demo");

  const serverMarkup = document.createElement("div");
  serverMarkup.innerHTML = html;
  const readableRegions = serverMarkup.querySelectorAll('[data-motion-region="hero-copy"], [data-motion-region="product-preview"], [data-motion-region="section"]');
  expect(readableRegions.length).toBeGreaterThan(0);
  for (const region of readableRegions) {
    expect(region.getAttribute("style") ?? "").not.toContain("opacity:0");
  }
});

test("reserves motion regions around the hero and calculated preview", () => {
  render(<LandingPage preview={preview} />);
  expect(document.querySelector('[data-motion-region="hero-copy"]')).toHaveAttribute("data-motion-sequence", "cinematic");
  expect(document.querySelector('[data-motion-region="product-preview"]')).toHaveAttribute("data-motion-sequence", "cinematic");
  expect(document.querySelectorAll("[data-motion-step]")).toHaveLength(6);
  expect(document.querySelectorAll('[data-motion-preview="metric"]')).toHaveLength(3);
  expect(screen.getByLabelText("Calculated FlowPilot demonstration preview")).toHaveTextContent("5 entrants → 3 completed");
});

test("hydrates the readable server markup without a hydration mismatch", () => {
  const container = document.createElement("div");
  container.innerHTML = renderToString(<LandingPage preview={preview} />);
  const consoleError = vi.spyOn(console, "error").mockImplementation(() => undefined);

  render(<LandingPage preview={preview} />, { container, hydrate: true });

  const hydrationMessages = consoleError.mock.calls
    .flat()
    .filter((message) => typeof message === "string" && message.toLowerCase().includes("hydration"));
  expect(hydrationMessages).toEqual([]);
});

// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, expect, test } from "vitest";
import type { DemoScreenModel } from "@/server/modules/demo/read-demo-screen";
import { LandingPage } from "./landing-page";

afterEach(cleanup);

const preview = {
  project: { name: "FlowPilot Demo" },
  activity: [],
  eventSummary: { totalEvents: 0, uniqueCustomers: 0 },
  funnel: undefined,
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

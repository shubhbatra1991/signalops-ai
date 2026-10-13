// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, expect, test } from "vitest";
import { StoryRail } from "./story-rail";
import { MarketingMotionProvider } from "./landing-motion";

afterEach(cleanup);

function renderStoryRail() {
  return render(<MarketingMotionProvider><StoryRail /></MarketingMotionProvider>);
}

test("workflow is an accessible keyboard-operated tab sequence", () => {
  renderStoryRail();
  const events = screen.getByRole("tab", { name: /Events/ });
  const funnels = screen.getByRole("tab", { name: /Funnels/ });
  expect(events).toHaveAttribute("aria-selected", "true");
  fireEvent.keyDown(events, { key: "ArrowRight" });
  expect(funnels).toHaveFocus();
  expect(funnels).toHaveAttribute("aria-selected", "true");
  expect(screen.getByRole("tabpanel")).toHaveTextContent("strict sequential progression");
  expect(screen.getByRole("tabpanel")).toHaveAttribute("data-motion-workflow-panel", "Funnels");
  expect(screen.getByRole("link", { name: /Explore Funnels/ })).toHaveAttribute("href", "/demo/funnels");
});

test("Home and End move to the workflow boundaries", () => {
  renderStoryRail();
  const first = screen.getByRole("tab", { name: /Events/ });
  fireEvent.keyDown(first, { key: "End" });
  const last = screen.getByRole("tab", { name: /Impact/ });
  expect(last).toHaveFocus();
  fireEvent.keyDown(last, { key: "Home" });
  expect(first).toHaveFocus();
});

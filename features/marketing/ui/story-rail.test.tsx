// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, expect, test, vi } from "vitest";
import { StoryRail } from "./story-rail";
import { MarketingMotionProvider } from "./landing-motion";

afterEach(() => {
  cleanup();
  vi.useRealTimers();
});

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

test("explicit presentation advances stages and supports pause", () => {
  vi.useFakeTimers();
  renderStoryRail();
  const play = screen.getByRole("button", { name: "Play journey" });
  fireEvent.click(play);
  expect(screen.getByRole("button", { name: "Pause journey" })).toHaveAttribute("aria-pressed", "true");
  act(() => vi.advanceTimersByTime(3800));
  expect(screen.getByRole("tab", { name: /Funnels/ })).toHaveAttribute("aria-selected", "true");
  fireEvent.click(screen.getByRole("button", { name: "Pause journey" }));
  act(() => vi.advanceTimersByTime(3800));
  expect(screen.getByRole("tab", { name: /Funnels/ })).toHaveAttribute("aria-selected", "true");
});

test("manual stage selection pauses the presentation and renders a distinct visual", () => {
  renderStoryRail();
  fireEvent.click(screen.getByRole("button", { name: "Play journey" }));
  fireEvent.click(screen.getByRole("tab", { name: /Missions/ }));
  expect(screen.getByRole("button", { name: "Play journey" })).toHaveAttribute("aria-pressed", "false");
  expect(document.querySelector('[data-story-visual="missions"]')).toBeInTheDocument();
  expect(screen.getByRole("tabpanel")).toHaveTextContent("editable work");
});

test("each workflow stage renders its own evidence transformation", () => {
  renderStoryRail();
  for (const visual of ["events", "funnels", "feedback", "insights", "missions", "impact"]) {
    const label = visual === "insights" ? /AI Insights/ : new RegExp(visual, "i");
    fireEvent.click(screen.getByRole("tab", { name: label }));
    expect(document.querySelector(`[data-story-visual="${visual}"]`)).toBeInTheDocument();
  }
});

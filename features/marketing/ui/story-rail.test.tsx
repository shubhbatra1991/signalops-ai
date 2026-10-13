// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, expect, test } from "vitest";
import { StoryRail } from "./story-rail";

afterEach(cleanup);

test("workflow is an accessible keyboard-operated tab sequence", () => {
  render(<StoryRail />);
  const events = screen.getByRole("tab", { name: /Events/ });
  const funnels = screen.getByRole("tab", { name: /Funnels/ });
  expect(events).toHaveAttribute("aria-selected", "true");
  fireEvent.keyDown(events, { key: "ArrowRight" });
  expect(funnels).toHaveFocus();
  expect(funnels).toHaveAttribute("aria-selected", "true");
  expect(screen.getByRole("tabpanel")).toHaveTextContent("strict sequential progression");
  expect(screen.getByRole("link", { name: /Explore Funnels/ })).toHaveAttribute("href", "/app/funnels");
});

test("Home and End move to the workflow boundaries", () => {
  render(<StoryRail />);
  const first = screen.getByRole("tab", { name: /Events/ });
  fireEvent.keyDown(first, { key: "End" });
  const last = screen.getByRole("tab", { name: /Impact/ });
  expect(last).toHaveFocus();
  fireEvent.keyDown(last, { key: "Home" });
  expect(first).toHaveFocus();
});

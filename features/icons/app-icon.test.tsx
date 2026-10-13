// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import { cleanup, render } from "@testing-library/react";
import { afterEach, expect, test } from "vitest";
import { AppIcon, EmptyStateIcon } from "./app-icon";

afterEach(cleanup);

test("uses the shared decorative icon contract", () => {
  const { container } = render(<AppIcon name="events" />);
  const icon = container.querySelector("svg");
  expect(icon).toHaveAttribute("width", "20");
  expect(icon).toHaveAttribute("height", "20");
  expect(icon).toHaveAttribute("stroke-width", "1.8");
  expect(icon).toHaveAttribute("aria-hidden", "true");
  expect(icon).toHaveAttribute("focusable", "false");
});

test("uses 24px icons for empty states", () => {
  const { container } = render(<EmptyStateIcon name="feedback" />);
  expect(container.querySelector("svg")).toHaveAttribute("width", "24");
});

test("supports compact action and semantic status icons without accessible-name noise", () => {
  const { container } = render(<><AppIcon name="arrow-right" size={18} /><AppIcon name="evidence" size={16} /><AppIcon name="warning" size={18} /></>);
  const icons = [...container.querySelectorAll("svg")];
  expect(icons.map((icon) => icon.getAttribute("width"))).toEqual(["18", "16", "18"]);
  expect(icons.every((icon) => icon.getAttribute("aria-hidden") === "true")).toBe(true);
});

test.each([
  ["funnels", "lucide-filter"],
  ["feedback", "lucide-message-square"],
  ["insights", "lucide-brain-circuit"],
  ["impact", "lucide-chart-no-axes-combined"],
  ["guest", "lucide-eye"],
  ["workspace", "lucide-users"],
] as const)("maps %s to the approved Lucide glyph", (name, className) => {
  const { container } = render(<AppIcon name={name} />);
  expect(container.querySelector("svg")).toHaveClass(className);
});

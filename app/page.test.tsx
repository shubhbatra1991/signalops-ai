// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import { cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import { afterEach, expect, test, vi } from "vitest";
import { ApplicationShell } from "@/features/shell/ui/application-shell";
import { navigation } from "@/features/shell/navigation";
import { SectionPage } from "@/features/shell/ui/section-page";

const queryState = vi.hoisted(() => ({ value: "" }));
vi.mock("next/navigation", () => ({ usePathname: () => "/app", useSearchParams: () => new URLSearchParams(queryState.value) }));
const content = <h1>Overview</h1>;
afterEach(() => { cleanup(); localStorage.clear(); queryState.value = ""; });

test("analytics navigation preserves common URL context without carrying event-only search", () => {
  queryState.value = "project=demo-project-flowpilot&range=first-week&customer=demo-customer-05&funnel=demo-funnel-onboarding&q=report";
  render(<ApplicationShell>{content}</ApplicationShell>);
  const nav = screen.getByRole("navigation", { name: "Primary navigation" });
  for (const name of ["Overview", "Events", "Funnels", "Feedback"]) {
    const href = within(nav).getByRole("link", { name }).getAttribute("href");
    expect(href).toContain("range=first-week");
    expect(href).toContain("customer=demo-customer-05");
    expect(href).not.toContain("q=report");
  }
});

test("shell has named navigation, landmarks, current route and skip target", () => {
  render(<ApplicationShell>{content}</ApplicationShell>);
  expect(screen.getByRole("main")).toHaveAttribute("id", "main-content");
  expect(screen.getByRole("banner")).toBeInTheDocument();
  expect(screen.getByRole("link", { name: "Skip to main content" })).toHaveAttribute("href", "#main-content");
  expect(screen.getByRole("heading", { level: 1, name: "Overview" })).toBeVisible();
  const nav = screen.getByRole("navigation", { name: "Primary navigation" });
  expect(within(nav).getAllByRole("link")).toHaveLength(8);
  expect(within(nav).getByRole("link", { name: "Overview" })).toHaveAttribute("aria-current", "page");
});

test.each(navigation)("$title shows a truthful empty state", (section) => {
  render(<SectionPage section={section} />);
  expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent(section.title);
  expect(screen.getByRole("heading", { level: 2, name: section.emptyTitle })).toBeInTheDocument();
  expect(screen.getByText("No connected data · No generated results")).toBeInTheDocument();
});

test("mobile disclosure exposes all routes and Escape closes it with focus restored", () => {
  render(<ApplicationShell>{content}</ApplicationShell>);
  const summary = screen.getByText("Menu");
  const details = summary.closest("details");
  if (!details) throw new Error("Missing native disclosure");
  fireEvent.click(summary);
  expect(details.open).toBe(true);
  expect(within(screen.getByRole("navigation", { name: "Mobile navigation" })).getAllByRole("link")).toHaveLength(8);
  fireEvent.keyDown(summary, { key: "Escape" });
  expect(details.open).toBe(false);
  expect(summary).toHaveFocus();
});

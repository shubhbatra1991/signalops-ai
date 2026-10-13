// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import { act, cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import { afterEach, expect, test, vi } from "vitest";
import { renderToString } from "react-dom/server";
import { hydrateRoot } from "react-dom/client";
vi.mock("server-only", () => ({}));
import { FeedbackScreen } from "./feedback-screen";
import { readFeedbackScreen } from "@/server/modules/demo/read-feedback-screen";
import { demoRepository } from "@/server/modules/demo/repository";

afterEach(() => { cleanup(); vi.restoreAllMocks(); });

test("all feedback controls have accessible names and use a URL-backed GET form", async () => {
  render(<FeedbackScreen model={await readFeedbackScreen({})} />);
  expect(screen.getByRole("heading", { level: 1, name: "Feedback" })).toBeInTheDocument();
  expect(screen.getByRole("form", { name: "Feedback filters" })).toHaveAttribute("method", "get");
  for (const name of ["Project", "Date range", "Customer", "Funnel", "Category", "Source", "Sentiment", "Theme", "Sort order"]) {
    expect(screen.getByRole("combobox", { name })).toBeInTheDocument();
  }
  expect(screen.getByRole("searchbox", { name: "Search feedback" })).toHaveAttribute("maxLength", "80");
  expect(screen.getByRole("button", { name: "Apply filters" })).toHaveAttribute("type", "submit");
  expect(screen.getByRole("link", { name: "Reset filters" })).toHaveAttribute("href", "/demo/feedback");
  expect(screen.getByText(/fictional, not live customer activity/)).toBeInTheDocument();
});
test("summary shows full selection, pagination preserves all feedback filters", async () => {
  render(<FeedbackScreen model={await readFeedbackScreen({ sort: "asc" })} />);
  expect(within(screen.getByRole("region", { name: "Feedback records" })).getByText("24", { exact: true })).toBeInTheDocument();
  const nav = screen.getByRole("navigation", { name: "Feedback pagination" });
  expect(within(nav).getByText("Page 1 of 3")).toBeInTheDocument();
  expect(within(nav).getByRole("link", { name: "Next page" })).toHaveAttribute("href", expect.stringContaining("sort=asc&page=2"));
});
test("URL values restore selected controls", async () => {
  render(<FeedbackScreen model={await readFeedbackScreen({ source: "demo-support", sentiment: "negative", category: "friction", theme: "integration-recovery", q: "timeout", sort: "asc", range: "second-week" })} />);
  expect(screen.getByRole("combobox", { name: "Source" })).toHaveValue("demo-support");
  expect(screen.getByRole("combobox", { name: "Sentiment" })).toHaveValue("negative");
  expect(screen.getByRole("combobox", { name: "Category" })).toHaveValue("friction");
  expect(screen.getByRole("combobox", { name: "Theme" })).toHaveValue("integration-recovery");
  expect(screen.getByRole("combobox", { name: "Date range" })).toHaveValue("second-week");
  expect(screen.getByRole("searchbox", { name: "Search feedback" })).toHaveValue("timeout");
});
test("native detail reveals provenance, partial participation and scoped event links", async () => {
  render(<FeedbackScreen model={await readFeedbackScreen({ q: "demo-feedback-01", range: "first-week" })} />);
  fireEvent.click(screen.getByLabelText("View feedback demo-feedback-01", { exact: true }));
  const detail = screen.getByRole("region", { name: "Details for demo-feedback-01" });
  expect(detail).toBeVisible();
  expect(within(detail).getByText(/fixture-authored-not-model-inferred/)).toBeInTheDocument();
  expect(within(detail).getByText(/2 of 4 steps observed/)).toBeInTheDocument();
  expect(within(detail).getByText(/no abandonment claim/)).toBeInTheDocument();
  const event = within(detail).getByRole("link", { name: /integration_failed · demo-customer-02:integration-failed-2/ });
  const url = new URL(event.getAttribute("href") ?? "", "https://demo.invalid");
  expect(url.pathname).toBe("/demo/events");
  expect(url.searchParams.get("customer")).toBe("demo-customer-02");
  expect(url.searchParams.get("q")).toBe("demo-customer-02:integration-failed-2");
  expect(url.searchParams.get("range")).toBe("first-week");
  expect(within(detail).getByRole("link", { name: "View customer funnel over full selected window" })).toHaveAttribute("href", expect.stringContaining("/demo/funnels?"));
});
test("missing event history is displayed as unknown, not inactivity or abandonment", async () => {
  vi.spyOn(demoRepository, "listEvents").mockResolvedValue([]);
  render(<FeedbackScreen model={await readFeedbackScreen({ q: "demo-feedback-01" })} />);
  fireEvent.click(screen.getByLabelText("View feedback demo-feedback-01", { exact: true }));
  expect(screen.getByText(/Participation is unknown/)).toBeInTheDocument();
  expect(screen.getByText("No linked events available in this observation window.")).toBeInTheDocument();
});
test("empty results and insufficient recurring evidence provide reset and honest states", async () => {
  render(<FeedbackScreen model={await readFeedbackScreen({ q: "no-matching-record" })} />);
  expect(screen.getByRole("heading", { name: "No matching feedback" })).toBeInTheDocument();
  expect(screen.getByRole("heading", { name: "Not enough recurring evidence" })).toBeInTheDocument();
  expect(screen.getByRole("link", { name: "Reset all feedback filters" })).toHaveAttribute("href", "/demo/feedback");
  expect(screen.queryByRole("navigation", { name: "Feedback pagination" })).toBeNull();
});
test("opportunities expose record counts and references without an AI or priority-score claim", async () => {
  render(<FeedbackScreen model={await readFeedbackScreen({ theme: "report-export" })} />);
  const section = screen.getByRole("region", { name: "Product opportunities" });
  expect(within(section).getByText(/Not AI-generated, not a priority score/)).toBeInTheDocument();
  const references = within(section).getByRole("list", { name: "Evidence for Report exports" });
  expect(within(references).getAllByRole("link")).toHaveLength(3);
  expect(within(references).getByRole("link", { name: "demo-feedback-17" })).toHaveAttribute("href", expect.stringContaining("q=demo-feedback-17"));
});
test("feedback text is escaped even when it contains HTML-like content", async () => {
  const model = await readFeedbackScreen({ q: "demo-feedback-01" });
  const detail = model.details[0];
  const text = "<img src=x onerror=alert(1)>";
  const { container } = render(<FeedbackScreen model={{ ...model, details: [{ ...detail, record: { ...detail.record, text } }] }} />);
  expect(screen.getByText(text, { exact: true })).toBeInTheDocument();
  expect(container.querySelector("img")).toBeNull();
});
test("server-rendered Feedback hydrates without recoverable errors", async () => {
  const model = await readFeedbackScreen({});
  const container = document.createElement("div");
  container.innerHTML = renderToString(<FeedbackScreen model={model} />);
  document.body.append(container);
  const recoverable = vi.fn();
  let root: ReturnType<typeof hydrateRoot> | undefined;
  try {
    await act(async () => { root = hydrateRoot(container, <FeedbackScreen model={model} />, { onRecoverableError: recoverable }); });
    expect(recoverable).not.toHaveBeenCalled();
  } finally {
    await act(async () => root?.unmount());
    container.remove();
  }
});

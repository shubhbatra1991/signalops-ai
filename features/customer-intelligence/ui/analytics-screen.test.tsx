// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import { act, cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import { afterEach, expect, test, vi } from "vitest";
vi.mock("server-only", () => ({}));
import { AnalyticsScreen } from "./analytics-screen";
import { readDemoScreen } from "@/server/modules/demo/read-demo-screen";
import { renderToString } from "react-dom/server";
import { hydrateRoot } from "react-dom/client";
afterEach(cleanup);

test("Overview chart and filters hydrate without HTML mismatches", async () => {
  const model = await readDemoScreen({});
  const container = document.createElement("div");
  container.innerHTML = renderToString(<AnalyticsScreen page="overview" model={model} />);
  document.body.append(container);
  const recoverable = vi.fn();
  let root: ReturnType<typeof hydrateRoot> | undefined;
  try {
    await act(async () => { root = hydrateRoot(container, <AnalyticsScreen page="overview" model={model} />, { onRecoverableError: recoverable }); });
    expect(recoverable).not.toHaveBeenCalled();
  } finally {
    await act(async () => root?.unmount());
    container.remove();
  }
});

test.each(["overview", "events", "funnels"] as const)("%s has named filters and truthful demonstration label", async (page) => {
  render(<AnalyticsScreen page={page} model={await readDemoScreen({})} />);
  for (const name of ["Project", "Date range", "Customer", "Funnel"]) expect(screen.getByRole("combobox", { name })).toBeInTheDocument();
  expect(screen.getByRole("button", { name: "Apply filters" })).toBeInTheDocument();
  expect(screen.getByRole("link", { name: "Reset filters" })).toHaveAttribute("href", page === "overview" ? "/app" : `/app/${page}`);
  expect(screen.getByText(/fictional, not live customer activity/)).toBeInTheDocument();
});
test("overview chart has an exact accessible table and context-preserving funnel link", async () => {
  render(<AnalyticsScreen page="overview" model={await readDemoScreen({ customer: "demo-customer-05", range: "first-week" })} />);
  expect(screen.getByRole("img", { name: /Daily demonstration event activity/ })).toBeInTheDocument();
  const summary = screen.getByText("View daily counts as a table");
  fireEvent.click(summary);
  expect(screen.getByRole("table", { name: "Demo event occurrences by UTC date" })).toBeVisible();
  expect(screen.getByRole("link", { name: "Explore funnel →" }).getAttribute("href")).toContain("customer=demo-customer-05");
});
test("events expose sort, pagination and keyboard-native safe detail panels", async () => {
  const model = await readDemoScreen({});
  render(<AnalyticsScreen page="events" model={model} />);
  expect(screen.getByRole("searchbox", { name: "Search events" })).toBeInTheDocument();
  expect(screen.getByRole("combobox", { name: "Event type" })).toBeInTheDocument();
  expect(screen.getByRole("link", { name: "Sort timestamp oldest first" })).toHaveAttribute("href", expect.stringContaining("sort=asc"));
  expect(within(screen.getByRole("navigation", { name: "Event pagination" })).getByRole("link", { name: "Next page →" })).toHaveAttribute("href", expect.stringContaining("page=2"));
  const event = model.explorer.events[0];
  fireEvent.click(screen.getByLabelText(`View event ${event.id}`));
  const detail = screen.getByRole("region", { name: `Details for ${event.id}` });
  expect(detail).toBeVisible();
  expect(within(detail).getByLabelText("Event properties").textContent).toBe(JSON.stringify(event.properties, null, 2));
});
test("no-result UI provides an explicit reset action", async () => {
  render(<AnalyticsScreen page="events" model={await readDemoScreen({ q: "no-such-event" })} />);
  expect(screen.getByRole("heading", { name: "No matching events" })).toBeInTheDocument();
  expect(screen.getByRole("link", { name: "Reset all event filters" })).toHaveAttribute("href", "/app/events");
});
test("untrusted event properties render as text, never executable markup", async () => {
  const model = await readDemoScreen({});
  const event = { ...model.explorer.events[0], properties: { content: "<img src=x onerror=alert(1)>" } };
  render(<AnalyticsScreen page="events" model={{ ...model, explorer: { ...model.explorer, events: [event] } }} />);
  fireEvent.click(screen.getByLabelText(`View event ${event.id}`));
  const detail = screen.getByRole("region", { name: `Details for ${event.id}` });
  expect(within(detail).getByLabelText("Event properties")).toHaveTextContent(event.properties.content);
  expect(detail.querySelector("img")).toBeNull();
});
test("funnel progress exposes actual unique counts and incomplete-data caveat", async () => {
  render(<AnalyticsScreen page="funnels" model={await readDemoScreen({})} />);
  expect(screen.getAllByRole("progressbar")).toHaveLength(4);
  expect(screen.getByText(/not proven abandonment/)).toBeInTheDocument();
  expect(screen.getByText("50.0%", { selector: ".conversion-total" })).toBeInTheDocument();
});

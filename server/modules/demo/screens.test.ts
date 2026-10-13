import { expect, test, vi } from "vitest";
vi.mock("server-only", () => ({}));
import { readDemoScreen } from "./read-demo-screen";
import { createDemoDataset } from "./dataset";
import { dailyActivity, exploreEvents, parseFilters, analyticsHref, selectedRange } from "@/features/customer-intelligence/domain/explorer";
import { calculateFunnel } from "@/domain/analytics/funnel";

test("Overview and Funnels share identical metrics and linkable context", async () => {
  const overview = await readDemoScreen({ range: "first-week", customer: "demo-customer-05" });
  const url = new URL(analyticsHref("/funnels", overview.filters), "https://demo.invalid");
  const funnels = await readDemoScreen(Object.fromEntries(url.searchParams));
  expect(funnels.funnel).toEqual(overview.funnel);
  expect(funnels.eventSummary).toEqual(overview.eventSummary);
  expect(overview.funnel?.completed).toBe(1);
  expect(overview.dropOffRate).toBe(0);
});
test("default population is calculated from actual fixture", async () => {
  const model = await readDemoScreen({});
  expect(model.eventSummary).toMatchObject({ totalEvents: 204, uniqueCustomers: 32 });
  expect(model.funnel?.steps.map((step) => step.customers)).toEqual([32, 28, 20, 16]);
  expect(model.dropOffCount).toBe(16);
  expect(model.funnel?.conversionRate).toBe(50);
  expect(model.activity.reduce((total, day) => total + day.events, 0)).toBe(204);
});
test("disjoint UTC presets partition all occurrences", async () => {
  const first = await readDemoScreen({ range: "first-week" });
  const second = await readDemoScreen({ range: "second-week" });
  expect(first.eventSummary.totalEvents + second.eventSummary.totalEvents).toBe(204);
  expect(first.activity.at(-1)?.date).toBe("2026-06-07");
  expect(second.activity[0].date).toBe("2026-06-08");
});
test("customer outside selected range produces empty and zero-denominator states", async () => {
  const model = await readDemoScreen({ customer: "demo-customer-01", range: "second-week" });
  expect(model.eventSummary.totalEvents).toBe(0);
  expect(model.explorer.total).toBe(0);
  expect(model.funnel).toMatchObject({ entrants: 0, completed: 0, conversionRate: 0 });
  expect(model.dropOffRate).toBe(0);
});
test("event type and search intersect without changing funnel population", async () => {
  const model = await readDemoScreen({ type: "integration_failed", q: "permission_unclear" });
  expect(model.explorer.total).toBeGreaterThan(0);
  expect(model.explorer.events.every((event) => event.name === "integration_failed" && event.properties.reason === "permission_unclear")).toBe(true);
  expect(model.funnel?.entrants).toBe(32);
  const empty = await readDemoScreen({ q: "no-such-event" });
  expect(empty.explorer).toMatchObject({ total: 0, page: 1, pages: 1, events: [] });
});
test("pagination is bounded and stable; timestamp sort has ID tie-breaking", async () => {
  const first = await readDemoScreen({ sort: "asc" });
  const second = await readDemoScreen({ sort: "asc", page: "2" });
  expect(first.explorer.events).toHaveLength(20);
  expect(new Set([...first.explorer.events, ...second.explorer.events].map((event) => event.id)).size).toBe(40);
  expect(first.explorer.events.at(-1)?.occurredAt.localeCompare(second.explorer.events[0].occurredAt)).toBeLessThanOrEqual(0);
  const last = await readDemoScreen({ page: "999999" });
  expect(last.explorer.page).toBe(last.explorer.pages);
  const original = createDemoDataset().events[0];
  const tied = [{ ...original, id: "z" }, { ...original, id: "a" }];
  for (const sort of ["asc", "desc"] as const) expect(exploreEvents(tied, { ...first.filters, sort }).events.map((event) => event.id)).toEqual(["a", "z"]);
});
test.each(["-1", "1.5", "Infinity", "x", ["1", "2"], 4])("invalid page %s falls back safely", async (page) => {
  const model = await readDemoScreen({ page });
  expect(model.filters.page).toBe(1);
  expect(model.corrected).toBe(true);
});
test("malformed filters are bounded and validated against repository options", () => {
  const parsed = parseFilters({ project: "foreign", range: ["all"], customer: "unknown", funnel: "bad", type: "<script>", sort: "bad", q: "a".repeat(100) }, { projects: ["p"], customers: ["c"], funnels: ["f"], eventTypes: ["e"] });
  expect(parsed.corrected).toBe(true);
  expect(parsed.filters).toMatchObject({ project: "p", range: "all", customer: "", funnel: "f", type: "", sort: "desc" });
  expect(parsed.filters.q).toHaveLength(80);
});
test("daily bins include start, exclude end and retain empty days", () => {
  const event = createDemoDataset().events[0];
  const range = selectedRange("first-week");
  const result = dailyActivity([{ ...event, occurredAt: range.start }, { ...event, occurredAt: range.end }], range);
  expect(result).toHaveLength(7);
  expect(result[0].events).toBe(1);
  expect(result.slice(1).every((day) => day.events === 0)).toBe(true);
});
test("repeat and premature steps do not inflate sequential counts; partial cohort remains monotonic", () => {
  const dataset = createDemoDataset();
  const funnel = dataset.funnels[0];
  const base = dataset.events[0];
  const names = [funnel.steps[2].eventName, funnel.steps[0].eventName, funnel.steps[0].eventName, funnel.steps[1].eventName];
  const events = names.map((name, index) => ({ ...base, id: String(index), name, occurredAt: `2026-06-01T10:0${index}:00.000Z` }));
  const result = calculateFunnel(events, funnel, dataset.metadata.range);
  expect(result.steps.map((step) => step.customers)).toEqual([1, 1, 0, 0]);
  expect(result.steps.every((step, index, steps) => index === 0 || step.customers <= steps[index - 1].customers)).toBe(true);
  expect(calculateFunnel([...events].reverse(), funnel, dataset.metadata.range)).toEqual(result);
});
test("theme and accent query settings cannot affect analytics", async () => {
  expect(await readDemoScreen({ theme: "dark", accent: "rose" })).toEqual(await readDemoScreen({ theme: "light", accent: "blue" }));
});

import { describe, expect, test } from "vitest";
import type { Funnel, ProductEvent } from "@/features/customer-intelligence/domain/types";
import { aggregateEvents, countEvents, countUniqueCustomers, filterEvents, timestampMs } from "./events";
import { calculateFunnel, percentage } from "./funnel";

const scope = { workspaceId: "test-workspace", projectId: "test-project" };
const range = { start: "2026-06-01T00:00:00.000Z", end: "2026-06-10T00:00:00.000Z" };
const funnel: Funnel = {
  ...scope,
  dataOrigin: "demonstration",
  id: "test-funnel",
  name: "Demonstration test funnel",
  conversionWindowMs: 60_000,
  steps: ["a", "b", "c"].map((name, index) => ({
    id: `step-${name}`, name, eventName: name, position: index + 1,
  })),
};

function event(customerId: string, name: string, offsetMs: number): ProductEvent {
  const time = new Date(Date.parse(range.start) + offsetMs).toISOString();
  return {
    ...scope,
    dataOrigin: "demonstration",
    id: `${customerId}-${name}-${offsetMs}`,
    customerId,
    name,
    occurredAt: time,
    receivedAt: time,
    properties: {},
  };
}

describe("event analytics", () => {
  const events = [event("one", "a", 0), event("one", "a", 1000), event("two", "b", 2000)];

  test("counts occurrences separately from distinct tracked customers", () => {
    expect(countEvents(events, { ...scope, range })).toBe(3);
    expect(countUniqueCustomers(events, { ...scope, range })).toBe(2);
    expect(countUniqueCustomers(events, { ...scope, range, eventName: "a" })).toBe(1);
    expect(aggregateEvents(events, { ...scope, range })).toEqual({
      totalEvents: 3,
      uniqueCustomers: 2,
      countsByEvent: [{ eventName: "a", count: 2 }, { eventName: "b", count: 1 }],
    });
  });

  test("includes start, excludes end and filters by occurrence rather than receipt", () => {
    const start = event("one", "a", 0);
    const end = { ...event("two", "a", 0), id: "end", occurredAt: range.end };
    const before = event("three", "a", -1);
    expect(filterEvents([{ ...start, receivedAt: range.end }, end, before], { ...scope, range }))
      .toEqual([{ ...start, receivedAt: range.end }]);
  });

  test("scopes both workspace and project; missing event names return zero", () => {
    const mixed = [...events,
      { ...event("three", "a", 0), workspaceId: "other-workspace" },
      { ...event("four", "a", 0), projectId: "other-project" },
    ];
    expect(countEvents(mixed, { ...scope, range })).toBe(3);
    expect(countEvents(events, { ...scope, range, eventName: "missing" })).toBe(0);
    expect(countUniqueCustomers([], { ...scope, range })).toBe(0);
  });

  test("aggregation is stable across input order and does not mutate inputs", () => {
    const original = structuredClone(events);
    expect(aggregateEvents([...events].reverse(), { ...scope, range }))
      .toEqual(aggregateEvents(events, { ...scope, range }));
    expect(events).toEqual(original);
  });

  test.each(["not-a-date", "2026-02-30T00:00:00.000Z", "2026-06-01", "2026-06-01T01:00:00.000+01:00"])(
    "rejects invalid or noncanonical timestamps: %s", (timestamp) => {
      expect(() => timestampMs(timestamp)).toThrow(RangeError);
    },
  );

  test.each([
    { start: range.end, end: range.start },
    { start: range.start, end: range.start },
    { start: "invalid", end: range.end },
  ])("rejects invalid date ranges even with no data", (invalidRange) => {
    expect(() => filterEvents([], { ...scope, range: invalidRange })).toThrow(RangeError);
  });
});

describe("ordered first-entry funnel", () => {
  const events = [
    event("one", "a", 0), event("one", "b", 1000), event("one", "c", 2000),
    event("two", "a", 0), event("two", "b", 1000),
    event("three", "a", 0), event("three", "c", 1000),
    event("four", "a", 0), event("four", "a", 1000),
  ];

  test("derives entry, per-step and drop-off denominators from actual histories", () => {
    const result = calculateFunnel(events, funnel, range);
    expect(result.entrants).toBe(4);
    expect(result.completed).toBe(1);
    expect(result.conversionRate).toBe(25);
    expect(result.steps.map((step) => step.customers)).toEqual([4, 2, 1]);
    expect(result.steps.map((step) => step.conversionRate)).toEqual([100, 50, 25]);
    expect(result.steps.map((step) => step.stepConversionRate)).toEqual([100, 50, 50]);
    expect(result.steps.map((step) => step.dropOffCount)).toEqual([0, 2, 1]);
    expect(result.steps.map((step) => step.dropOffRate)).toEqual([0, 50, 50]);
  });

  test("sorts events by occurrence and steps by position without mutating either", () => {
    const unordered = { ...funnel, steps: [...funnel.steps].reverse() };
    const before = structuredClone(unordered);
    expect(calculateFunnel([...events].reverse(), unordered, range))
      .toEqual(calculateFunnel(events, funnel, range));
    expect(unordered).toEqual(before);
  });

  test("later steps cannot skip a missing earlier step", () => {
    const result = calculateFunnel([event("one", "a", 0), event("one", "c", 1000)], funnel, range);
    expect(result.steps.map((step) => step.customers)).toEqual([1, 0, 0]);
    expect(result.steps[2].dropOffRate).toBe(0);
  });

  test("out-of-order and equal-time events cannot advance a step", () => {
    const invalidOrder = [event("one", "b", 0), event("one", "a", 1000), event("one", "c", 2000)];
    const equalTime = [event("one", "a", 0), event("one", "b", 0), event("one", "c", 1000)];
    for (const history of [invalidOrder, equalTime]) {
      expect(calculateFunnel(history, funnel, range).steps.map((step) => step.customers)).toEqual([1, 0, 0]);
    }
  });

  test("repeated steps and duplicate delivery do not inflate unique progression", () => {
    const completed = events.filter((item) => item.customerId === "one");
    const repeated = [...completed, completed[0], completed[1], event("one", "c", 3000)];
    expect(calculateFunnel(repeated, funnel, range).steps.map((step) => step.customers)).toEqual([1, 1, 1]);
  });

  test.each([60_000, 60_001])("conversion window boundary at %i ms", (lastTime) => {
    const history = [event("one", "a", 0), event("one", "b", 1000), event("one", "c", lastTime)];
    expect(calculateFunnel(history, funnel, range).completed).toBe(lastTime === 60_000 ? 1 : 0);
  });

  test("expired first entry is not restarted by a later signup", () => {
    const history = [event("one", "a", 0), event("one", "a", 70_000), event("one", "b", 71_000), event("one", "c", 72_000)];
    expect(calculateFunnel(history, funnel, range).steps.map((step) => step.customers)).toEqual([1, 0, 0]);
  });

  test("all steps must be inside the range; entry before start does not enter cohort", () => {
    const end = Date.parse(range.end) - Date.parse(range.start);
    expect(calculateFunnel([event("one", "a", -1), event("one", "b", 1)], funnel, range).entrants).toBe(0);
    const history = [event("one", "a", end - 2000), event("one", "b", end - 1000), event("one", "c", end)];
    expect(calculateFunnel(history, funnel, range).steps.map((step) => step.customers)).toEqual([1, 1, 0]);
  });

  test("empty population and later-step-only population produce finite zeros", () => {
    for (const history of [[], [event("one", "c", 0)]]) {
      const result = calculateFunnel(history, funnel, range);
      expect(result.entrants).toBe(0);
      expect(result.conversionRate).toBe(0);
      expect(result.steps.every((step) => step.conversionRate === 0 && step.dropOffRate === 0)).toBe(true);
    }
    expect(percentage(0, 0)).toBe(0);
  });

  test("events from other scopes cannot contribute to the funnel", () => {
    const other = events.map((item) => ({ ...item, projectId: "other-project" }));
    expect(calculateFunnel(other, funnel, range).entrants).toBe(0);
  });

  test("a repeated event-name step requires another strictly later occurrence", () => {
    const repeated = { ...funnel, steps: funnel.steps.slice(0, 2).map((step) => ({ ...step, eventName: "a" })) };
    expect(calculateFunnel([event("one", "a", 0)], repeated, range).completed).toBe(0);
    expect(calculateFunnel([event("one", "a", 0), event("one", "a", 1000)], repeated, range).completed).toBe(1);
  });

  test.each([{ steps: [] }, { steps: [{ id: "one", position: 2, name: "A", eventName: "a" }] }, { steps: [
    { id: "one", position: 1, name: "A", eventName: "a" },
    { id: "two", position: 1, name: "B", eventName: "b" },
  ] }])("rejects empty, missing or duplicate positions", ({ steps }) => {
    expect(() => calculateFunnel([], { ...funnel, steps }, range)).toThrow(RangeError);
  });

  test.each([0, -1, Infinity, 1.5])("rejects invalid conversion window %i", (conversionWindowMs) => {
    expect(() => calculateFunnel([], { ...funnel, conversionWindowMs }, range)).toThrow(RangeError);
  });
});

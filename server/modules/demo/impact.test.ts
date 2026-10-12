import { expect, test, vi } from "vitest";
vi.mock("server-only", () => ({}));
import { countEvents, countUniqueCustomers } from "@/domain/analytics/events";
import { readImpact } from "./read-impact";
import { demoRepository } from "./repository";

test("impact catalogue uses existing selectors and equal half-open seven-day windows", async () => {
  const context = await readImpact("2026-10-12T00:00:00.000Z");
  expect(context.options.length).toBeGreaterThan(0);
  for (const option of context.options) {
    const { baseline, comparison } = option.result;
    expect(Date.parse(baseline.period.end) - Date.parse(baseline.period.start)).toBe(7 * 86_400_000);
    expect(Date.parse(comparison.period.end) - Date.parse(comparison.period.start)).toBe(7 * 86_400_000);
    expect(baseline.period.end).toBe(comparison.period.start);
    const events = await demoRepository.listEvents(baseline.metric, context.coverage);
    const selector = baseline.metric.kind === "event_count" ? countEvents : countUniqueCustomers;
    expect(baseline.value).toBe(selector(events, { ...baseline.metric, range: baseline.period }));
    expect(comparison.value).toBe(selector(events, { ...comparison.metric, range: comparison.period }));
  }
});

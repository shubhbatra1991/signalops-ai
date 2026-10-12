import type { DateRange, Funnel, ProductEvent } from "@/features/customer-intelligence/domain/types";
import { filterEvents, timestampMs } from "./events";

export function percentage(numerator: number, denominator: number): number {
  return denominator === 0 ? 0 : numerator / denominator * 100;
}

/**
 * v1: unique customers, first entry in [start,end), strict event-time order.
 * Every step must be in the range and within the inclusive window from entry.
 * First-entry cohorts do not restart after expiry; equal timestamps do not advance.
 */
export function calculateFunnel(events: readonly ProductEvent[], funnel: Funnel, range: DateRange) {
  const steps = [...funnel.steps].sort((left, right) => left.position - right.position);
  if (steps.length === 0 || steps.some((step, index) => step.position !== index + 1 || !step.eventName)) {
    throw new RangeError("Funnel needs nonempty steps with contiguous positions starting at one.");
  }
  if (!Number.isSafeInteger(funnel.conversionWindowMs) || funnel.conversionWindowMs <= 0) {
    throw new RangeError("Funnel conversion window must be a positive integer.");
  }
  const selected = [...filterEvents(events, { ...funnel, range })]
    .sort((left, right) => timestampMs(left.occurredAt) - timestampMs(right.occurredAt) || (left.id < right.id ? -1 : left.id > right.id ? 1 : 0));
  const customers = new Map<string, ProductEvent[]>();
  for (const event of selected) {
    const history = customers.get(event.customerId) ?? [];
    history.push(event);
    customers.set(event.customerId, history);
  }
  const counts = steps.map(() => 0);
  for (const history of customers.values()) {
    let entryTime: number | undefined;
    let previousTime = -Infinity;
    let stepIndex = 0;
    for (const event of history) {
      const step = steps[stepIndex];
      if (!step) break;
      const time = timestampMs(event.occurredAt);
      if (entryTime !== undefined && time - entryTime > funnel.conversionWindowMs) break;
      if (event.name !== step.eventName || time <= previousTime) continue;
      entryTime ??= time;
      previousTime = time;
      counts[stepIndex] += 1;
      stepIndex += 1;
    }
  }
  const entrants = counts[0];
  return {
    algorithmVersion: "ordered-first-entry-v1" as const,
    countingUnit: "unique-customers" as const,
    range: { ...range },
    conversionWindowMs: funnel.conversionWindowMs,
    entrants,
    completed: counts[counts.length - 1],
    conversionRate: percentage(counts[counts.length - 1], entrants),
    steps: steps.map((step, index) => {
      const previousCount = index === 0 ? entrants : counts[index - 1];
      const dropOffCount = previousCount - counts[index];
      return {
        stepId: step.id,
        name: step.name,
        eventName: step.eventName,
        position: step.position,
        customers: counts[index],
        conversionRate: percentage(counts[index], entrants),
        stepConversionRate: percentage(counts[index], previousCount),
        dropOffCount,
        dropOffRate: percentage(dropOffCount, previousCount),
      };
    }),
  };
}

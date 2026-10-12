import type {
  DateRange,
  ProductEvent,
  ProjectScope,
} from "@/features/customer-intelligence/domain/types";

export interface EventQuery extends ProjectScope {
  readonly range: DateRange;
  readonly eventName?: string;
}

export function timestampMs(value: string): number {
  const milliseconds = Date.parse(value);
  if (!Number.isFinite(milliseconds) || new Date(milliseconds).toISOString() !== value) {
    throw new RangeError("Expected a canonical UTC ISO timestamp.");
  }
  return milliseconds;
}

export function dateRangeBounds(range: DateRange): readonly [number, number] {
  const start = timestampMs(range.start);
  const end = timestampMs(range.end);
  if (start >= end) throw new RangeError("Date range must have start before end.");
  return [start, end];
}

export function filterEvents(
  events: readonly ProductEvent[],
  query: EventQuery,
): readonly ProductEvent[] {
  const [start, end] = dateRangeBounds(query.range);
  return events.filter((event) => {
    if (event.workspaceId !== query.workspaceId || event.projectId !== query.projectId) return false;
    if (query.eventName !== undefined && event.name !== query.eventName) return false;
    const occurredAt = timestampMs(event.occurredAt);
    return occurredAt >= start && occurredAt < end;
  });
}

export function countEvents(events: readonly ProductEvent[], query: EventQuery): number {
  return filterEvents(events, query).length;
}

/** Distinct tracked customers with matching events, not registered operators. */
export function countUniqueCustomers(events: readonly ProductEvent[], query: EventQuery): number {
  return new Set(filterEvents(events, query).map((event) => event.customerId)).size;
}

export function aggregateEvents(events: readonly ProductEvent[], query: EventQuery) {
  const selected = filterEvents(events, query);
  const counts = new Map<string, number>();
  for (const event of selected) counts.set(event.name, (counts.get(event.name) ?? 0) + 1);
  return {
    totalEvents: selected.length,
    uniqueCustomers: new Set(selected.map((event) => event.customerId)).size,
    countsByEvent: [...counts].sort(([left], [right]) => left < right ? -1 : left > right ? 1 : 0)
      .map(([eventName, count]) => ({ eventName, count })),
  };
}

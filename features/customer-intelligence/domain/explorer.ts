import type { DateRange, ProductEvent } from "./types";
import { dateRangeBounds } from "@/domain/analytics/events";

export type SearchInput = Readonly<Record<string, unknown>>;
export type AnalyticsPage = "overview" | "events" | "funnels";
export const presets = [
  { id: "all", label: "Full demo · Jun 1–15", start: "2026-06-01T00:00:00.000Z", end: "2026-06-16T00:00:00.000Z" },
  { id: "first-week", label: "Jun 1–7", start: "2026-06-01T00:00:00.000Z", end: "2026-06-08T00:00:00.000Z" },
  { id: "second-week", label: "Jun 8–15", start: "2026-06-08T00:00:00.000Z", end: "2026-06-16T00:00:00.000Z" },
] as const;
export interface ExplorerFilters {
  project: string; range: string; customer: string; funnel: string;
  type: string; q: string; sort: "asc" | "desc"; page: number;
}
export function createQueryReader(input: SearchInput) {
  let corrected = false;
  function text(key: string) {
    const value = input[key];
    if (value === undefined) return "";
    if (typeof value === "string") return value;
    corrected = true;
    return "";
  }
  function choice(key: string, allowed: readonly string[], fallback: string) {
    const value = text(key);
    if (!value) return fallback;
    if (allowed.includes(value)) return value;
    corrected = true;
    return fallback;
  }
  return { text, choice, get corrected() { return corrected; } };
}
export function parseFilters(input: SearchInput, options: {
  projects: readonly string[]; customers: readonly string[]; funnels: readonly string[]; eventTypes: readonly string[];
}) {
  const reader = createQueryReader(input);
  const { text, choice } = reader;
  let corrected = false;
  const pageValue = text("page");
  const page = pageValue ? Number(pageValue) : 1;
  const validPage = /^\d+$/.test(pageValue || "1") && Number.isSafeInteger(page) && page > 0;
  if (!validPage) corrected = true;
  const query = text("q").trim();
  if (query.length > 80) corrected = true;
  const filters: ExplorerFilters = {
    project: choice("project", options.projects, options.projects[0] ?? ""),
    range: choice("range", presets.map((preset) => preset.id), "all"),
    customer: choice("customer", options.customers, ""),
    funnel: choice("funnel", options.funnels, options.funnels[0] ?? ""),
    type: choice("type", options.eventTypes, ""), q: query.slice(0, 80),
    sort: choice("sort", ["asc", "desc"], "desc") === "asc" ? "asc" : "desc",
    page: validPage ? page : 1,
  };
  return { filters, corrected: corrected || reader.corrected };
}
export function selectedRange(id: string): DateRange {
  const preset = presets.find((item) => item.id === id) ?? presets[0];
  return { start: preset.start, end: preset.end };
}
export function analyticsHref(path: string, filters: ExplorerFilters, changes: Partial<ExplorerFilters> = {}) {
  const next = { ...filters, ...changes };
  const params = new URLSearchParams();
  for (const key of ["project", "range", "customer", "funnel"] as const) {
    if (next[key]) params.set(key, next[key]);
  }
  if (path === "/events") {
    if (next.type) params.set("type", next.type);
    if (next.q) params.set("q", next.q);
    params.set("sort", next.sort);
    params.set("page", String(next.page));
  }
  return `/demo${path === "/" ? "" : path}?${params}`;
}
const compareId = (left: string, right: string) => left < right ? -1 : left > right ? 1 : 0;
/** Input already has the shared project, UTC date and customer filters applied. */
export function exploreEvents(events: readonly ProductEvent[], filters: ExplorerFilters) {
  const query = filters.q.toLowerCase();
  const matching = events.filter((event) => (!filters.type || event.name === filters.type) &&
    (!query || [event.name, event.customerId, event.id, JSON.stringify(event.properties)].join(" ").toLowerCase().includes(query)));
  matching.sort((left, right) => {
    const time = compareId(left.occurredAt, right.occurredAt);
    return (filters.sort === "asc" ? time : -time) || compareId(left.id, right.id);
  });
  const pageSize = 20;
  const pages = Math.max(1, Math.ceil(matching.length / pageSize));
  const page = Math.min(filters.page, pages);
  return { events: matching.slice((page - 1) * pageSize, page * pageSize), total: matching.length, page, pages, pageSize };
}
export function dailyActivity(events: readonly ProductEvent[], range: DateRange) {
  const [start, end] = dateRangeBounds(range);
  const days = new Map<string, number>();
  for (let time = start; time < end; time += 86_400_000) days.set(new Date(time).toISOString().slice(0, 10), 0);
  for (const event of events) {
    const day = event.occurredAt.slice(0, 10);
    if (event.occurredAt >= range.start && event.occurredAt < range.end && days.has(day)) days.set(day, (days.get(day) ?? 0) + 1);
  }
  return [...days].map(([date, events]) => ({ date, events }));
}

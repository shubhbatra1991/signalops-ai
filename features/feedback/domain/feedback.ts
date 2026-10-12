import type { CustomerFeedback, DateRange, Funnel, ProductEvent, ProjectScope } from "@/features/customer-intelligence/domain/types";
import { analyticsHref, createQueryReader, type ExplorerFilters, type SearchInput } from "@/features/customer-intelligence/domain/explorer";
import { dateRangeBounds, filterEvents, timestampMs } from "@/domain/analytics/events";
import { calculateFunnel } from "@/domain/analytics/funnel";
import { feedbackCategories, feedbackSentiments, feedbackSources, feedbackThemes } from "./catalog";

export interface FeedbackFilters extends ExplorerFilters {
  category: string;
  source: string;
  sentiment: string;
  theme: string;
}
export function parseFeedbackFilters(input: SearchInput, common: ExplorerFilters) {
  const reader = createQueryReader(input);
  const filters: FeedbackFilters = {
    ...common,
    category: reader.choice("category", feedbackCategories, ""),
    source: reader.choice("source", feedbackSources, ""),
    sentiment: reader.choice("sentiment", feedbackSentiments, ""),
    theme: reader.choice("theme", Object.keys(feedbackThemes), ""),
  };
  return { filters, corrected: reader.corrected };
}
export function feedbackHref(filters: FeedbackFilters, changes: Partial<FeedbackFilters> = {}) {
  const next = { ...filters, ...changes };
  const common = analyticsHref("/feedback", next);
  const query = new URLSearchParams(common.slice(common.indexOf("?") + 1));
  for (const key of ["category", "source", "sentiment", "theme", "q"] as const) {
    if (next[key]) query.set(key, next[key]);
  }
  query.set("sort", next.sort);
  query.set("page", String(next.page));
  return `/feedback?${query}`;
}
export interface FeedbackQuery extends ProjectScope {
  readonly range: DateRange;
  readonly customerId?: string;
}
export function filterFeedback(records: readonly CustomerFeedback[], query: FeedbackQuery) {
  const [start, end] = dateRangeBounds(query.range);
  return records.filter((record) => record.workspaceId === query.workspaceId && record.projectId === query.projectId &&
    (!query.customerId || record.customerId === query.customerId) &&
    timestampMs(record.submittedAt) >= start && timestampMs(record.submittedAt) < end);
}
export function selectFeedback(records: readonly CustomerFeedback[], query: FeedbackQuery, filters: FeedbackFilters) {
  const search = filters.q.toLowerCase();
  return filterFeedback(records, query).filter((record) =>
    (!filters.category || record.category === filters.category) &&
    (!filters.source || record.source === filters.source) &&
    (!filters.sentiment || (record.sentiment ?? "unlabelled") === filters.sentiment) &&
    (!filters.theme || record.themeIds.some((id) => id === filters.theme)) &&
    (!search || [record.id, record.customerId, record.text, record.category, record.source,
      ...record.themeIds.map((id) => feedbackThemes[id].label)].join(" ").toLowerCase().includes(search)));
}
const compare = (left: string, right: string) => left < right ? -1 : left > right ? 1 : 0;
export function sortFeedback(records: readonly CustomerFeedback[], sort: "asc" | "desc") {
  return [...records].sort((left, right) => {
    const time = compare(left.submittedAt, right.submittedAt);
    return (sort === "asc" ? time : -time) || compare(left.id, right.id);
  });
}
export function paginateFeedback(records: readonly CustomerFeedback[], requestedPage: number) {
  const pageSize = 10;
  const pages = Math.max(1, Math.ceil(records.length / pageSize));
  const page = Math.min(Number.isSafeInteger(requestedPage) && requestedPage > 0 ? requestedPage : 1, pages);
  return { records: records.slice((page - 1) * pageSize, page * pageSize), page, pages, pageSize, total: records.length };
}
export function summarizeFeedback(records: readonly CustomerFeedback[]) {
  const themes = Object.entries(feedbackThemes).map(([id, definition]) => {
    const supporting = records.filter((record) => record.themeIds.some((theme) => theme === id));
    return { id, ...definition, recordCount: supporting.length,
      contributors: new Set(supporting.map((record) => record.customerId)).size,
      feedbackIds: supporting.map((record) => record.id).sort(compare) };
  }).filter((theme) => theme.recordCount > 0)
    .sort((left, right) => right.recordCount - left.recordCount || compare(left.id, right.id));
  return {
    total: records.length,
    contributors: new Set(records.map((record) => record.customerId)).size,
    recurringThemes: themes.filter((theme) => theme.recordCount >= 2).length,
    themes,
    categories: feedbackCategories.map((category) => ({ category, count: records.filter((record) => record.category === category).length })),
    sentiments: feedbackSentiments.map((sentiment) => ({ sentiment, count: records.filter((record) => (record.sentiment ?? "unlabelled") === sentiment).length })),
    opportunities: themes.filter((theme) => theme.recordCount >= 2 && theme.contributors >= 2),
  };
}

/** Only events observed by the comment timestamp, in the same scope/date window. */
export function feedbackContext(record: CustomerFeedback, events: readonly ProductEvent[], range: DateRange, funnel?: Funnel) {
  const history = filterEvents(events, { ...record, range }).filter((event) =>
    event.customerId === record.customerId && timestampMs(event.occurredAt) <= timestampMs(record.submittedAt));
  const matchingFunnel = funnel?.projectId === record.projectId && funnel.workspaceId === record.workspaceId ? funnel : undefined;
  const progression = matchingFunnel ? calculateFunnel(history, matchingFunnel, range) : undefined;
  const reached = progression?.steps.filter((step) => step.customers > 0) ?? [];
  return {
    eventCount: history.length,
    linkedEvents: history.filter((event) => record.relatedEventIds.includes(event.id))
      .sort((left, right) => compare(left.occurredAt, right.occurredAt) || compare(left.id, right.id)),
    unavailableReferences: record.relatedEventIds.filter((id) => !history.some((event) => event.id === id)).length,
    funnel: progression ? { id: matchingFunnel?.id, name: matchingFunnel?.name, reachedSteps: reached.length,
      totalSteps: progression.steps.length, lastStep: reached.at(-1)?.name, completed: progression.completed > 0 } : undefined,
  };
}

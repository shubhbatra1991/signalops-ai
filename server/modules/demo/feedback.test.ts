import { afterEach, expect, test, vi } from "vitest";
vi.mock("server-only", () => ({}));
import { createDemoDataset } from "./dataset";
import { demoRepository } from "./repository";
import { readFeedbackScreen } from "./read-feedback-screen";
import { readDemoScreen } from "./read-demo-screen";
import { feedbackContext, feedbackHref, filterFeedback, paginateFeedback, sortFeedback, summarizeFeedback } from "@/features/feedback/domain/feedback";
import { feedbackThemes } from "@/features/feedback/domain/catalog";
import { buildFeedbackEvidence } from "@/features/feedback/domain/evidence";

const dataset = createDemoDataset();
const scope = { workspaceId: "demo-workspace", projectId: "demo-project-flowpilot" };
const range = dataset.metadata.range;
afterEach(() => vi.restoreAllMocks());

test("v2 extends existing fictional feedback without replacing customers, events or old references", () => {
  expect(dataset.metadata.datasetVersion).toBe("flowpilot-v2");
  expect(dataset.feedback).toHaveLength(24);
  expect(dataset.customers).toHaveLength(32);
  expect(dataset.events).toHaveLength(204);
  expect(createDemoDataset()).toEqual(dataset);
  for (const [index, record] of dataset.feedback.entries()) {
    expect(record.id).toBe(`demo-feedback-${String(index + 1).padStart(2, "0")}`);
    expect(dataset.customers.some((customer) => customer.id === record.customerId && customer.projectId === record.projectId && customer.workspaceId === record.workspaceId)).toBe(true);
    expect(record.provenance).toEqual({ kind: "authored-fictional-fixture", annotations: "fixture-authored-not-model-inferred" });
    expect(record.themeIds.length).toBeGreaterThan(0);
    expect(record.themeIds.every((id) => id in feedbackThemes)).toBe(true);
    for (const eventId of record.relatedEventIds) {
      expect(dataset.events.some((event) => event.id === eventId && event.customerId === record.customerId && event.projectId === record.projectId && event.workspaceId === record.workspaceId && event.occurredAt <= record.submittedAt)).toBe(true);
    }
  }
  expect(dataset.feedback[0].relatedEventIds).toEqual(["demo-customer-02:integration-failed-2"]);
  expect(dataset.feedback[7].relatedEventIds).toEqual(["demo-customer-13:report-1"]);
});
test("summary counts actual records, distinct contributors and authored categories", async () => {
  const model = await readFeedbackScreen({});
  expect(model.summary).toMatchObject({ total: 24, contributors: 22, recurringThemes: 6 });
  expect(model.summary.categories).toEqual([
    { category: "friction", count: 8 }, { category: "praise", count: 5 },
    { category: "question", count: 6 }, { category: "feature-request", count: 5 },
  ]);
  expect(model.summary.sentiments).toEqual([
    { sentiment: "positive", count: 6 }, { sentiment: "neutral", count: 7 },
    { sentiment: "negative", count: 8 }, { sentiment: "unlabelled", count: 3 },
  ]);
  expect(model.summary.opportunities).toHaveLength(6);
});
test.each([
  { category: "feature-request" }, { source: "demo-support" }, { sentiment: "negative" },
  { sentiment: "unlabelled" }, { theme: "report-export" }, { customer: "demo-customer-02" },
])("filters %j produce matching feedback and full-selection counts", async (input) => {
  const model = await readFeedbackScreen(input);
  expect(model.explorer.total).toBeGreaterThan(0);
  expect(model.summary.total).toBe(model.explorer.total);
  for (const record of model.explorer.records) {
    if ("category" in input) expect(record.category).toBe(input.category);
    if ("source" in input) expect(record.source).toBe(input.source);
    if ("sentiment" in input) expect(record.sentiment ?? "unlabelled").toBe(input.sentiment);
    if ("theme" in input) expect(record.themeIds).toContain(input.theme);
    if ("customer" in input) expect(record.customerId).toBe(input.customer);
  }
});
test("search is case-insensitive across text, identifiers and theme labels; combined filters intersect", async () => {
  const model = await readFeedbackScreen({ q: "TIMEOUT", category: "feature-request", theme: "integration-recovery" });
  expect(model.summary.total).toBe(2);
  expect((await readFeedbackScreen({ q: "REPORT EXPORTS" })).summary.total).toBe(3);
  expect((await readFeedbackScreen({ q: "demo-feedback-01" })).explorer.records.map((item) => item.id)).toEqual(["demo-feedback-01"]);
});
test("no results produce zeros, no opportunities and bounded empty pagination", async () => {
  const model = await readFeedbackScreen({ q: "no-matching-record", page: "500" });
  expect(model.summary).toMatchObject({ total: 0, contributors: 0, recurringThemes: 0, themes: [], opportunities: [] });
  expect(model.explorer).toMatchObject({ total: 0, page: 1, pages: 1, records: [] });
  expect(model.evidence.eventSummary.totalEvents).toBe(0);
  expect(model.evidence.funnel?.conversionRate).toBe(0);
});
test("feedback submission presets partition records and preserve deterministic analytics", async () => {
  const first = await readFeedbackScreen({ range: "first-week" });
  const second = await readFeedbackScreen({ range: "second-week" });
  expect(first.summary.total + second.summary.total).toBe(24);
  expect(first.explorer.records.every((record) => record.submittedAt < "2026-06-08T00:00:00.000Z")).toBe(true);
  expect(second.explorer.records.every((record) => record.submittedAt >= "2026-06-08T00:00:00.000Z")).toBe(true);
  expect((await readDemoScreen({})).eventSummary.totalEvents).toBe(204);
  expect((await readDemoScreen({})).funnel?.conversionRate).toBe(50);
});
test("submission ranges include start and exclude end independently of event time", async () => {
  const record = dataset.feedback[0];
  const start = "2026-06-01T00:00:00.000Z";
  const end = "2026-06-02T00:00:00.000Z";
  const records = [{ ...record, id: "start", submittedAt: start }, { ...record, id: "end", submittedAt: end }];
  expect(filterFeedback(records, { ...scope, range: { start, end } }).map((item) => item.id)).toEqual(["start"]);
  expect(await demoRepository.listFeedback(scope, { start: record.submittedAt, end: new Date(Date.parse(record.submittedAt) + 1).toISOString() })).toEqual([record]);
  expect(() => filterFeedback(records, { ...scope, range: { start: "invalid", end } })).toThrow(RangeError);
});
test("pagination is stable, disjoint, clamped and independent of summaries", async () => {
  const first = await readFeedbackScreen({ sort: "asc" });
  const second = await readFeedbackScreen({ sort: "asc", page: "2" });
  const last = await readFeedbackScreen({ sort: "asc", page: "999" });
  expect(first.explorer.records).toHaveLength(10);
  expect(second.explorer.records).toHaveLength(10);
  expect(last.explorer).toMatchObject({ page: 3, pages: 3 });
  expect(last.explorer.records).toHaveLength(4);
  expect(new Set([...first.explorer.records, ...second.explorer.records, ...last.explorer.records].map((item) => item.id)).size).toBe(24);
  expect(second.summary).toEqual(first.summary);
  expect(first.explorer.records.at(-1)?.submittedAt.localeCompare(second.explorer.records[0].submittedAt)).toBeLessThanOrEqual(0);
  expect(await readFeedbackScreen({ sort: "asc" })).toEqual(first);
  expect(paginateFeedback([], NaN)).toMatchObject({ page: 1, pages: 1 });
});
test.each(["asc", "desc"] as const)("timestamp ties always use ID ascending with %s sort", (sort) => {
  const record = dataset.feedback[0];
  expect(sortFeedback([{ ...record, id: "z" }, { ...record, id: "a" }], sort).map((item) => item.id)).toEqual(["a", "z"]);
});
test("duplicate theme tags count once; multiple comments retain unique-contributor denominator", () => {
  const record = { ...dataset.feedback[0], themeIds: ["integration-permissions", "integration-permissions"] as const };
  const summary = summarizeFeedback([record, { ...record, id: "second" }]);
  expect(summary.themes[0]).toMatchObject({ recordCount: 2, contributors: 1 });
  expect(summary.recurringThemes).toBe(1);
  expect(summary.opportunities).toEqual([]);
});
test("opportunity references resolve within matching scope and explain deterministic frequency order", async () => {
  const model = await readFeedbackScreen({ source: "demo-survey" });
  const validIds = new Set(dataset.feedback.filter((record) => record.source === "demo-survey").map((record) => record.id));
  for (const opportunity of model.summary.opportunities) {
    expect(opportunity.recordCount).toBe(opportunity.feedbackIds.length);
    expect(opportunity.contributors).toBeGreaterThanOrEqual(2);
    expect(opportunity.feedbackIds.every((id) => validIds.has(id))).toBe(true);
  }
  expect(model.summary.opportunities.every((item, index, all) => index === 0 || item.recordCount <= all[index - 1].recordCount)).toBe(true);
});
test("feedback, contexts and evidence isolate projects/workspaces even with colliding customer IDs", () => {
  const record = dataset.feedback[0];
  const foreign = { ...record, id: "foreign", projectId: "other-project" };
  const otherWorkspace = { ...record, id: "other-workspace", workspaceId: "other-workspace" };
  expect(filterFeedback([record, foreign, otherWorkspace], { ...scope, range })).toEqual([record]);
  const foreignEvents = dataset.events.map((event) => ({ ...event, projectId: "other-project" }));
  expect(feedbackContext(record, foreignEvents, range, dataset.funnels[0]).eventCount).toBe(0);
  expect(feedbackContext(record, dataset.events, range, { ...dataset.funnels[0], workspaceId: "other" }).funnel).toBeUndefined();
  const evidence = buildFeedbackEvidence({ records: [record, foreign], events: foreignEvents, scope, range, datasetVersion: "test" });
  expect(evidence.feedbackReferences.map((item) => item.id)).toEqual([record.id]);
  expect(evidence.eventSummary.totalEvents).toBe(0);
});
test("repository excludes foreign scopes and returns independent nested feedback copies", async () => {
  expect(await demoRepository.listFeedback({ ...scope, projectId: "other" })).toEqual([]);
  expect(await demoRepository.listFeedback({ ...scope, workspaceId: "other" })).toEqual([]);
  const records = await demoRepository.listFeedback(scope);
  Reflect.set(records[0].themeIds, "0", "report-export");
  Reflect.set(records[0].provenance, "kind", "changed");
  expect((await demoRepository.listFeedback(scope))[0]).toEqual(dataset.feedback[0]);
});
test("comment-time context excludes future activity and uses the ordered funnel", () => {
  const record = dataset.feedback[3];
  const context = feedbackContext(record, dataset.events, range, dataset.funnels[0]);
  expect(context.eventCount).toBe(6);
  expect(context.funnel).toMatchObject({ reachedSteps: 4, totalSteps: 4, completed: true });
  expect(context.linkedEvents.map((event) => event.id)).toEqual(record.relatedEventIds);
  const partial = feedbackContext(dataset.feedback[0], dataset.events, range, dataset.funnels[0]);
  expect(partial.funnel).toMatchObject({ reachedSteps: 2, completed: false, lastStep: "Create workspace" });
});
test("missing histories and references remain explicit; boundary-time events are observed", async () => {
  const record = dataset.feedback[0];
  const missing = feedbackContext(record, [], range, dataset.funnels[0]);
  expect(missing).toMatchObject({ eventCount: 0, linkedEvents: [], unavailableReferences: 1 });
  const originalEvent = dataset.events.find((item) => item.id === record.relatedEventIds[0]);
  if (!originalEvent) throw new Error("Expected fixture event.");
  const event = { ...originalEvent, occurredAt: record.submittedAt };
  expect(feedbackContext(record, [event], range).eventCount).toBe(1);
  expect(feedbackContext(record, [{ ...event, occurredAt: new Date(Date.parse(record.submittedAt) + 1).toISOString() }], range).eventCount).toBe(0);
  vi.spyOn(demoRepository, "listEvents").mockResolvedValue([]);
  expect((await readFeedbackScreen({})).details.every((item) => item.context.eventCount === 0)).toBe(true);
});
test("URL links round-trip every feedback filter while page changes preserve selection", async () => {
  const initial = await readFeedbackScreen({ range: "first-week", customer: "demo-customer-03", category: "feature-request", source: "demo-survey", sentiment: "neutral", theme: "integration-recovery", q: "timeout", sort: "asc" });
  const url = new URL(feedbackHref(initial.filters, { page: 2 }), "https://demo.invalid");
  const restored = await readFeedbackScreen(Object.fromEntries(url.searchParams));
  expect(restored.summary).toEqual(initial.summary);
  expect(restored.filters).toEqual({ ...initial.filters, page: 2 });
  expect(restored.corrected).toBe(false);
});
test("malformed or unknown feedback filters safely normalize with a notice", async () => {
  const model = await readFeedbackScreen({ category: ["friction", "praise"], source: "foreign", sentiment: "inferred", theme: "unknown", customer: "foreign", range: "tomorrow", page: "-4", q: "x".repeat(100) });
  expect(model.corrected).toBe(true);
  expect(model.filters).toMatchObject({ category: "", source: "", sentiment: "", theme: "", customer: "", range: "all", page: 1 });
  expect(model.filters.q).toHaveLength(80);
});
test("evidence is stable, aggregate-only and restricted to matching contributors", async () => {
  const model = await readFeedbackScreen({ theme: "report-export" });
  expect((await readFeedbackScreen({ theme: "report-export" })).evidence).toEqual(model.evidence);
  expect(model.evidence.coverage).toEqual({ matchingRecords: 3, includedReferences: 3, truncated: false });
  expect(model.evidence.eventSummary.uniqueCustomers).toBe(3);
  const serialized = JSON.stringify(model.evidence);
  expect(serialized).not.toMatch(/"customerId":|demo-customer-|"properties":|"text":/);
  for (const reference of model.evidence.feedbackReferences) expect(dataset.feedback.some((record) => record.id === reference.id)).toBe(true);
});
test("bounded evidence declares truncation and keeps all included references resolvable", () => {
  const records = Array.from({ length: 60 }, (_, index) => ({ ...dataset.feedback[index % 2], id: `synthetic-${String(index).padStart(2, "0")}` }));
  const evidence = buildFeedbackEvidence({ records, events: dataset.events, scope, range, funnel: dataset.funnels[0], datasetVersion: "test" });
  expect(evidence.coverage).toEqual({ matchingRecords: 60, includedReferences: 50, truncated: true });
  const ids = new Set(evidence.feedbackReferences.map((record) => record.id));
  for (const theme of evidence.feedbackSummary.themes) expect(theme.feedbackIds.every((id) => ids.has(id))).toBe(true);
  expect(evidence.feedbackSummary.total).toBe(60);
});
test("appearance preferences cannot affect feedback calculations", async () => {
  expect(await readFeedbackScreen({ appearance: "light", accent: "teal" })).toEqual(await readFeedbackScreen({ appearance: "dark", accent: "rose" }));
});

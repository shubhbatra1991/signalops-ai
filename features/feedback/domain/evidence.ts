import type { CustomerFeedback, DateRange, Funnel, ProductEvent, ProjectScope } from "@/features/customer-intelligence/domain/types";
import { aggregateEvents } from "@/domain/analytics/events";
import { calculateFunnel } from "@/domain/analytics/funnel";
import { filterFeedback, sortFeedback, summarizeFeedback } from "./feedback";

export interface FeedbackEvidence {
  readonly schemaVersion: "feedback-evidence-v1";
  readonly dataOrigin: "demonstration";
  readonly datasetVersion: string;
  readonly scope: ProjectScope;
  readonly range: DateRange;
  readonly population: "matching-feedback-contributors-in-selected-event-window";
  readonly sourceMetadata: { readonly annotations: "fixture-authored-not-model-inferred"; readonly sources: readonly CustomerFeedback["source"][] };
  readonly coverage: { readonly matchingRecords: number; readonly includedReferences: number; readonly truncated: boolean };
  readonly feedbackReferences: readonly Pick<CustomerFeedback, "id" | "submittedAt" | "source" | "category" | "themeIds" | "sentiment" | "provenance">[];
  readonly feedbackSummary: ReturnType<typeof summarizeFeedback>;
  readonly eventSummary: ReturnType<typeof aggregateEvents>;
  readonly funnel?: ReturnType<typeof calculateFunnel>;
  readonly limitations: readonly string[];
}

/** Local-only bounded metadata contract. No text, customer IDs or raw event properties. */
export function buildFeedbackEvidence(input: {
  records: readonly CustomerFeedback[]; events: readonly ProductEvent[]; funnel?: Funnel;
  scope: ProjectScope; range: DateRange; datasetVersion: string;
}): FeedbackEvidence {
  const selected = sortFeedback(filterFeedback(input.records, { ...input.scope, range: input.range }), "desc");
  const included = selected.slice(0, 50);
  const contributors = new Set(selected.map((record) => record.customerId));
  const events = input.events.filter((event) => contributors.has(event.customerId));
  const funnel = input.funnel?.workspaceId === input.scope.workspaceId && input.funnel.projectId === input.scope.projectId ? input.funnel : undefined;
  const summary = summarizeFeedback(selected);
  // Summary counts refer to the complete selection; references remain bounded and resolvable within this payload.
  const includedIds = new Set(included.map((record) => record.id));
  const boundReferences = (themes: typeof summary.themes) => themes.map((theme) => ({ ...theme, feedbackIds: theme.feedbackIds.filter((id) => includedIds.has(id)) }));
  return {
    schemaVersion: "feedback-evidence-v1", dataOrigin: "demonstration", datasetVersion: input.datasetVersion,
    scope: { ...input.scope }, range: { ...input.range }, population: "matching-feedback-contributors-in-selected-event-window",
    sourceMetadata: { annotations: "fixture-authored-not-model-inferred", sources: [...new Set(selected.map((record) => record.source))].sort() },
    coverage: { matchingRecords: selected.length, includedReferences: included.length, truncated: included.length < selected.length },
    feedbackReferences: included.map((record) => ({ id: record.id, submittedAt: record.submittedAt, source: record.source,
      category: record.category, themeIds: [...record.themeIds], sentiment: record.sentiment, provenance: { ...record.provenance } })),
    feedbackSummary: { ...summary, themes: boundReferences(summary.themes), opportunities: boundReferences(summary.opportunities) },
    eventSummary: aggregateEvents(events, { ...input.scope, range: input.range }),
    funnel: funnel ? calculateFunnel(events, funnel, input.range) : undefined,
    limitations: ["Fictional authored records and annotations, not model-generated findings.",
      "Behavioural aggregates use the full selected event window for matching feedback contributors; they are not comment-time causal analysis.",
      "Noncompletion within the window is not proven abandonment. No causation is established.",
      "Only available fixture events are counted; missing history is not proof of inactivity.",
      "Counts cover all matching records; evidence references are capped at 50. No raw feedback text, customer IDs or event properties are included."],
  };
}

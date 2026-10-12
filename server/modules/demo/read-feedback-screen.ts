import "server-only";
import type { SearchInput } from "@/features/customer-intelligence/domain/explorer";
import { feedbackContext, paginateFeedback, parseFeedbackFilters, selectFeedback, sortFeedback, summarizeFeedback } from "@/features/feedback/domain/feedback";
import { buildFeedbackEvidence } from "@/features/feedback/domain/evidence";
import { readDemoContext } from "./read-demo-context";
import { demoRepository } from "./repository";

export async function readFeedbackScreen(input: SearchInput) {
  const context = await readDemoContext({ ...input, type: undefined });
  const parsed = parseFeedbackFilters(input, context.filters);
  const { filters } = parsed;
  const records = await demoRepository.listFeedback(context.scope, context.range);
  const matching = selectFeedback(records, { ...context.scope, range: context.range, customerId: filters.customer }, filters);
  const ordered = sortFeedback(matching, filters.sort);
  const explorer = paginateFeedback(ordered, filters.page);
  const funnel = context.configuredFunnels.find((item) => item.id === filters.funnel);
  const details = explorer.records.map((record) => ({ record, context: feedbackContext(record, context.allEvents, context.range, funnel) }));
  return {
    project: context.project, projects: context.projects, customers: context.customers, configuredFunnels: context.configuredFunnels,
    range: context.range, metadata: context.metadata, filters, corrected: context.corrected || parsed.corrected,
    summary: summarizeFeedback(matching), explorer, details,
    evidence: buildFeedbackEvidence({ records: matching, events: context.allEvents, funnel, scope: context.scope,
      range: context.range, datasetVersion: context.metadata.datasetVersion }),
  };
}
export type FeedbackScreenModel = Awaited<ReturnType<typeof readFeedbackScreen>>;

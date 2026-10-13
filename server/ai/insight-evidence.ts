import "server-only";
import type { EvidenceSelection, InsightOptions } from "@/features/ai/domain/insights";
import { demoRepository, getDemoMetadata } from "@/server/modules/demo/repository";
import { DEMO_WORKSPACE_ID } from "@/features/workspaces/domain/context";
import { presets, selectedRange } from "@/features/customer-intelligence/domain/explorer";
import { buildFeedbackEvidence } from "@/features/feedback/domain/evidence";
import { summarizeFeedback } from "@/features/feedback/domain/feedback";
import { calculateFunnel } from "@/domain/analytics/funnel";
import { AiError } from "./errors";

export async function readInsightOptions(): Promise<InsightOptions> {
  const projects = await demoRepository.listProjects(DEMO_WORKSPACE_ID);
  const options: InsightOptions["options"] = [];
  for (const project of projects) {
    const scope = { workspaceId: project.workspaceId, projectId: project.id };
    const funnels = await demoRepository.listFunnels(scope);
    for (const preset of presets) {
      const range = selectedRange(preset.id);
      const [records, events] = await Promise.all([demoRepository.listFeedback(scope, range), demoRepository.listEvents(scope, range)]);
      for (const opportunity of summarizeFeedback(records).opportunities) {
        options.push({ selection: { project: project.id, range: preset.id, kind: "feedback", evidenceId: opportunity.id }, label: `Feedback · ${opportunity.label}` });
      }
      for (const funnel of funnels) {
        for (const step of calculateFunnel(events, funnel, range).steps.filter((step) => step.dropOffCount > 0)) {
          options.push({ selection: { project: project.id, range: preset.id, kind: "funnel", evidenceId: step.stepId }, label: `Funnel · ${step.name}` });
        }
      }
    }
  }
  return { projects: projects.map(({ id, name }) => ({ id, name })), options };
}

/** Explicit projection: never serialize repository rows or broad summary DTOs.
 * Reuses feedback-evidence-v1 calculations, but transmits only this allowlist.
 */
export async function reconstructEvidence(selection: EvidenceSelection) {
  if (!presets.some((preset) => preset.id === selection.range)) throw new AiError("invalid_evidence", 400);
  const project = (await demoRepository.listProjects(DEMO_WORKSPACE_ID)).find((item) => item.id === selection.project);
  if (!project) throw new AiError("invalid_evidence", 400);
  const scope = { workspaceId: project.workspaceId, projectId: project.id };
  const range = selectedRange(selection.range);
  const [records, events, funnels] = await Promise.all([
    demoRepository.listFeedback(scope, range), demoRepository.listEvents(scope, range), demoRepository.listFunnels(scope),
  ]);
  const metadata = getDemoMetadata();
  const query = new URLSearchParams({ project: project.id, range: selection.range });
  const base = { schemaVersion: "insight-evidence-v1" as const, dataOrigin: "demonstration" as const,
    datasetVersion: metadata.datasetVersion, scope, range, selection,
    limitations: ["Fictional demonstration evidence; not live customer activity.", "No causal conclusion or verified root cause. Human review is required.", "Missing history and end-of-window noncompletion do not establish inactivity or abandonment."] };
  if (selection.kind === "feedback") {
    const matching = records.filter((record) => record.themeIds.some((id) => id === selection.evidenceId));
    const evidence = buildFeedbackEvidence({ records: matching, events, scope, range, datasetVersion: metadata.datasetVersion });
    const opportunity = evidence.feedbackSummary.opportunities.find((item) => item.id === selection.evidenceId);
    if (!opportunity) throw new AiError("invalid_evidence", 400);
    query.set("theme", opportunity.id);
    const facts = [{ id: `theme:${opportunity.id}`, observation: `${opportunity.label}: ${opportunity.recordCount} feedback records from ${opportunity.contributors} distinct contributors in the selected UTC window. These tags are fixture-authored.`, href: `/demo/feedback?${query}` }];
    return { ...base, population: evidence.population, facts,
      annotations: evidence.sourceMetadata.annotations, sources: evidence.sourceMetadata.sources,
      coverage: evidence.coverage,
      feedbackReferences: evidence.feedbackReferences.map((record) => ({ id: record.id, submittedAt: record.submittedAt,
        source: record.source, category: record.category, themeIds: [...record.themeIds],
        ...(record.sentiment ? { sentiment: record.sentiment } : {}),
        provenance: { kind: record.provenance.kind, annotations: record.provenance.annotations } })),
      analytics: { matchingRecords: opportunity.recordCount, distinctContributors: opportunity.contributors,
        eventCount: evidence.eventSummary.totalEvents, uniqueEventCustomers: evidence.eventSummary.uniqueCustomers },
    };
  }
  const funnel = funnels.find((item) => item.steps.some((step) => step.id === selection.evidenceId));
  if (!funnel) throw new AiError("invalid_evidence", 400);
  const result = calculateFunnel(events, funnel, range);
  const index = result.steps.findIndex((step) => step.stepId === selection.evidenceId);
  const step = result.steps[index];
  if (!step || index < 1 || step.dropOffCount === 0) throw new AiError("invalid_evidence", 400);
  query.set("funnel", funnel.id);
  const previous = result.steps[index - 1].customers;
  return { ...base, population: "unique-first-entry-customers-in-selected-event-window",
    facts: [{ id: `funnel:${step.stepId}`, observation: `${step.name}: ${step.customers} of ${previous} customers at the previous step progressed; ${step.dropOffCount} did not progress within the observation window (${step.dropOffRate.toFixed(1)}%). This is observed noncompletion, not abandonment.`, href: `/demo/funnels?${query}` }],
    analytics: { algorithmVersion: result.algorithmVersion, countingUnit: result.countingUnit,
      conversionWindowMs: result.conversionWindowMs, entrants: result.entrants,
      previousStepCustomers: previous, stepCustomers: step.customers, dropOffCount: step.dropOffCount,
      dropOffRate: step.dropOffRate, stepConversionRate: step.stepConversionRate },
  };
}

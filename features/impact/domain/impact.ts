import { countEvents, countUniqueCustomers, dateRangeBounds, filterEvents, timestampMs } from "@/domain/analytics/events";
import type { DateRange, ProductEvent, ProjectScope } from "@/features/customer-intelligence/domain/types";
import { unresolvedReferences, type Mission, type MissionContext } from "@/features/missions/domain/missions";

export type MetricKind = "event_count" | "active_customers";
export interface MetricDefinition extends ProjectScope {
  kind: MetricKind;
  eventName?: string;
  datasetVersion: string;
  algorithmVersion: "impact-v1";
  /** Fixed eligible population, not a claim that active people are identical. */
  cohort: readonly string[];
}
export interface EventReference { id: string; occurredAt: string; href: string }
export interface Measurement {
  metric: MetricDefinition;
  period: DateRange;
  value: number | null;
  evidence: EventReference[];
  status: "available" | "insufficient_data" | "invalid_evidence";
}
export interface Comparison {
  baseline: Measurement;
  comparison: Measurement;
  status: "observed_change" | "no_change" | "insufficient_data" | "incompatible" | "invalid_evidence";
  absoluteChange: number | null;
  relativeChange: number | null;
  evaluatedAt: string;
  limitations: string[];
}
export interface ImpactOption { id: string; label: string; result: Comparison }
export interface ImpactContext {
  missionContext: MissionContext;
  options: ImpactOption[];
  datasetVersion: string;
  coverage: DateRange;
}
export type MissionEvaluation = {
  missionId: string;
  evaluatedAt: string;
  status: "not_completed" | "insufficient_data" | "invalid_evidence" | "incompatible";
  limitations: string[];
  result?: never;
} | {
  missionId: string;
  evaluatedAt: string;
  status: "observed_change" | "no_change";
  limitations: string[];
  result: Comparison;
};

export function missionEvaluationFingerprint(mission: Mission): string {
  return JSON.stringify({ projectId: mission.projectId, status: mission.status, completedAt: mission.completedAt,
    successCriteria: mission.successCriteria, measurementPlan: mission.measurementPlan,
    references: mission.references, provenanceDatasetVersion: mission.provenance?.datasetVersion });
}

export function measure(events: readonly ProductEvent[], metric: MetricDefinition, period: DateRange, coverage: DateRange): Measurement {
  const [start, end] = dateRangeBounds(period);
  const [coveredStart, coveredEnd] = dateRangeBounds(coverage);
  const base = { metric, period, value: null, evidence: [] };
  if (start < coveredStart || end > coveredEnd) return { ...base, status: "insufficient_data" };
  const query = { ...metric, range: period };
  const selected = filterEvents(events, query);
  const ids = new Set(selected.map((event) => event.id));
  if (ids.size !== selected.length || selected.some((event) => !metric.cohort.includes(event.customerId))) {
    return { ...base, status: "invalid_evidence" };
  }
  const evidence = [...selected].sort((a, b) => a.occurredAt.localeCompare(b.occurredAt) || a.id.localeCompare(b.id))
    .map((event) => ({ id: event.id, occurredAt: event.occurredAt,
      href: `/demo/events?project=${encodeURIComponent(metric.projectId)}&range=all&q=${encodeURIComponent(event.id)}` }));
  return { metric, period, evidence, status: "available", value: metric.kind === "event_count" ? countEvents(events, query) : countUniqueCustomers(events, query) };
}

function sameMetric(left: MetricDefinition, right: MetricDefinition) {
  return left.workspaceId === right.workspaceId && left.projectId === right.projectId && left.kind === right.kind &&
    left.eventName === right.eventName && left.datasetVersion === right.datasetVersion && left.algorithmVersion === right.algorithmVersion &&
    JSON.stringify([...left.cohort].sort()) === JSON.stringify([...right.cohort].sort());
}

/** Inputs originate from measure(), never model prose or saved numeric claims. */
export function compareMeasurements(baseline: Measurement, comparison: Measurement, evaluatedAt: string): Comparison {
  timestampMs(evaluatedAt);
  const [bs, be] = dateRangeBounds(baseline.period);
  const [cs, ce] = dateRangeBounds(comparison.period);
  const common = { baseline, comparison, evaluatedAt, absoluteChange: null, relativeChange: null,
    limitations: ["Observed change is not causal impact or verified mission success.", "Fictional authored events only; no live activity or evidence of a product intervention.", "Same eligible project population; active customer composition and customer maturity may differ.", "No statistical significance, retention adjustment or desirable-direction judgement is calculated."] };
  if (!sameMetric(baseline.metric, comparison.metric) || be > cs || be - bs !== ce - cs) return { ...common, status: "incompatible" };
  if (baseline.status === "invalid_evidence" || comparison.status === "invalid_evidence") return { ...common, status: "invalid_evidence" };
  if (baseline.value === null || comparison.value === null || baseline.status !== "available" || comparison.status !== "available") return { ...common, status: "insufficient_data" };
  const absoluteChange = comparison.value - baseline.value;
  return { ...common, status: absoluteChange === 0 ? "no_change" : "observed_change", absoluteChange,
    relativeChange: baseline.value === 0 ? null : absoluteChange / baseline.value * 100,
    limitations: baseline.value === 0 ? [...common.limitations, "Relative change is undefined for a zero baseline."] : common.limitations };
}

/** Explicit session-only evaluation. A historic comparison is never automatically assigned. */
export function evaluateMission(mission: Mission, option: ImpactOption, context: ImpactContext, evaluatedAt: string): MissionEvaluation {
  timestampMs(evaluatedAt);
  const base = { missionId: mission.id, evaluatedAt };
  if (mission.status !== "completed" || !mission.completedAt) return { ...base, status: "not_completed", limitations: ["Completion and measurement are separate. This mission is not completed."] };
  if (!context.missionContext.projects.some((project) => project.id === mission.projectId) || unresolvedReferences(mission, context.missionContext).length ||
    (mission.provenance && mission.provenance.datasetVersion !== context.datasetVersion)) {
    return { ...base, status: "invalid_evidence", limitations: ["Project or source evidence is stale or unavailable. No outcome was calculated."] };
  }
  const result = option.result;
  if (result.baseline.metric.projectId !== mission.projectId || result.comparison.metric.projectId !== mission.projectId ||
    result.baseline.metric.datasetVersion !== context.datasetVersion || result.comparison.metric.datasetVersion !== context.datasetVersion) {
    return { ...base, status: "incompatible", limitations: ["Metric scope or dataset version does not match this mission."] };
  }
  const completion = timestampMs(mission.completedAt);
  if (timestampMs(result.baseline.period.end) > completion || timestampMs(result.comparison.period.start) < completion ||
    timestampMs(result.comparison.period.end) > timestampMs(context.coverage.end) || timestampMs(result.baseline.period.start) < timestampMs(context.coverage.start) ||
    timestampMs(result.comparison.period.end) > timestampMs(evaluatedAt)) {
    return { ...base, status: "insufficient_data", limitations: ["Selected windows do not provide a baseline before completion and observed data after completion. Historical fixture results were not assigned to this mission."] };
  }
  if (result.status !== "observed_change" && result.status !== "no_change") return { ...base, status: result.status, limitations: result.limitations };
  return { ...base, status: result.status, result: { ...result, evaluatedAt }, limitations: result.limitations };
}

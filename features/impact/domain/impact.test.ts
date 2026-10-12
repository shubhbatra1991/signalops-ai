import { expect, test } from "vitest";
import type { ProductEvent } from "@/features/customer-intelligence/domain/types";
import { createMission, updateMission, type MissionContext } from "@/features/missions/domain/missions";
import { compareMeasurements, evaluateMission, measure, missionEvaluationFingerprint, type ImpactContext, type MetricDefinition } from "./impact";

const coverage = { start: "2026-06-01T00:00:00.000Z", end: "2026-06-16T00:00:00.000Z" };
const baselinePeriod = { start: "2026-06-01T00:00:00.000Z", end: "2026-06-08T00:00:00.000Z" };
const comparisonPeriod = { start: "2026-06-08T00:00:00.000Z", end: "2026-06-15T00:00:00.000Z" };
const scope = { workspaceId: "workspace", projectId: "project" };
const metric: MetricDefinition = { ...scope, kind: "event_count", eventName: "viewed", datasetVersion: "fixture-v1", algorithmVersion: "impact-v1", cohort: ["customer-1"] };
const event = (id: string, occurredAt: string, customerId = "customer-1"): ProductEvent => ({ ...scope, id, customerId, name: "viewed", occurredAt, receivedAt: occurredAt, properties: {}, dataOrigin: "demonstration" });
const events = [event("at-start", baselinePeriod.start), event("before-boundary", "2026-06-07T23:59:59.999Z"), event("at-shared-boundary", comparisonPeriod.start), event("before-end", "2026-06-14T23:59:59.999Z"), event("at-end", comparisonPeriod.end)];

test("uses equal seven-day UTC half-open windows without double counting boundaries", () => {
  const baseline = measure(events, metric, baselinePeriod, coverage);
  const comparison = measure(events, metric, comparisonPeriod, coverage);
  expect(Date.parse(baselinePeriod.end) - Date.parse(baselinePeriod.start)).toBe(7 * 24 * 60 * 60 * 1000);
  expect(Date.parse(comparisonPeriod.end) - Date.parse(comparisonPeriod.start)).toBe(7 * 24 * 60 * 60 * 1000);
  expect(baseline.evidence.map((item) => item.id)).toEqual(["at-start", "before-boundary"]);
  expect(comparison.evidence.map((item) => item.id)).toEqual(["at-shared-boundary", "before-end"]);
  expect(new Set([...baseline.evidence, ...comparison.evidence].map((item) => item.id)).size).toBe(4);
});

test("reuses deterministic selectors for event and unique-customer metrics", () => {
  expect(measure(events, metric, baselinePeriod, coverage).value).toBe(2);
  expect(measure([...events, event("second-customer", baselinePeriod.start, "customer-2")], { ...metric, kind: "active_customers", cohort: ["customer-1", "customer-2"] }, baselinePeriod, coverage).value).toBe(2);
});

test("missing metrics and empty covered periods are factual zeroes; zero baseline has no relative rate", () => {
  const missing = { ...metric, eventName: "missing" };
  const baseline = measure(events, missing, baselinePeriod, coverage);
  const comparison = measure(events, missing, comparisonPeriod, coverage);
  const result = compareMeasurements(baseline, comparison, "2026-10-12T00:00:00.000Z");
  expect(baseline).toMatchObject({ status: "available", value: 0, evidence: [] });
  expect(result).toMatchObject({ status: "no_change", absoluteChange: 0, relativeChange: null });
  expect(result.limitations).toContain("Relative change is undefined for a zero baseline.");
});

test("distinguishes unavailable ranges and incompatible or invalid evidence", () => {
  expect(measure(events, metric, { start: "2026-05-25T00:00:00.000Z", end: baselinePeriod.start }, coverage).status).toBe("insufficient_data");
  const baseline = measure(events, metric, baselinePeriod, coverage);
  const incompatible = measure(events, { ...metric, projectId: "other" }, comparisonPeriod, coverage);
  expect(compareMeasurements(baseline, incompatible, "2026-10-12T00:00:00.000Z").status).toBe("incompatible");
  expect(measure([event("duplicate", baselinePeriod.start), event("duplicate", baselinePeriod.start)], metric, baselinePeriod, coverage).status).toBe("invalid_evidence");
  expect(measure([event("outside-cohort", baselinePeriod.start, "customer-2")], metric, baselinePeriod, coverage).status).toBe("invalid_evidence");
});

const missionContext: MissionContext = { projects: [{ id: "project", name: "Project" }], evidence: [] };
const missionInput = { projectId: "project", title: "Research activation", objective: "Understand activation changes", successCriteria: "Review observed evidence", status: "completed" as const, priority: "medium" as const, source: "manual" as const, references: [] };
const missionId = "6a8f69fb-538a-4f2a-8ad7-3c17ff68381a";
const completion = "2026-10-12T10:00:00.000Z";
const comparison = compareMeasurements(measure(events, metric, baselinePeriod, coverage), measure(events, metric, comparisonPeriod, coverage), completion);
const impactContext: ImpactContext = { missionContext, datasetVersion: "fixture-v1", coverage, options: [{ id: "metric", label: "Metric", result: comparison }] };

test("completion never becomes verified impact when post-completion evidence is absent", () => {
  const mission = createMission(missionInput, missionContext, missionId, completion);
  const evaluation = evaluateMission(mission, impactContext.options[0], impactContext, completion);
  expect(evaluation.status).toBe("insufficient_data");
  expect(evaluation).not.toHaveProperty("result");
  expect(evaluation.limitations.join(" ")).toMatch(/Historical fixture results were not assigned/);
});

test("editing measurement fields, reopening and cancellation invalidate current evaluation identity", () => {
  const mission = createMission(missionInput, missionContext, missionId, completion);
  const original = missionEvaluationFingerprint(mission);
  const editedCriteria = updateMission(mission, { ...missionInput, successCriteria: "Revised evidence review" }, missionContext, "2026-10-13T00:00:00.000Z");
  const editedPlan = updateMission(mission, { ...missionInput, measurementPlan: { metric: "Activation", baselineReference: "First week", evaluation: "Compare equal windows" } }, missionContext, "2026-10-13T00:00:00.000Z");
  const reopened = updateMission(mission, { ...missionInput, status: "in_progress" }, missionContext, "2026-10-13T00:00:00.000Z");
  const cancelled = updateMission(mission, { ...missionInput, status: "cancelled" }, missionContext, "2026-10-13T00:00:00.000Z");
  expect(missionEvaluationFingerprint(editedCriteria)).not.toBe(original);
  expect(missionEvaluationFingerprint(editedPlan)).not.toBe(original);
  expect(missionEvaluationFingerprint(reopened)).not.toBe(original);
  expect(missionEvaluationFingerprint(cancelled)).not.toBe(original);
  expect(evaluateMission(reopened, impactContext.options[0], impactContext, completion).status).toBe("not_completed");
  expect(evaluateMission(cancelled, impactContext.options[0], impactContext, completion).status).toBe("not_completed");
});

import { z } from "zod";
import { evidenceSelectionSchema } from "@/features/ai/domain/insights";

const text = (max: number) => z.string().trim().max(max).refine((value) =>
  !/[\u0000-\u0008\u000b\u000c\u000e-\u001f]/u.test(value) && !/\b(?:sk-(?:proj-|ant-)?[\w-]{12,}|gsk_[\w-]{12,})/u.test(value), "Remove credentials and control characters.");
export const statuses = ["backlog", "in_progress", "completed", "cancelled"] as const;
export const priorities = ["low", "medium", "high"] as const;
export const sources = ["manual", "feedback", "funnel", "ai_insight"] as const;
export const missionReferenceSchema = evidenceSelectionSchema.extend({ id: text(100).min(1) });
export type MissionReference = z.infer<typeof missionReferenceSchema>;
const provenanceSchema = z.strictObject({ insightId: z.uuid(), provider: z.enum(["openai", "groq", "anthropic", "zai"]),
  model: text(80).min(1), promptVersion: text(40).min(1), datasetVersion: text(80).min(1), generatedAt: z.iso.datetime() });
export const missionCreationSchema = z.strictObject({
  projectId: text(80).min(1), title: text(160).min(3), objective: text(1200).min(5),
  status: z.enum(statuses), priority: z.enum(priorities), source: z.enum(sources),
  references: z.array(missionReferenceSchema).max(8), provenance: provenanceSchema.optional(),
  successCriteria: text(1200).min(5), measurementPlan: z.strictObject({ metric: text(300), baselineReference: text(300), evaluation: text(800) }).optional(),
}).superRefine((value, context) => {
  if (value.references.some((reference) => reference.project !== value.projectId) || new Set(value.references.map(referenceKey)).size !== value.references.length)
    context.addIssue({ code: "custom", message: "Evidence must be unique and belong to the mission project." });
  if ((value.source === "manual" && (value.references.length || value.provenance)) || (value.source !== "manual" && !value.references.length) ||
    (value.source === "ai_insight") !== Boolean(value.provenance) ||
    ((value.source === "feedback" || value.source === "funnel") && value.references.some((reference) => reference.kind !== value.source)))
    context.addIssue({ code: "custom", message: "Source, provenance and evidence do not match." });
});
export type MissionInput = z.infer<typeof missionCreationSchema>;
export const missionUpdateSchema = missionCreationSchema;
export const missionSchema = missionCreationSchema.safeExtend({ id: z.uuid(), createdAt: z.iso.datetime(), updatedAt: z.iso.datetime(), completedAt: z.iso.datetime().optional() }).superRefine((value, context) => {
  if (Date.parse(value.createdAt) > Date.parse(value.updatedAt) || (value.status === "completed") !== Boolean(value.completedAt) ||
    (value.completedAt && (Date.parse(value.completedAt) < Date.parse(value.createdAt) || Date.parse(value.completedAt) > Date.parse(value.updatedAt))))
    context.addIssue({ code: "custom", message: "Mission lifecycle timestamps are inconsistent." });
});
export type Mission = z.infer<typeof missionSchema>;
export interface MissionEvidence { reference: MissionReference; label: string; href: string; eventsHref: string; baseline: string }
export interface MissionContext { projects: { id: string; name: string }[]; evidence: MissionEvidence[] }
export function referenceKey(reference: MissionReference) { return JSON.stringify([reference.project, reference.range, reference.kind, reference.evidenceId, reference.id]); }
export function unresolvedReferences(input: MissionInput, context: MissionContext) {
  return input.references.filter((reference) => !context.evidence.some((item) => referenceKey(item.reference) === referenceKey(reference)));
}
export function validateMissionInput(input: unknown, context: MissionContext): MissionInput {
  const parsed = missionCreationSchema.parse(input);
  if (!context.projects.some((project) => project.id === parsed.projectId) || unresolvedReferences(parsed, context).length) throw new Error("Evidence is stale, unavailable or belongs to another project. Review the source.");
  return parsed;
}
export function createMission(input: unknown, context: MissionContext, id: string, now: string): Mission {
  const fields = validateMissionInput(input, context);
  return missionSchema.parse({ ...fields, id, createdAt: now, updatedAt: now, ...(fields.status === "completed" ? { completedAt: now } : {}) });
}
export function updateMission(previous: Mission, input: unknown, context: MissionContext, now: string): Mission {
  const fields = missionUpdateSchema.parse(validateMissionInput(input, context));
  const updatedAt = new Date(Math.max(Date.parse(now), Date.parse(previous.updatedAt))).toISOString();
  return missionSchema.parse({ ...fields, id: previous.id, createdAt: previous.createdAt, updatedAt,
    ...(fields.status === "completed" ? { completedAt: previous.completedAt ?? updatedAt } : {}) });
}

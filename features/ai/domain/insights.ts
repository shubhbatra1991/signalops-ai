import { z } from "zod";
import { connectionRequestSchema, connectionResultSchema, providerSchema } from "./contracts";
import { hasUnsupportedCausalAssertion, hasUnsupportedNumber } from "./research-language";

export const evidenceSelectionSchema = z.strictObject({
  project: z.string().min(1).max(80),
  range: z.enum(["all", "first-week", "second-week"]),
  kind: z.enum(["feedback", "funnel"]),
  evidenceId: z.string().min(1).max(100),
});
export type EvidenceSelection = z.infer<typeof evidenceSelectionSchema>;
export const previewRequestSchema = z.strictObject({
  action: z.literal("preview"), mode: z.enum(["browser", "environment"]), provider: providerSchema, model: z.string().max(80), selection: evidenceSelectionSchema,
});
export const generationRequestSchema = z.strictObject({
  action: z.literal("generate"), credentials: connectionRequestSchema, selection: evidenceSelectionSchema,
  ticket: z.uuid(), approved: z.literal(true),
});
// Models select facts, never author displayed observations or statistics. Free text is
// restricted to qualitative research questions/actions; this is not a semantic proof.
const qualitative = z.string().trim().min(5).max(400)
  .refine((text) => !/[<>]/u.test(text), { params: { rule: "unsafe_markup" } })
  .refine((text) => !hasUnsupportedNumber(text), { params: { rule: "unsupported_numerical_claim" } })
  .refine((text) => !hasUnsupportedCausalAssertion(text), { params: { rule: "unsupported_causal_assertion" } });
const boundedText = z.string().trim().min(5).max(400);
export const insightDraftStructureSchema = z.strictObject({
  title: boundedText,
  evidenceReferenceIds: z.array(z.string().min(1).max(100)).min(1).max(8),
  hypotheses: z.array(boundedText).min(1).max(3),
  limitations: z.array(boundedText).min(1).max(3),
  recommendedAction: boundedText,
});
export const insightDraftSchema = z.strictObject({
  title: qualitative,
  evidenceReferenceIds: z.array(z.string().min(1).max(100)).min(1).max(8),
  hypotheses: z.array(qualitative.refine((text) => text.endsWith("?"), { params: { rule: "research_question" } })).min(1).max(3),
  limitations: z.array(qualitative.refine((text) => /\b(unknown|uncertain|unclear|cannot|unverified|not (?:established|known|verified)|may|might|could|limited|limitation|insufficient|does not|do not)\b/iu.test(text), { params: { rule: "explicit_uncertainty" } })).min(1).max(3),
  recommendedAction: qualitative,
});
export const factSchema = z.strictObject({ id: z.string().max(100), observation: z.string().max(1000), href: z.string().startsWith("/").max(500) });
export const insightSchema = z.strictObject({
  schemaVersion: z.literal("insight-v1"), id: z.uuid(), title: z.string().max(400),
  observation: z.string().max(8000), evidenceReferenceIds: z.array(z.string()).min(1).max(8),
  sources: z.array(factSchema).min(1).max(8), hypotheses: z.array(z.string()).min(1).max(3),
  limitations: z.array(z.string()).min(1).max(10), recommendedAction: z.string().max(400),
  provenance: z.strictObject({ provider: providerSchema, model: z.string().max(80), promptVersion: z.literal("insight-prompt-v1"), datasetVersion: z.string().max(80) }),
  generatedAt: z.iso.datetime(), selection: evidenceSelectionSchema,
});
export type Insight = z.infer<typeof insightSchema>;
export interface EvidenceOption { selection: EvidenceSelection; label: string }
export interface InsightOptions { projects: { id: string; name: string }[]; options: EvidenceOption[] }
export const reviewSchema = z.strictObject({
  ticket: z.uuid(), expiresAt: z.iso.datetime(), provider: providerSchema, model: z.string().max(80),
  mode: z.enum(["browser", "environment"]),
  destination: z.string().max(100), category: z.literal("fictional-demonstration-aggregates-and-reference-metadata"),
  selection: evidenceSelectionSchema, prompt: z.string().max(24000),
  outputSchema: z.record(z.string(), z.unknown()), maxOutputTokens: z.literal(1200),
  format: z.enum(["json-schema", "json-object"]), digest: z.string().length(64),
});
export type InsightReview = z.infer<typeof reviewSchema>;
export const reviewResultSchema = z.union([z.strictObject({ ok: z.literal(true), review: reviewSchema }), connectionResultSchema.options[1]]);
export const insightResultSchema = z.union([z.strictObject({ ok: z.literal(true), insight: insightSchema }), connectionResultSchema.options[1]]);

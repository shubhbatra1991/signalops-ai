import "server-only";
import { z } from "zod";
import { providers, type ProviderId } from "@/features/ai/domain/providers";
import { AiError } from "./errors";
import type { AiErrorCode } from "@/features/ai/domain/contracts";

export type OutputCategory = "JSON_PARSE_FAILED" | "SCHEMA_VALIDATION_FAILED" | "EVIDENCE_REFERENCE_INVALID" | "LANGUAGE_CONSTRAINT_FAILED" | "OUTPUT_TRUNCATED" | "PROVIDER_RESPONSE_INCOMPLETE";
export type OutputRule = "json_syntax" | "field_shape_or_bounds" | "reference_membership_or_uniqueness" | "unsupported_numerical_claim" | "unsupported_causal_assertion" | "unsafe_markup" | "research_question" | "explicit_uncertainty" | "credential_echo" | "completion_limit" | "complete_final_content";
const count = z.number().int().nonnegative().max(Number.MAX_SAFE_INTEGER).optional();
const metadataSchema = z.object({
  finishReason: z.enum(["stop", "length", "content_filter", "tool_calls", "function_call", "unknown"]),
  promptTokens: count, completionTokens: count, totalTokens: count, reasoningTokens: count,
});
export type OutputMetadata = z.infer<typeof metadataSchema>;

/** Project only known status values/counts; arbitrary provider fields never reach logs. */
export function groqMetadata(body: unknown): OutputMetadata {
  const shape = z.object({ choices: z.array(z.object({ finish_reason: z.unknown().optional() })),
    usage: z.object({ prompt_tokens: z.unknown().optional(), completion_tokens: z.unknown().optional(), total_tokens: z.unknown().optional(),
      completion_tokens_details: z.object({ reasoning_tokens: z.unknown().optional() }).optional() }).optional() }).safeParse(body);
  const usage = shape.success ? shape.data.usage : undefined;
  const finish = shape.success ? shape.data.choices[0]?.finish_reason : undefined;
  const finishReason = metadataSchema.shape.finishReason.safeParse(finish);
  function tokens(value: unknown) { const parsed = count.safeParse(value); return parsed.success ? parsed.data : undefined; }
  return { finishReason: finishReason.success ? finishReason.data : "unknown", promptTokens: tokens(usage?.prompt_tokens),
    completionTokens: tokens(usage?.completion_tokens), totalTokens: tokens(usage?.total_tokens), reasoningTokens: tokens(usage?.completion_tokens_details?.reasoning_tokens) };
}

export class AiOutputError extends AiError {
  constructor(code: AiErrorCode, readonly category: OutputCategory, readonly rule: OutputRule, readonly metadata?: OutputMetadata) { super(code, 502); }
}

/** Development diagnostics contain no text, evidence, dynamic paths or arbitrary errors. */
export function logOutputFailure(error: AiOutputError, provider: ProviderId, model: string, correlationId: string, metadata?: OutputMetadata) {
  if (process.env.NODE_ENV !== "development" || providers[provider].model !== model || !z.uuid().safeParse(correlationId).success) return;
  const safe = metadataSchema.safeParse(error.metadata ?? metadata);
  console.warn(JSON.stringify({ category: error.category, rule: error.rule, provider, model, correlationId,
    ...(safe.success ? { finishReason: safe.data.finishReason, promptTokens: safe.data.promptTokens, completionTokens: safe.data.completionTokens,
      totalTokens: safe.data.totalTokens, reasoningTokens: safe.data.reasoningTokens } : {}) }));
}

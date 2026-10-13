import { z } from "zod";
import { providers } from "./providers";

export const providerSchema = z.enum(["openai", "groq", "anthropic", "zai"]);
export const selectionSchema = z.strictObject({ provider: providerSchema, model: z.string().max(80) })
  .refine((value) => providers[value.provider].model === value.model, { message: "Unsupported model" });
export const keySchema = z.string().min(1).max(1024).regex(/^[\x21-\x7e]+$/);
export const connectionRequestSchema = z.discriminatedUnion("mode", [
  z.strictObject({ mode: z.literal("browser"), provider: providerSchema, model: z.string().max(80), apiKey: keySchema }),
  z.strictObject({ mode: z.literal("environment"), provider: providerSchema, model: z.string().max(80) }),
]);
export type ConnectionRequest = z.infer<typeof connectionRequestSchema>;
export const configurationSchema = z.strictObject({
  status: z.enum(["unconfigured", "configured", "invalid"]),
  selection: selectionSchema.optional(),
  serverTestsEnabled: z.boolean(),
  serverInsightsEnabled: z.boolean().optional(),
  deployment: z.strictObject({
    mode: z.enum(["public-demo", "self-hosted"]),
    providerRequestsEnabled: z.boolean(),
    configurationValid: z.boolean(),
  }),
});
export type PublicConfiguration = z.infer<typeof configurationSchema>;
export const errorMessages = {
  invalid_request: "Invalid AI request.",
  unsupported_model: "This model is not supported by this installation or provider account.",
  invalid_key: "The provider rejected the API key. Check or replace it.",
  insufficient_credits: "Provider billing or credits prevented the request. Check your provider account.",
  permission_denied: "The provider denied access. Check model and account permissions.",
  rate_limited: "The provider rate or usage limit was reached. Retry manually later.",
  local_rate_limit: "This instance's shared AI request limit was reached. Retry manually later.",
  unavailable: "The provider is unavailable. Retry manually later.",
  timeout: "The AI request timed out or was cancelled. Review again before retrying.",
  malformed_response: "The provider returned an unexpected or incomplete response.",
  request_rejected: "The provider rejected the request. Check model access, billing and account configuration.",
  configuration_unavailable: "Server configuration is unavailable or browser use of it is disabled.",
  provider_requests_disabled: "AI provider requests are disabled by this deployment. Deterministic demo features remain available.",
  forbidden: "AI requests require the configured same-origin application.",
  body_too_large: "The request exceeds the AI request size limit.",
  review_expired: "The review expired, changed or was already used. Review the evidence again.",
  invalid_evidence: "The selected evidence is unavailable in this project and date range.",
  invalid_insight: "The output failed evidence or research-language validation. Review and retry manually.",
  refused: "The provider declined this request. No insight was accepted.",
} as const;
export type AiErrorCode = keyof typeof errorMessages;
export const connectionResultSchema = z.discriminatedUnion("ok", [
  z.strictObject({ ok: z.literal(true), provider: providerSchema, model: z.string().max(80), requestId: z.string().max(80) }),
  z.strictObject({ ok: z.literal(false), code: z.enum(Object.keys(errorMessages) as [AiErrorCode, ...AiErrorCode[]]), requestId: z.string().max(80) }),
]);
export type ConnectionResult = z.infer<typeof connectionResultSchema>;


import "server-only";
import { z } from "zod";
import type { ProviderId } from "@/features/ai/domain/providers";
import { selectionSchema } from "@/features/ai/domain/contracts";
import { AiError } from "./errors";
import { providerJson } from "./transport";
import { AiOutputError, groqMetadata, type OutputMetadata } from "./diagnostics";

export interface TextGenerationRequest { readonly model: string; readonly prompt: string; readonly maxOutputTokens: number; readonly apiKey: string; readonly signal: AbortSignal; readonly outputSchema?: Record<string, unknown> }
export interface TextGenerationResponse { readonly text: string; readonly metadata?: OutputMetadata }
export interface TextProvider { generateText(input: TextGenerationRequest): Promise<TextGenerationResponse> }
const textSchema = z.string().trim().min(1).max(4096);
const chatSchema = z.object({ choices: z.array(z.object({ finish_reason: z.literal("stop"), message: z.object({ content: textSchema }) })).length(1) });
const claudeSchema = z.object({ stop_reason: z.literal("end_turn"), content: z.array(z.object({ type: z.literal("text"), text: textSchema })).min(1).max(8) });
const openaiSchema = z.object({ status: z.literal("completed"), output: z.array(z.object({ type: z.literal("message"), content: z.array(z.object({ type: z.literal("output_text"), text: textSchema })).min(1).max(8) })).min(1).max(8) });
function parse<T>(schema: z.ZodType<T>, value: unknown): T {
  const result = schema.safeParse(value);
  if (!result.success) throw new AiError("malformed_response");
  return result.data;
}
const openai: TextProvider = {
  async generateText(input) {
    const body = await providerJson("https://api.openai.com/v1/responses", { Authorization: `Bearer ${input.apiKey}` },
      { model: input.model, input: input.prompt, max_output_tokens: input.maxOutputTokens, store: false, stream: false,
        ...(input.outputSchema ? { text: { format: { type: "json_schema", name: "insight_draft", strict: true, schema: input.outputSchema } } } : {}) }, input.signal);
    if (input.outputSchema && z.object({ output: z.array(z.object({ content: z.array(z.object({ type: z.string() })) })) }).safeParse(body).data?.output.some((item) => item.content.some((part) => part.type === "refusal"))) throw new AiError("refused");
    return { text: parse(openaiSchema, body).output.flatMap((item) => item.content.map((part) => part.text)).join("\n") };
  },
};
const groq: TextProvider = {
  async generateText(input) {
    let body: unknown;
    try { body = await providerJson("https://api.groq.com/openai/v1/chat/completions", { Authorization: `Bearer ${input.apiKey}` },
      { model: input.model, messages: [{ role: "user", content: input.prompt }], max_completion_tokens: input.maxOutputTokens, stream: false,
        include_reasoning: false, reasoning_effort: "low",
        ...(input.outputSchema ? { response_format: { type: "json_schema", json_schema: { name: "insight_draft", strict: true, schema: input.outputSchema } } } : {}) }, input.signal, "groq"); }
    catch (error) {
      if (error instanceof AiError && error.code === "malformed_response") throw new AiOutputError("malformed_response", "PROVIDER_RESPONSE_INCOMPLETE", "complete_final_content");
      throw error;
    }
    const metadata = groqMetadata(body);
    if (metadata.finishReason === "length") throw new AiOutputError("malformed_response", "OUTPUT_TRUNCATED", "completion_limit", metadata);
    const parsed = chatSchema.safeParse(body);
    if (!parsed.success) throw new AiOutputError("malformed_response", "PROVIDER_RESPONSE_INCOMPLETE", "complete_final_content", metadata);
    return { text: parsed.data.choices[0].message.content, ...(input.outputSchema ? { metadata } : {}) };
  },
};
const anthropic: TextProvider = {
  async generateText(input) {
    const body = await providerJson("https://api.anthropic.com/v1/messages", { "x-api-key": input.apiKey, "anthropic-version": "2023-06-01" },
      { model: input.model, messages: [{ role: "user", content: input.prompt }], max_tokens: input.maxOutputTokens, stream: false,
        ...(input.outputSchema ? { output_config: { format: { type: "json_schema", schema: input.outputSchema } } } : {}) }, input.signal);
    if (input.outputSchema && z.object({ stop_reason: z.literal("refusal") }).safeParse(body).success) throw new AiError("refused");
    return { text: parse(claudeSchema, body).content.map((part) => part.text).join("\n") };
  },
};
const zai: TextProvider = {
  async generateText(input) {
    const body = await providerJson("https://api.z.ai/api/paas/v4/chat/completions", { Authorization: `Bearer ${input.apiKey}` },
      { model: input.model, messages: [{ role: "user", content: input.prompt }], max_tokens: input.maxOutputTokens, thinking: { type: "disabled" }, stream: false,
        ...(input.outputSchema ? { response_format: { type: "json_object" } } : {}) }, input.signal);
    return { text: parse(chatSchema, body).choices[0].message.content };
  },
};
const adapters: Record<ProviderId, TextProvider> = { openai, groq, anthropic, zai };
export async function generateText(provider: ProviderId, input: TextGenerationRequest): Promise<TextGenerationResponse> {
  if (!selectionSchema.safeParse({ provider, model: input.model }).success) throw new AiError("unsupported_model", 400);
  return adapters[provider].generateText(input);
}

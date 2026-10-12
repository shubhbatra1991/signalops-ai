import "server-only";
import { z } from "zod";
import { keySchema, selectionSchema, type PublicConfiguration } from "@/features/ai/domain/contracts";

const keyVariables = { openai: "OPENAI_API_KEY", groq: "GROQ_API_KEY", anthropic: "ANTHROPIC_API_KEY", zai: "ZAI_API_KEY" } as const;
const enabledSchema = z.enum(["true", "false"]).default("false");
export function readAiConfiguration(env: Readonly<Record<string, string | undefined>> = process.env) {
  const enabled = enabledSchema.safeParse(env.AI_ALLOW_SERVER_KEY_TESTS);
  const selection = selectionSchema.safeParse({ provider: env.AI_PROVIDER, model: env.AI_MODEL });
  const hasSelection = Boolean(env.AI_PROVIDER || env.AI_MODEL);
  const key = selection.success ? keySchema.safeParse(env[keyVariables[selection.data.provider]]) : undefined;
  const valid = enabled.success && selection.success && key?.success;
  const publicConfiguration: PublicConfiguration = {
    status: !hasSelection && enabled.success ? "unconfigured" : valid ? "configured" : "invalid",
    selection: valid ? selection.data : undefined,
    serverTestsEnabled: Boolean(valid && enabled.data === "true"),
    ...(env.AI_ALLOW_SERVER_KEY_INSIGHTS !== undefined ? { serverInsightsEnabled: Boolean(valid && env.AI_ALLOW_SERVER_KEY_INSIGHTS === "true") } : {}),
  };
  return { publicConfiguration, credential: valid ? key.data : undefined };
}

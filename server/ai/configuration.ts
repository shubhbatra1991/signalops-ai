import "server-only";
import { z } from "zod";
import { keySchema, selectionSchema, type PublicConfiguration } from "@/features/ai/domain/contracts";

const keyVariables = { openai: "OPENAI_API_KEY", groq: "GROQ_API_KEY", anthropic: "ANTHROPIC_API_KEY", zai: "ZAI_API_KEY" } as const;
const enabledSchema = z.enum(["true", "false"]).default("false");
const deploymentModeSchema = z.enum(["public-demo", "self-hosted", "hosted"]);

export function readDeploymentPolicy(env: Readonly<Record<string, string | undefined>> = process.env) {
  const requestedMode = deploymentModeSchema.safeParse(env.SIGNALOPS_DEPLOYMENT_MODE ?? "public-demo");
  const requestedProviderAccess = enabledSchema.safeParse(env.AI_ENABLE_PROVIDER_REQUESTS);
  const mode = requestedMode.success ? requestedMode.data : "public-demo";
  const explicitlyEnabled = requestedProviderAccess.success && requestedProviderAccess.data === "true";
  const configurationValid = requestedMode.success && requestedProviderAccess.success &&
    !(mode !== "self-hosted" && explicitlyEnabled);

  return {
    mode,
    providerRequestsEnabled: Boolean(configurationValid && mode === "self-hosted" && explicitlyEnabled),
    configurationValid,
  } as const;
}

export function readAiConfiguration(env: Readonly<Record<string, string | undefined>> = process.env) {
  const deployment = readDeploymentPolicy(env);
  const enabled = enabledSchema.safeParse(env.AI_ALLOW_SERVER_KEY_TESTS);
  const selection = selectionSchema.safeParse({ provider: env.AI_PROVIDER, model: env.AI_MODEL });
  const hasSelection = Boolean(env.AI_PROVIDER || env.AI_MODEL);
  const key = selection.success ? keySchema.safeParse(env[keyVariables[selection.data.provider]]) : undefined;
  const valid = enabled.success && selection.success && key?.success;
  const publicConfiguration: PublicConfiguration = {
    status: !deployment.configurationValid ? "invalid" : !hasSelection && enabled.success ? "unconfigured" : valid ? "configured" : "invalid",
    selection: valid ? selection.data : undefined,
    serverTestsEnabled: Boolean(deployment.providerRequestsEnabled && valid && enabled.data === "true"),
    ...(env.AI_ALLOW_SERVER_KEY_INSIGHTS !== undefined ? { serverInsightsEnabled: Boolean(deployment.providerRequestsEnabled && valid && env.AI_ALLOW_SERVER_KEY_INSIGHTS === "true") } : {}),
    deployment,
  };
  return { publicConfiguration, credential: deployment.providerRequestsEnabled && valid ? key.data : undefined };
}

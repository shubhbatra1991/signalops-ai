/** Curated text-only allowlist, verified against official docs on 2026-10-12.
 * Availability remains account-dependent; these are not automatic fallbacks.
 */
export const providers = {
  openai: { label: "OpenAI", model: "gpt-4.1-mini", destination: "api.openai.com", docs: "https://developers.openai.com/api/docs/models/gpt-4.1-mini" },
  groq: { label: "Groq", model: "openai/gpt-oss-20b", destination: "api.groq.com", docs: "https://console.groq.com/docs/model/openai/gpt-oss-20b" },
  anthropic: { label: "Anthropic / Claude", model: "claude-sonnet-4-6", destination: "api.anthropic.com", docs: "https://platform.claude.com/docs/en/api/messages/create" },
  zai: { label: "Z.ai / GLM", model: "glm-4.7", destination: "api.z.ai", docs: "https://docs.z.ai/guides/llm/glm-4.7" },
} as const;
export type ProviderId = keyof typeof providers;
export const connectionPrompt = "Reply with the single word OK. This is a synthetic connection test.";
export const connectionTokenLimit = 32;

export function isProvider(value: string): value is ProviderId {
  return Object.hasOwn(providers, value);
}

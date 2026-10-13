import { afterEach, expect, test, vi } from "vitest";
vi.mock("server-only", () => ({}));
import { AiOutputError, groqMetadata, logOutputFailure } from "./diagnostics";
afterEach(() => { vi.restoreAllMocks(); vi.unstubAllEnvs(); });

test("metadata projects known finish reasons and numeric counts only", () => {
  expect(groqMetadata({ choices: [{ finish_reason: "secret-value" }], usage: { prompt_tokens: "secret-value", completion_tokens: -1, total_tokens: 12,
    completion_tokens_details: { reasoning_tokens: 3 }, secret: "do not log" } })).toEqual({ finishReason: "unknown", promptTokens: undefined, completionTokens: undefined, totalTokens: 12, reasoningTokens: 3 });
  expect(groqMetadata({})).toMatchObject({ finishReason: "unknown" });
});

test("detailed diagnostics are development-only and reject unconfigured model/invalid correlation IDs", () => {
  const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
  const error = new AiOutputError("invalid_insight", "JSON_PARSE_FAILED", "json_syntax");
  const id = "6a8f69fb-538a-4f2a-8ad7-3c17ff68381a";
  vi.stubEnv("NODE_ENV", "production"); logOutputFailure(error, "groq", "openai/gpt-oss-20b", id);
  vi.stubEnv("NODE_ENV", "development"); logOutputFailure(error, "groq", "secret-model", id); logOutputFailure(error, "groq", "openai/gpt-oss-20b", "secret-id");
  expect(warn).not.toHaveBeenCalled();
  logOutputFailure(error, "groq", "openai/gpt-oss-20b", id);
  expect(JSON.parse(String(warn.mock.calls[0][0]))).toEqual({ category: "JSON_PARSE_FAILED", rule: "json_syntax", provider: "groq", model: "openai/gpt-oss-20b", correlationId: id });
});

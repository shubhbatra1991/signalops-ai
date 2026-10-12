import { afterEach, beforeEach, expect, test, vi } from "vitest";
vi.mock("server-only", () => ({}));
import { generateText } from "./adapters";
import { readAiConfiguration } from "./configuration";
import { assertSameOrigin, configurationGet, connectionPost, createConnectionLimiter } from "./connection";
import { readBoundedJson } from "./transport";
import { connectionPrompt, providers, type ProviderId } from "@/features/ai/domain/providers";
import { connectionRequestSchema, selectionSchema } from "@/features/ai/domain/contracts";

const syntheticKey = "unit-test-value-not-a-credential";
const browserBody = { mode: "browser", provider: "openai", model: providers.openai.model, apiKey: syntheticKey };
function request(body: unknown = browserBody, headers: Record<string, string> = {}) {
  return new Request("http://localhost:3200/api/ai/connection", { method: "POST", headers: {
    Origin: "http://localhost:3200", "Content-Type": "application/json", "X-SignalOps-Action": "test-connection", ...headers,
  }, body: JSON.stringify(body) });
}
function providerResponse(provider: ProviderId) {
  if (provider === "openai") return { status: "completed", output: [{ type: "message", content: [{ type: "output_text", text: "OK" }] }] };
  if (provider === "anthropic") return { stop_reason: "end_turn", content: [{ type: "text", text: "OK" }] };
  return { choices: [{ finish_reason: "stop", message: { content: "OK" } }] };
}
let testClock = Date.parse("2050-01-01T00:00:00.000Z");
beforeEach(() => {
  vi.stubEnv("AI_APP_ORIGIN", ""); vi.stubEnv("AI_PROVIDER", ""); vi.stubEnv("AI_MODEL", ""); vi.stubEnv("AI_ALLOW_SERVER_KEY_TESTS", "false");
  // Distinct minute per test resets the shared minute budget without a test-only production reset API.
  vi.useFakeTimers(); testClock += 86_400_000; vi.setSystemTime(testClock);
  vi.spyOn(console, "info").mockImplementation(() => {}); vi.spyOn(console, "warn").mockImplementation(() => {});
});
afterEach(() => { vi.useRealTimers(); vi.unstubAllGlobals(); vi.unstubAllEnvs(); vi.restoreAllMocks(); });

test.each(Object.keys(providers) as ProviderId[])("%s adapter uses verified endpoint, auth and bounded synthetic request", async (provider) => {
  const fetchMock = vi.fn().mockResolvedValue(Response.json(providerResponse(provider)));
  vi.stubGlobal("fetch", fetchMock);
  expect(await generateText(provider, { model: providers[provider].model, apiKey: syntheticKey, prompt: connectionPrompt, maxOutputTokens: 32, signal: new AbortController().signal })).toEqual({ text: "OK" });
  const [url, init] = fetchMock.mock.calls[0];
  expect(new URL(url).protocol).toBe("https:"); expect(new URL(url).hostname).toBe(providers[provider].destination);
  expect(init.redirect).toBe("error"); expect(init.cache).toBe("no-store"); expect(init.credentials).toBe("omit");
  const body = JSON.parse(init.body);
  expect(body.model).toBe(providers[provider].model);
  expect(body.input ?? body.messages[0].content).toBe(connectionPrompt);
  expect(body.max_output_tokens ?? body.max_completion_tokens ?? body.max_tokens).toBe(32);
  expect(body.tools).toBeUndefined(); expect(body.stream).toBe(false);
  if (provider === "anthropic") { expect(init.headers["x-api-key"]).toBe(syntheticKey); expect(init.headers["anthropic-version"]).toBe("2023-06-01"); }
  else expect(init.headers.Authorization).toBe(`Bearer ${syntheticKey}`);
  if (provider === "openai") expect(body.store).toBe(false);
  if (provider === "zai") expect(body.thinking).toEqual({ type: "disabled" });
  if (provider === "groq") {
    expect(body.model).toBe("openai/gpt-oss-20b");
    expect(body.include_reasoning).toBe(false);
    expect(body.reasoning_effort).toBe("low");
    expect(body.reasoning_format).toBeUndefined();
  }
  expect(fetchMock).toHaveBeenCalledTimes(1);
});
test.each([["openai", "wrong-model"], ["groq", providers.openai.model], ["unknown", "x"], ["__proto__", "x"]])("rejects unsupported selection %s/%s", (provider, model) => {
  expect(selectionSchema.safeParse({ provider, model }).success).toBe(false);
});

test.each(["llama-3.1-8b-instant", "gpt-oss-20b", "openai/gpt-oss-120b"])("Groq rejects stale or unconfigured model %s without substitution", async (model) => {
  const mock = vi.fn(); vi.stubGlobal("fetch", mock);
  expect(selectionSchema.safeParse({ provider: "groq", model }).success).toBe(false);
  await expect(generateText("groq", { model, apiKey: syntheticKey, prompt: connectionPrompt, maxOutputTokens: 32, signal: new AbortController().signal })).rejects.toMatchObject({ code: "unsupported_model" });
  const response = await connectionPost(request({ ...browserBody, provider: "groq", model }));
  expect(await response.json()).toMatchObject({ ok: false, code: "unsupported_model" });
  expect(mock).not.toHaveBeenCalled();
});

test("Groq environment configuration accepts the exact prefixed ID and rejects the stale ID", () => {
  vi.stubEnv("AI_PROVIDER", "groq"); vi.stubEnv("GROQ_API_KEY", syntheticKey);
  vi.stubEnv("AI_MODEL", "openai/gpt-oss-20b");
  expect(readAiConfiguration().publicConfiguration).toMatchObject({ status: "configured", selection: { provider: "groq", model: "openai/gpt-oss-20b" } });
  vi.stubEnv("AI_MODEL", "llama-3.1-8b-instant");
  expect(readAiConfiguration().publicConfiguration.status).toBe("invalid");
});

test.each([
  [400, "model_decommissioned", "unsupported_model"], [400, "model_not_found", "unsupported_model"],
  [404, "", "unsupported_model"], [403, "model_not_found", "permission_denied"],
  [401, "model_decommissioned", "invalid_key"], [429, "model_not_found", "rate_limited"],
  [400, "invalid_request_error", "invalid_request"], [400, "", "invalid_request"],
])("Groq safely distinguishes HTTP %s / %s as %s", async (status, code, expected) => {
  const mock = vi.fn().mockResolvedValue(Response.json({ error: { code, message: syntheticKey, sensitive: "private-provider-payload" } }, { status: Number(status) }));
  vi.stubGlobal("fetch", mock);
  const response = await connectionPost(request({ ...browserBody, provider: "groq", model: "openai/gpt-oss-20b" }));
  const result = await response.json();
  expect(result).toMatchObject({ ok: false, code: expected });
  expect(JSON.stringify(result)).not.toMatch(/unit-test-value|private-provider-payload|model_decommissioned|model_not_found/);
  expect(JSON.stringify(vi.mocked(console.warn).mock.calls)).not.toContain(syntheticKey);
  expect(JSON.stringify(vi.mocked(console.warn).mock.calls)).not.toContain("private-provider-payload");
  expect(mock).toHaveBeenCalledTimes(1);
});
test.each(["url", "endpoint", "prompt", "evidence", "feedback", "events", "customerId", "maxOutputTokens"])("request cannot include %s", (field) => {
  expect(connectionRequestSchema.safeParse({ ...browserBody, [field]: "untrusted" }).success).toBe(false);
});
test.each(["", "with spaces", "line\nbreak", "x".repeat(1025)])("rejects malformed credential", (apiKey) => {
  expect(connectionRequestSchema.safeParse({ ...browserBody, apiKey }).success).toBe(false);
});
test("environment configuration is optional, validated and does not expose secrets", () => {
  expect(readAiConfiguration({}).publicConfiguration).toEqual({ status: "unconfigured", selection: undefined, serverTestsEnabled: false });
  const env = { AI_PROVIDER: "openai", AI_MODEL: providers.openai.model, OPENAI_API_KEY: syntheticKey };
  const result = readAiConfiguration(env);
  expect(result.publicConfiguration.status).toBe("configured"); expect(result.publicConfiguration.serverTestsEnabled).toBe(false);
  expect(JSON.stringify(result.publicConfiguration)).not.toContain(syntheticKey);
  expect(readAiConfiguration({ ...env, AI_ALLOW_SERVER_KEY_TESTS: "TRUE" }).publicConfiguration.status).toBe("invalid");
  expect(readAiConfiguration({ ...env, AI_MODEL: "wrong" }).credential).toBeUndefined();
});
test.each(["https://evil.invalid", "null", "http://localhost:3201"])("rejects cross-origin %s", async (Origin) => {
  const fetchMock = vi.fn(); vi.stubGlobal("fetch", fetchMock);
  expect((await connectionPost(request(browserBody, { Origin }))).status).toBe(403); expect(fetchMock).not.toHaveBeenCalled();
});
test("origin gate fails closed for missing origin, cross-site metadata, public host and invalid configured origin", () => {
  expect(() => assertSameOrigin(new Request("http://localhost:3200"))).toThrow();
  expect(() => assertSameOrigin(request(browserBody, { "Sec-Fetch-Site": "cross-site" }))).toThrow();
  expect(() => assertSameOrigin(new Request("https://public.invalid", { headers: { Origin: "https://public.invalid" } }), {})).toThrow();
  expect(() => assertSameOrigin(request(), { AI_APP_ORIGIN: "http://localhost:3200/path" })).toThrow();
  expect(() => assertSameOrigin(new Request("https://public.invalid", { headers: { Origin: "https://public.invalid" } }), { AI_APP_ORIGIN: "https://public.invalid" })).not.toThrow();
});
test("configuration GET allows browser fetch metadata and returns no server credential", async () => {
  vi.stubEnv("AI_PROVIDER", "openai"); vi.stubEnv("AI_MODEL", providers.openai.model); vi.stubEnv("OPENAI_API_KEY", syntheticKey);
  const response = configurationGet(new Request("http://localhost:3200/api/ai/connection", { headers: { "Sec-Fetch-Site": "same-origin", "X-SignalOps-Action": "configuration" } }));
  expect(response.status).toBe(200); expect(response.headers.get("Cache-Control")).toContain("no-store");
  expect(await response.text()).not.toContain(syntheticKey);
});
test("streamed byte limit applies without Content-Length", async () => {
  const body = new ReadableStream<Uint8Array>({ start(controller) { controller.enqueue(new Uint8Array(4097)); controller.close(); } });
  await expect(readBoundedJson(body, 4096, new AbortController().signal, "body_too_large")).rejects.toMatchObject({ code: "body_too_large" });
});
test("limiter bounds concurrency, minute/hour budgets and releases idempotently", () => {
  let time = 0; const take = createConnectionLimiter(() => time);
  const first = take(); const second = take(); expect(take).toThrow(); first(); first(); second(); take()(); expect(take).toThrow();
  time = 60_000; expect(() => take()()).not.toThrow();
  for (let index = 0; index < 16; index++) { time += 60_000; take()(); }
  time += 60_000; expect(take).toThrow(); time = 3_600_001; expect(() => take()()).not.toThrow();
});
test.each([[401, "", "invalid_key"], [402, "", "insufficient_credits"], [429, "1113", "insufficient_credits"], [429, "insufficient_quota", "insufficient_credits"], [403, "", "permission_denied"], [429, "", "rate_limited"], [503, "", "unavailable"], [400, "1211", "unsupported_model"], [400, "", "request_rejected"], [504, "", "timeout"]])("sanitizes provider status %s code %s", async (status, code, expected) => {
  const mock = vi.fn().mockResolvedValue(Response.json({ error: { code, message: syntheticKey } }, { status: Number(status) })); vi.stubGlobal("fetch", mock);
  await expect(generateText("openai", { model: providers.openai.model, apiKey: syntheticKey, prompt: connectionPrompt, maxOutputTokens: 32, signal: new AbortController().signal })).rejects.toMatchObject({ code: expected });
  expect(mock).toHaveBeenCalledTimes(1);
});
test.each([{}, { status: "incomplete", output: [] }, { status: "completed", output: [] }])("rejects malformed/empty/incomplete provider response", async (payload) => {
  vi.stubGlobal("fetch", vi.fn().mockResolvedValue(Response.json(payload)));
  await expect(generateText("openai", { model: providers.openai.model, apiKey: syntheticKey, prompt: connectionPrompt, maxOutputTokens: 32, signal: new AbortController().signal })).rejects.toMatchObject({ code: "malformed_response" });
});

test("Groq parses only final content and rejects truncated reasoning-model responses", async () => {
  const input = { model: "openai/gpt-oss-20b", apiKey: syntheticKey, prompt: connectionPrompt, maxOutputTokens: 32, signal: new AbortController().signal };
  const mock = vi.fn().mockResolvedValueOnce(Response.json({ choices: [{ finish_reason: "stop", message: { content: "OK", reasoning: "private-reasoning" } }] }))
    .mockResolvedValueOnce(Response.json({ choices: [{ finish_reason: "length", message: { content: "", reasoning: "private-reasoning" } }] }));
  vi.stubGlobal("fetch", mock);
  expect(await generateText("groq", input)).toEqual({ text: "OK" });
  await expect(generateText("groq", input)).rejects.toMatchObject({ code: "malformed_response" });
  expect(mock).toHaveBeenCalledTimes(2);
});
test("endpoint discards provider output and contains no evidence or credential in response/logs", async () => {
  // Advance past any earlier process-wide budget entries.
  const upstream = providerResponse("openai"); upstream.output?.[0].content.splice(0, 1, { type: "output_text", text: syntheticKey });
  const mock = vi.fn().mockResolvedValue(Response.json(upstream)); vi.stubGlobal("fetch", mock);
  const response = await connectionPost(request());
  expect(response.status).toBe(200); expect(response.headers.get("Cache-Control")).toContain("no-store");
  const text = await response.text(); expect(text).not.toContain(syntheticKey); expect(text).not.toContain("output");
  const sent = mock.mock.calls[0][1].body;
  for (const forbidden of ["feedback", "customer", "events", "flowpilot", "demo-"]) expect(sent.toLowerCase()).not.toContain(forbidden);
  expect(JSON.stringify(vi.mocked(console.info).mock.calls)).not.toContain(syntheticKey);
});
test("server-key use is disabled by default without provider fallback", async () => {
  const mock = vi.fn(); vi.stubGlobal("fetch", mock);
  const response = await connectionPost(request({ mode: "environment", provider: "openai", model: providers.openai.model }));
  expect(response.status).toBe(403); expect(mock).not.toHaveBeenCalled();
});
test.each([
  [{ ...browserBody, prompt: "ignored?" }, {}, 400],
  [{ ...browserBody, url: "https://evil.invalid" }, {}, 400],
  [{ ...browserBody, provider: "unsupported" }, {}, 400],
  [{ ...browserBody, model: "unsupported" }, {}, 400],
  [browserBody, { "X-SignalOps-Action": "" }, 400],
  [browserBody, { "Content-Type": "text/plain" }, 400],
  [browserBody, { "Content-Length": "4097" }, 413],
  [browserBody, { "Content-Encoding": "gzip" }, 400],
])("HTTP boundary rejects unapproved request without provider call", async (body, headers, status) => {
  const mock = vi.fn(); vi.stubGlobal("fetch", mock);
  expect((await connectionPost(request(body, headers))).status).toBe(status); expect(mock).not.toHaveBeenCalled();
});
test("server environment opt-in uses only matching validated selection and never returns its key", async () => {
  vi.stubEnv("AI_PROVIDER", "groq"); vi.stubEnv("AI_MODEL", providers.groq.model); vi.stubEnv("GROQ_API_KEY", syntheticKey); vi.stubEnv("AI_ALLOW_SERVER_KEY_TESTS", "true");
  const mock = vi.fn().mockResolvedValue(Response.json(providerResponse("groq"))); vi.stubGlobal("fetch", mock);
  const response = await connectionPost(request({ mode: "environment", provider: "groq", model: providers.groq.model }));
  expect(response.status).toBe(200); expect(await response.text()).not.toContain(syntheticKey);
  const rejected = await connectionPost(request({ mode: "environment", provider: "openai", model: providers.openai.model }));
  expect(rejected.status).toBe(403); expect(mock).toHaveBeenCalledTimes(1);
});
test("HTTP connection tests enforce shared minute budget without trusting forwarding headers", async () => {
  const mock = vi.fn().mockImplementation(async () => Response.json(providerResponse("openai"))); vi.stubGlobal("fetch", mock);
  for (let index = 0; index < 3; index++) expect((await connectionPost(request(browserBody, { "X-Forwarded-For": `fake-${index}` }))).status).toBe(200);
  const denied = await connectionPost(request()); expect(denied.status).toBe(429);
  expect((await denied.json()).code).toBe("local_rate_limit"); expect(mock).toHaveBeenCalledTimes(3);
});
test("malformed JSON is safely rejected, including chunked oversized HTTP bodies", async () => {
  const normal = request(); const headers = normal.headers;
  const bad = new Request(normal.url, { method: "POST", headers, body: "{" });
  expect((await connectionPost(bad)).status).toBe(400);
  const oversized = new Request(normal.url, { method: "POST", headers, body: "x".repeat(4097) });
  expect((await connectionPost(oversized)).status).toBe(413);
});
test("timeout aborts provider request once and safely returns timeout", async () => {
  vi.stubGlobal("fetch", vi.fn((_url, init: RequestInit) => new Promise((_resolve, reject) => {
    init.signal?.addEventListener("abort", () => reject(new DOMException("Secret must not leak", "AbortError")), { once: true });
  })));
  const timeout = vi.spyOn(AbortSignal, "timeout").mockImplementation(() => {
    const controller = new AbortController(); setTimeout(() => controller.abort(), 5); return controller.signal;
  });
  const pending = connectionPost(request());
  await vi.advanceTimersByTimeAsync(20);
  const response = await pending;
  expect((await response.json()).code).toBe("timeout"); expect(timeout).toHaveBeenCalled();
});

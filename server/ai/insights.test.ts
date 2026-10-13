import { afterEach, beforeEach, expect, test, vi } from "vitest";
vi.mock("server-only", () => ({}));
import { insightsPost } from "./insights";
import { connectionPost } from "./connection";
import { reconstructEvidence, readInsightOptions } from "./insight-evidence";
import { providers, type ProviderId } from "@/features/ai/domain/providers";
import { reviewResultSchema, insightResultSchema, type EvidenceSelection } from "@/features/ai/domain/insights";
import { createDemoDataset } from "@/server/modules/demo/dataset";

const key = "synthetic-test-value-not-a-credential";
const selection: EvidenceSelection = { project: "demo-project-flowpilot", range: "all", kind: "feedback", evidenceId: "integration-permissions" };
let clock = Date.parse("2051-01-01T00:00:00.000Z");
beforeEach(() => {
  vi.useFakeTimers(); clock += 86_400_000; vi.setSystemTime(clock);
  vi.stubEnv("AI_APP_ORIGIN", ""); vi.stubEnv("AI_ALLOW_SERVER_KEY_INSIGHTS", "false");
  vi.stubEnv("SIGNALOPS_DEPLOYMENT_MODE", "self-hosted"); vi.stubEnv("AI_ENABLE_PROVIDER_REQUESTS", "true");
  vi.spyOn(console, "info").mockImplementation(() => {}); vi.spyOn(console, "warn").mockImplementation(() => {});
});
afterEach(() => { vi.useRealTimers(); vi.restoreAllMocks(); vi.unstubAllGlobals(); vi.unstubAllEnvs(); });
function request(body: unknown, headers: Record<string, string> = {}, signal?: AbortSignal) {
  return new Request("http://localhost:3200/api/ai/insights", { method: "POST", headers: {
    Origin: "http://localhost:3200", "Content-Type": "application/json", "X-SignalOps-Action": "insights", ...headers,
  }, body: JSON.stringify(body), signal });
}
async function review(provider: ProviderId = "openai", chosen = selection, mode = "browser") {
  const response = await insightsPost(request({ action: "preview", mode, provider, model: providers[provider].model, selection: chosen }));
  const result = reviewResultSchema.parse(await response.json());
  if (!result.ok) throw new Error(result.code);
  return result.review;
}
function generate(ticket: string, provider: ProviderId = "openai", chosen = selection) {
  return { action: "generate", approved: true, ticket, selection: chosen,
    credentials: { mode: "browser", provider, model: providers[provider].model, apiKey: key } };
}
const draft = { title: "Explore integration guidance", evidenceReferenceIds: ["theme:integration-permissions"],
  hypotheses: ["Could permission guidance be confusing?"], limitations: ["Unknown whether guidance matches expectations."],
  recommendedAction: "Review permission guidance with volunteers." };
function providerBody(provider: ProviderId, text = JSON.stringify(draft)) {
  if (provider === "openai") return { status: "completed", output: [{ type: "message", content: [{ type: "output_text", text }] }] };
  if (provider === "anthropic") return { stop_reason: "end_turn", content: [{ type: "text", text }] };
  return { choices: [{ finish_reason: "stop", message: { content: text } }] };
}

test("trusted feedback reconstruction is deterministic, minimized and matches actual records", async () => {
  const evidence = await reconstructEvidence(selection);
  expect(await reconstructEvidence(selection)).toEqual(evidence);
  const records = createDemoDataset().feedback.filter((record) => record.themeIds.includes("integration-permissions"));
  expect(evidence.analytics).toMatchObject({ matchingRecords: records.length, distinctContributors: new Set(records.map((record) => record.customerId)).size });
  expect(evidence.facts[0].href).toContain("theme=integration-permissions");
  const serialized = JSON.stringify(evidence);
  expect(serialized).not.toMatch(/customerId|relatedEventIds|properties|displayName|"text"/);
  for (const record of records) { expect(serialized).not.toContain(record.text); expect(serialized).not.toContain(record.customerId); }
});
test.each(["public-demo", "hosted"] as const)("%s deployment rejects preview and generation directly without provider access", async (mode) => {
  const reviewed = await review();
  vi.stubEnv("SIGNALOPS_DEPLOYMENT_MODE", mode); vi.stubEnv("AI_ENABLE_PROVIDER_REQUESTS", "false");
  const mock = vi.fn(); vi.stubGlobal("fetch", mock);
  const preview = await insightsPost(request({ action: "preview", mode: "browser", provider: "openai", model: providers.openai.model, selection }));
  expect(preview.status).toBe(403); expect(await preview.json()).toMatchObject({ ok: false, code: "provider_requests_disabled" });
  const generation = await insightsPost(request(generate(reviewed.ticket)));
  expect(generation.status).toBe(403); expect(await generation.json()).toMatchObject({ ok: false, code: "provider_requests_disabled" });
  expect(mock).not.toHaveBeenCalled();
});
test("all offered opportunities and funnel issues reconstruct within their exact scope", async () => {
  const options = await readInsightOptions(); expect(options.options.length).toBeGreaterThan(10);
  for (const option of options.options) {
    const evidence = await reconstructEvidence(option.selection);
    expect(evidence.selection).toEqual(option.selection); expect(evidence.facts.length).toBeGreaterThan(0);
    if (option.selection.kind === "funnel") expect(evidence.analytics).toMatchObject({ algorithmVersion: "ordered-first-entry-v1" });
  }
});
test.each([
  { ...selection, project: "other-project" }, { ...selection, evidenceId: "invented" },
  { ...selection, kind: "funnel" as const }, { ...selection, range: "second-week" as const },
])("rejects missing/cross-project/out-of-window evidence %j", async (chosen) => {
  await expect(reconstructEvidence(chosen)).rejects.toMatchObject({ code: "invalid_evidence" });
});
test.each(Object.keys(providers) as ProviderId[])("%s uses common insight contract and verified structured mode", async (provider) => {
  const fetchMock = vi.fn().mockImplementation(async () => Response.json(providerBody(provider)));
  vi.stubGlobal("fetch", fetchMock);
  const reviewed = await review(provider);
  expect(fetchMock).not.toHaveBeenCalled(); expect(reviewed.prompt).not.toContain(key);
  const response = await insightsPost(request(generate(reviewed.ticket, provider)));
  expect(response.status).toBe(200); expect(response.headers.get("cache-control")).toContain("no-store");
  const result = insightResultSchema.parse(await response.json()); if (!result.ok) throw new Error(result.code);
  expect(result.insight.observation).toBe((await reconstructEvidence(selection)).facts[0].observation);
  expect(result.insight.provenance).toMatchObject({ provider, model: providers[provider].model, promptVersion: "insight-prompt-v1" });
  expect(result.insight.id).not.toBe(reviewed.ticket); expect(fetchMock).toHaveBeenCalledTimes(1);
  const body = JSON.parse(fetchMock.mock.calls[0][1].body);
  expect(body.input ?? body.messages[0].content).toBe(reviewed.prompt);
  expect(body.max_output_tokens ?? body.max_completion_tokens ?? body.max_tokens).toBe(1200);
  expect(body.tools).toBeUndefined();
  if (provider === "openai") expect(body.text.format).toEqual({ type: "json_schema", strict: true, name: "insight_draft", schema: reviewed.outputSchema });
  else if (provider === "anthropic") expect(body.output_config.format).toEqual({ type: "json_schema", schema: reviewed.outputSchema });
  else if (provider === "groq") expect(body.response_format).toEqual({ type: "json_schema", json_schema: { name: "insight_draft", strict: true, schema: reviewed.outputSchema } });
  else expect(body.response_format).toEqual({ type: "json_object" });
  if (provider === "groq") expect(body).toMatchObject({ model: "openai/gpt-oss-20b", include_reasoning: false, reasoning_effort: "low" });
  expect(JSON.stringify(result)).not.toContain(key);
  expect(JSON.stringify(vi.mocked(console.info).mock.calls)).not.toContain(key);
  expect(JSON.stringify(vi.mocked(console.info).mock.calls)).not.toContain("permission guidance");
});

test("Groq strict schema uses supported primitives, required fields and evidence enum; safe wording needs no fixed prefix", async () => {
  const naturalDraft = { ...draft, title: "Calendar guidance research", hypotheses: ["Might permission guidance be confusing?"],
    limitations: ["The impact remains unclear."], recommendedAction: "Interview volunteers about permission guidance." };
  vi.stubGlobal("fetch", vi.fn().mockResolvedValue(Response.json(providerBody("groq", JSON.stringify(naturalDraft)))));
  const reviewed = await review("groq");
  expect(reviewed.format).toBe("json-schema");
  expect(reviewed.outputSchema).toEqual({ type: "object", additionalProperties: false,
    properties: { title: { type: "string" }, evidenceReferenceIds: { type: "array", items: { type: "string", enum: ["theme:integration-permissions"] } },
      hypotheses: { type: "array", items: { type: "string" } }, limitations: { type: "array", items: { type: "string" } }, recommendedAction: { type: "string" } },
    required: ["title", "evidenceReferenceIds", "hypotheses", "limitations", "recommendedAction"] });
  expect(reviewed.maxOutputTokens).toBe(1200);
  const result = await (await insightsPost(request(generate(reviewed.ticket, "groq")))).json();
  expect(result).toMatchObject({ ok: true, insight: { title: naturalDraft.title, hypotheses: naturalDraft.hypotheses, recommendedAction: naturalDraft.recommendedAction } });
});

test("positive-feedback research accepts normal language but displays only application-owned observations and sources", async () => {
  const chosen = { ...selection, evidenceId: "report-value" };
  const output = { title: "Understanding positive report experiences", evidenceReferenceIds: ["theme:report-value"],
    hypotheses: ["Could report clarity build confidence?", "Might users return because the report supports planning?"],
    limitations: ["The reason for positive feedback remains unclear."], recommendedAction: "Conduct one-to-one interviews to understand what customers value." };
  vi.stubGlobal("fetch", vi.fn().mockResolvedValue(Response.json(providerBody("groq", JSON.stringify(output)))));
  const trusted = await reconstructEvidence(chosen);
  const reviewed = await review("groq", chosen);
  const response = await insightsPost(request(generate(reviewed.ticket, "groq", chosen)));
  const result = insightResultSchema.parse(await response.json());
  expect(result.ok).toBe(true); if (!result.ok) throw new Error(result.code);
  expect(result.insight.observation).toBe(trusted.facts[0].observation);
  expect(result.insight.sources).toEqual(trusted.facts);
  expect(result.insight.sources[0].href).toContain("theme=report-value");
  expect(result.insight.hypotheses).toEqual(output.hypotheses);
  expect(result.insight.observation).not.toContain("build confidence");
});

test.each([
  ["not JSON", "JSON_PARSE_FAILED", "json_syntax"],
  [JSON.stringify({ title: draft.title }), "SCHEMA_VALIDATION_FAILED", "field_shape_or_bounds"],
  [JSON.stringify({ ...draft, evidenceReferenceIds: ["invented-private-reference"] }), "EVIDENCE_REFERENCE_INVALID", "reference_membership_or_uniqueness"],
  [JSON.stringify({ ...draft, evidenceReferenceIds: [...draft.evidenceReferenceIds, ...draft.evidenceReferenceIds] }), "EVIDENCE_REFERENCE_INVALID", "reference_membership_or_uniqueness"],
  [JSON.stringify({ ...draft, title: "Explore ninety percent improvement" }), "LANGUAGE_CONSTRAINT_FAILED", "unsupported_numerical_claim"],
  [JSON.stringify({ ...draft, hypotheses: ["Guidance caused noncompletion?"] }), "LANGUAGE_CONSTRAINT_FAILED", "unsupported_causal_assertion"],
  [JSON.stringify({ ...draft, hypotheses: ["Guidance is confusing."] }), "LANGUAGE_CONSTRAINT_FAILED", "research_question"],
  [JSON.stringify({ ...draft, limitations: ["The evidence is conclusive."] }), "LANGUAGE_CONSTRAINT_FAILED", "explicit_uncertainty"],
])("Groq diagnostics distinguish %s without sensitive payloads", async (text, category, rule) => {
  vi.stubEnv("NODE_ENV", "development");
  const mock = vi.fn().mockResolvedValue(Response.json({ ...providerBody("groq", text), usage: { prompt_tokens: 800, completion_tokens: 150, total_tokens: 950, completion_tokens_details: { reasoning_tokens: 70 } } }));
  vi.stubGlobal("fetch", mock);
  const result = await (await insightsPost(request(generate((await review("groq")).ticket, "groq")))).json();
  expect(result).toMatchObject({ ok: false, code: "invalid_insight" });
  const diagnostic = JSON.parse(String(vi.mocked(console.warn).mock.calls[0][0]));
  expect(diagnostic).toEqual({ category, rule, provider: "groq", model: "openai/gpt-oss-20b", correlationId: result.requestId,
    finishReason: "stop", promptTokens: 800, completionTokens: 150, totalTokens: 950, reasoningTokens: 70 });
  const logs = JSON.stringify(vi.mocked(console.warn).mock.calls);
  for (const sensitive of [key, text, "theme:integration-permissions", "invented-private-reference", "promptVersion"]) expect(logs).not.toContain(sensitive);
  expect(JSON.stringify(result)).not.toContain(category); expect(mock).toHaveBeenCalledTimes(1);
});

test.each([
  ["length", "", 1200, 1200, "OUTPUT_TRUNCATED", "completion_limit"],
  ["length", '{"title":', 1200, 700, "OUTPUT_TRUNCATED", "completion_limit"],
  ["stop", "", 200, 200, "PROVIDER_RESPONSE_INCOMPLETE", "complete_final_content"],
  ["tool_calls", "", 100, 50, "PROVIDER_RESPONSE_INCOMPLETE", "complete_final_content"],
])("Groq finish %s with completion %s is diagnosed before parsing", async (finish, text, completion, reasoning, category, rule) => {
  vi.stubEnv("NODE_ENV", "development");
  vi.stubGlobal("fetch", vi.fn().mockResolvedValue(Response.json({ choices: [{ finish_reason: finish, message: { content: text, reasoning: "private-model-reasoning" } }],
    usage: { completion_tokens: completion, completion_tokens_details: { reasoning_tokens: reasoning } } })));
  const result = await (await insightsPost(request(generate((await review("groq")).ticket, "groq")))).json();
  expect(result).toMatchObject({ ok: false, code: "malformed_response" });
  expect(JSON.parse(String(vi.mocked(console.warn).mock.calls[0][0]))).toEqual({ category, rule, provider: "groq", model: "openai/gpt-oss-20b",
    correlationId: result.requestId, finishReason: finish, completionTokens: completion, reasoningTokens: reasoning });
  expect(JSON.stringify(vi.mocked(console.warn).mock.calls)).not.toContain("private-model-reasoning");
  expect(fetch).toHaveBeenCalledTimes(1);
});

test("Groq upstream errors remain sanitized with no validation diagnostics or retries", async () => {
  vi.stubEnv("NODE_ENV", "development");
  vi.stubGlobal("fetch", vi.fn().mockResolvedValue(Response.json({ error: { code: "invalid_api_key", message: key } }, { status: 401 })));
  const result = await (await insightsPost(request(generate((await review("groq")).ticket, "groq")))).json();
  expect(result).toMatchObject({ ok: false, code: "invalid_key" });
  const logs = JSON.stringify(vi.mocked(console.warn).mock.calls);
  expect(logs).not.toContain(key); expect(logs).not.toContain("category"); expect(fetch).toHaveBeenCalledTimes(1);
});

test("invalid Groq response envelope produces incomplete-provider diagnostics without raw body", async () => {
  vi.stubEnv("NODE_ENV", "development");
  vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response("private-invalid-envelope")));
  const result = await (await insightsPost(request(generate((await review("groq")).ticket, "groq")))).json();
  expect(result).toMatchObject({ ok: false, code: "malformed_response" });
  expect(JSON.parse(String(vi.mocked(console.warn).mock.calls[0][0]))).toMatchObject({ category: "PROVIDER_RESPONSE_INCOMPLETE", rule: "complete_final_content", correlationId: result.requestId });
  expect(JSON.stringify(vi.mocked(console.warn).mock.calls)).not.toContain("private-invalid-envelope");
});
test("tickets require fresh review and cannot replay", async () => {
  const fetchMock = vi.fn().mockImplementation(async () => Response.json(providerBody("openai"))); vi.stubGlobal("fetch", fetchMock);
  const reviewed = await review(); expect((await insightsPost(request(generate(reviewed.ticket)))).status).toBe(200);
  const replay = await insightsPost(request(generate(reviewed.ticket)));
  expect(await replay.json()).toMatchObject({ code: "review_expired" }); expect(fetchMock).toHaveBeenCalledTimes(1);
});
test.each(["provider", "scope", "mode", "expired"])("review invalidates on %s change", async (change) => {
  const fetchMock = vi.fn(); vi.stubGlobal("fetch", fetchMock); const reviewed = await review();
  let body: unknown = generate(reviewed.ticket);
  if (change === "provider") body = generate(reviewed.ticket, "groq");
  if (change === "scope") body = generate(reviewed.ticket, "openai", { ...selection, range: "first-week" });
  if (change === "mode") body = { ...generate(reviewed.ticket), credentials: { mode: "environment", provider: "openai", model: providers.openai.model } };
  if (change === "expired") vi.setSystemTime(clock + 300_001);
  expect(await (await insightsPost(request(body))).json()).toMatchObject({ ok: false, code: "review_expired" });
  expect(fetchMock).not.toHaveBeenCalled();
});
test.each([
  { ...draft, evidenceReferenceIds: ["invented"] }, { ...draft, evidenceReferenceIds: ["theme:integration-permissions", "theme:integration-permissions"] },
  { ...draft, observation: "Invented observation" }, { ...draft, title: "Explore 99 percent drop-off" },
  { ...draft, hypotheses: ["Poor guidance caused noncompletion."] }, { ...draft, confidence: 0.9 },
  { title: draft.title }, { ...draft, recommendedAction: `Review ${key}` },
])("rejects ungrounded, partial or secret-bearing output %j", async (output) => {
  vi.stubGlobal("fetch", vi.fn().mockImplementation(async () => Response.json(providerBody("openai", JSON.stringify(output)))));
  const reviewed = await review(); const response = await insightsPost(request(generate(reviewed.ticket)));
  expect(response.status).toBe(502); expect(await response.json()).toMatchObject({ code: "invalid_insight" });
  expect(JSON.stringify(vi.mocked(console.warn).mock.calls)).not.toContain(key);
});
test.each(["not JSON", "```json\n{}\n```", '{"title":'])('rejects malformed model JSON %s', async (text) => {
  vi.stubGlobal("fetch", vi.fn().mockImplementation(async () => Response.json(providerBody("openai", text))));
  expect(await (await insightsPost(request(generate((await review()).ticket)))).json()).toMatchObject({ code: "invalid_insight" });
});
test.each([401, 402, 429, 500, 400])("maps provider HTTP %s safely without retry", async (status) => {
  const fetchMock = vi.fn().mockImplementation(async () => Response.json({ error: { message: key } }, { status })); vi.stubGlobal("fetch", fetchMock);
  const response = await insightsPost(request(generate((await review()).ticket))); const result = await response.json();
  expect(result).toMatchObject({ ok: false }); expect(JSON.stringify(result)).not.toContain(key); expect(fetchMock).toHaveBeenCalledTimes(1);
});
test.each([
  { status: "incomplete", output: [] },
  { status: "completed", output: [{ type: "message", content: [{ type: "refusal", refusal: "no" }] }] },
])("handles incomplete outputs and explicit refusals", async (output) => {
  vi.stubGlobal("fetch", vi.fn().mockImplementation(async () => Response.json(output)));
  const result = await (await insightsPost(request(generate((await review()).ticket)))).json();
  expect(result.code).toBe(output.status === "incomplete" ? "malformed_response" : "refused");
});
test("timeout and cancellation accept no insight and do not retry", async () => {
  const reviewed = await review(); const controller = new AbortController();
  vi.stubGlobal("fetch", vi.fn().mockImplementation(async () => { controller.abort(); throw new DOMException("synthetic", "AbortError"); }));
  const response = await insightsPost(request(generate(reviewed.ticket), {}, controller.signal));
  expect(await response.json()).toMatchObject({ ok: false, code: "timeout" }); expect(fetch).toHaveBeenCalledTimes(1);
});
test("environment insight spending is separately disabled by default", async () => {
  vi.stubEnv("AI_PROVIDER", "openai"); vi.stubEnv("AI_MODEL", providers.openai.model); vi.stubEnv("OPENAI_API_KEY", key); vi.stubEnv("AI_ALLOW_SERVER_KEY_TESTS", "true");
  const fetchMock = vi.fn(); vi.stubGlobal("fetch", fetchMock); const reviewed = await review("openai", selection, "environment");
  const response = await insightsPost(request({ ...generate(reviewed.ticket), credentials: { mode: "environment", provider: "openai", model: providers.openai.model } }));
  expect(await response.json()).toMatchObject({ code: "configuration_unavailable" }); expect(fetchMock).not.toHaveBeenCalled();
});
test("explicit environment opt-in sends key only in provider authentication headers", async () => {
  vi.stubEnv("AI_PROVIDER", "openai"); vi.stubEnv("AI_MODEL", providers.openai.model); vi.stubEnv("OPENAI_API_KEY", key); vi.stubEnv("AI_ALLOW_SERVER_KEY_INSIGHTS", "true");
  const fetchMock = vi.fn().mockImplementation(async () => Response.json(providerBody("openai"))); vi.stubGlobal("fetch", fetchMock);
  const reviewed = await review("openai", selection, "environment");
  const response = await insightsPost(request({ ...generate(reviewed.ticket), credentials: { mode: "environment", provider: "openai", model: providers.openai.model } }));
  expect(response.status).toBe(200); expect(await response.text()).not.toContain(key);
  expect(fetchMock.mock.calls[0][1].headers.Authorization).toBe(`Bearer ${key}`); expect(fetchMock.mock.calls[0][1].body).not.toContain(key);
});
test.each(["evidence", "metrics", "prompt", "endpoint", "customerId"])("rejects arbitrary client %s", async (field) => {
  const response = await insightsPost(request({ action: "preview", mode: "browser", provider: "openai", model: providers.openai.model, selection, [field]: "untrusted" }));
  expect(await response.json()).toMatchObject({ code: "invalid_request" });
});
test("rejects unsupported models and cross-origin requests before provider calls", async () => {
  const body = { action: "preview", mode: "browser", provider: "openai", model: "unsupported", selection };
  expect(await (await insightsPost(request(body))).json()).toMatchObject({ code: "unsupported_model" });
  expect((await insightsPost(request(body, { Origin: "https://attacker.invalid" }))).status).toBe(403);
});

test.each(["llama-3.1-8b-instant", "gpt-oss-20b"])("insight preview rejects stale/unprefixed Groq model %s", async (model) => {
  const mock = vi.fn(); vi.stubGlobal("fetch", mock);
  const response = await insightsPost(request({ action: "preview", mode: "browser", provider: "groq", model, selection }));
  expect(await response.json()).toMatchObject({ ok: false, code: "unsupported_model" });
  expect(mock).not.toHaveBeenCalled();
});
test("applies body limit and the shared connection/insight attempt budget", async () => {
  expect((await insightsPost(request({ padding: "x".repeat(4100) }))).status).toBe(413);
  await insightsPost(request({})); await insightsPost(request({}));
  const response = await insightsPost(request({})); expect(response.status).toBe(429); expect(await response.json()).toMatchObject({ code: "local_rate_limit" });
});
test("connection tests and insight previews consume the same process budget", async () => {
  vi.stubGlobal("fetch", vi.fn().mockImplementation(async () => Response.json(providerBody("openai", "OK"))));
  await review(); await review();
  expect((await connectionPost(new Request("http://localhost:3200/api/ai/connection", { method: "POST", headers: {
    Origin: "http://localhost:3200", "Content-Type": "application/json", "X-SignalOps-Action": "test-connection",
  }, body: JSON.stringify({ mode: "browser", provider: "openai", model: providers.openai.model, apiKey: key }) }))).status).toBe(200);
  expect((await insightsPost(request({}))).status).toBe(429);
});
test("an elapsed generation deadline fails before contacting a provider", async () => {
  const reviewed = await review();
  const timeout = AbortSignal.timeout.bind(AbortSignal);
  vi.spyOn(AbortSignal, "timeout").mockImplementation((milliseconds) => milliseconds === 30_000 ? AbortSignal.abort(new DOMException("synthetic", "TimeoutError")) : timeout(milliseconds));
  const mock = vi.fn(); vi.stubGlobal("fetch", mock);
  expect(await (await insightsPost(request(generate(reviewed.ticket)))).json()).toMatchObject({ code: "timeout" });
  expect(mock).not.toHaveBeenCalled();
});

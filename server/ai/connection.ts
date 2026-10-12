import "server-only";
import { randomUUID } from "node:crypto";
import { connectionRequestSchema, selectionSchema } from "@/features/ai/domain/contracts";
import { connectionPrompt, connectionTokenLimit } from "@/features/ai/domain/providers";
import { readAiConfiguration } from "./configuration";
import { generateText } from "./adapters";
import { AiError } from "./errors";
import { readBoundedJson } from "./transport";
import { logServerEvent } from "@/server/observability/logger";

/** Shared process budget, no spoofable client/IP identity or unbounded key map.
 * Restarts/replicas reset/multiply it; production ingress controls are still necessary.
 */
export function createConnectionLimiter(now: () => number = () => Date.now()) {
  let attempts: number[] = [];
  let active = 0;
  return () => {
    const time = now();
    attempts = attempts.filter((at) => time - at < 3_600_000);
    if (active >= 2 || attempts.length >= 20 || attempts.filter((at) => time - at < 60_000).length >= 3) {
      throw new AiError("local_rate_limit", 429);
    }
    attempts.push(time);
    active++;
    let released = false;
    return () => { if (!released) { active--; released = true; } };
  };
}
export const takeBudget = createConnectionLimiter();
export function assertSameOrigin(request: Request, env: Readonly<Record<string, string | undefined>> = process.env) {
  const origin = request.headers.get("origin");
  const fetchSite = request.headers.get("sec-fetch-site");
  let expected: URL;
  try {
    expected = new URL(env.AI_APP_ORIGIN || new URL(request.url).origin);
  } catch { throw new AiError("forbidden", 403); }
  const local = ["localhost", "127.0.0.1", "[::1]"].includes(expected.hostname);
  if (expected.origin !== expected.href.replace(/\/$/, "") || expected.username || expected.password ||
      (!env.AI_APP_ORIGIN && !local) || !["http:", "https:"].includes(expected.protocol) || (!local && expected.protocol !== "https:") ||
      (origin !== expected.origin && !(request.method === "GET" && !origin && fetchSite === "same-origin")) ||
      (fetchSite !== null && fetchSite !== "same-origin")) {
    throw new AiError("forbidden", 403);
  }
}
export const responseHeaders = { "Cache-Control": "no-store, max-age=0", "Pragma": "no-cache", "X-Content-Type-Options": "nosniff", "Referrer-Policy": "no-referrer" };

export async function connectionPost(request: Request) {
  const requestId = randomUUID();
  let release: (() => void) | undefined;
  let signal: AbortSignal | undefined;
  try {
    assertSameOrigin(request);
    if (request.headers.get("x-signalops-action") !== "test-connection" ||
        request.headers.get("content-type")?.split(";")[0].trim() !== "application/json" ||
        request.headers.has("content-encoding") || new URL(request.url).search) throw new AiError("invalid_request", 400);
    release = takeBudget();
    const length = request.headers.get("content-length");
    if (length && (!/^\d+$/.test(length) || Number(length) > 4096)) throw new AiError("body_too_large", 413);
    const input = connectionRequestSchema.safeParse(await readBoundedJson(request.body, 4096,
      AbortSignal.any([request.signal, AbortSignal.timeout(3000)]), "body_too_large"));
    if (!input.success) throw new AiError("invalid_request", 400);
    if (!selectionSchema.safeParse({ provider: input.data.provider, model: input.data.model }).success) throw new AiError("unsupported_model", 400);
    let apiKey: string;
    if (input.data.mode === "browser") apiKey = input.data.apiKey;
    else {
      const config = readAiConfiguration();
      if (!config.credential || !config.publicConfiguration.serverTestsEnabled ||
          config.publicConfiguration.selection?.provider !== input.data.provider ||
          config.publicConfiguration.selection?.model !== input.data.model) throw new AiError("configuration_unavailable", 403);
      apiKey = config.credential;
    }
    signal = AbortSignal.any([request.signal, AbortSignal.timeout(12_000)]);
    // Never accept prompt/evidence/URL/token settings from the caller.
    await generateText(input.data.provider, { model: input.data.model, apiKey, prompt: connectionPrompt,
      maxOutputTokens: connectionTokenLimit, signal });
    logServerEvent("info", "ai.connection.succeeded", { requestId });
    // Provider-generated text/IDs/usage and headers deliberately never cross this boundary.
    return Response.json({ ok: true, provider: input.data.provider, model: input.data.model, requestId }, { headers: responseHeaders });
  } catch (error) {
    const safe = error instanceof AiError ? error : new AiError(signal?.aborted ||
      (error instanceof DOMException && ["TimeoutError", "AbortError"].includes(error.name)) ? "timeout" : "unavailable", 502);
    logServerEvent("warn", "ai.connection.failed", { requestId });
    return Response.json({ ok: false, code: safe.code, requestId }, { status: safe.status, headers: responseHeaders });
  } finally { release?.(); }
}
export function configurationGet(request: Request) {
  try {
    assertSameOrigin(request);
    if (request.headers.get("x-signalops-action") !== "configuration") throw new AiError("forbidden", 403);
    return Response.json(readAiConfiguration().publicConfiguration, { headers: responseHeaders });
  } catch {
    return Response.json({ status: "unconfigured", serverTestsEnabled: false }, { status: 403, headers: responseHeaders });
  }
}

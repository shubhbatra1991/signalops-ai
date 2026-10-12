import "server-only";
import { z } from "zod";
import { AiError } from "./errors";
import type { ProviderId } from "@/features/ai/domain/providers";

/** Bounds actual streamed bytes, including chunked bodies and incorrect length headers. */
export async function readBoundedJson(stream: ReadableStream<Uint8Array> | null, limit: number, signal: AbortSignal, oversized: "body_too_large" | "malformed_response"): Promise<unknown> {
  if (!stream) throw new AiError(oversized === "body_too_large" ? "invalid_request" : "malformed_response", oversized === "body_too_large" ? 400 : 502);
  const reader = stream.getReader();
  const chunks: Uint8Array[] = [];
  let total = 0;
  const abort = () => { void reader.cancel().catch(() => {}); };
  signal.addEventListener("abort", abort, { once: true });
  try {
    signal.throwIfAborted();
    while (true) {
      const chunk = await reader.read();
      signal.throwIfAborted();
      if (chunk.done) break;
      total += chunk.value.byteLength;
      if (total > limit) throw new AiError(oversized, oversized === "body_too_large" ? 413 : 502);
      chunks.push(chunk.value);
    }
    const bytes = new Uint8Array(total);
    let offset = 0;
    for (const chunk of chunks) { bytes.set(chunk, offset); offset += chunk.byteLength; }
    try { return JSON.parse(new TextDecoder("utf-8", { fatal: true }).decode(bytes)); }
    catch { throw new AiError(oversized === "body_too_large" ? "invalid_request" : "malformed_response", oversized === "body_too_large" ? 400 : 502); }
  } finally {
    signal.removeEventListener("abort", abort);
    void reader.cancel().catch(() => {});
    reader.releaseLock();
  }
}

const errorSchema = z.object({ error: z.object({ code: z.union([z.string(), z.number()]).optional(), type: z.string().optional() }) });
function providerFailure(status: number, body: unknown, provider?: ProviderId): AiError {
  const parsed = errorSchema.safeParse(body);
  const code = parsed.success ? String(parsed.data.error.code ?? parsed.data.error.type ?? "") : "";
  // Groq model lifecycle codes can accompany HTTP 400. Never inspect error messages;
  // authentication/permission/rate statuses take precedence over ambiguous model codes.
  if (provider === "groq") {
    if (status === 401) return new AiError("invalid_key");
    if (status === 403) return new AiError("permission_denied");
    if (status === 429) return new AiError("rate_limited");
    if (status === 404 || (status === 400 && ["model_decommissioned", "model_not_found"].includes(code))) return new AiError("unsupported_model");
    if (status === 400) return new AiError("invalid_request");
  }
  if (status === 401) return new AiError("invalid_key");
  if (status === 402 || ["insufficient_quota", "billing_error", "1113"].includes(code)) return new AiError("insufficient_credits");
  if (["model_not_found", "1211"].includes(code) || status === 404) return new AiError("unsupported_model");
  if (status === 403) return new AiError("permission_denied");
  if (status === 429) return new AiError("rate_limited");
  if (status === 408 || status === 504) return new AiError("timeout", 504);
  return new AiError(status >= 500 ? "unavailable" : "request_rejected");
}

/** Private to adapters: endpoints are constants, redirects are forbidden. */
export async function providerJson(url: string, headers: Record<string, string>, body: object, signal: AbortSignal, provider?: ProviderId) {
  const response = await fetch(url, { method: "POST", headers: { "Content-Type": "application/json", ...headers },
    body: JSON.stringify(body), signal, cache: "no-store", redirect: "error", credentials: "omit" });
  let payload: unknown;
  try { payload = await readBoundedJson(response.body, 65_536, signal, "malformed_response"); }
  catch (error) { if (!response.ok && !signal.aborted) throw providerFailure(response.status, undefined, provider); throw error; }
  if (!response.ok) throw providerFailure(response.status, payload, provider);
  return payload;
}

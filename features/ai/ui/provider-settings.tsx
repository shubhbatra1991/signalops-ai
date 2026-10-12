"use client";
import { useEffect, useRef, useState, type FormEvent } from "react";
import { connectionResultSchema, errorMessages } from "../domain/contracts";
import { connectionPrompt, isProvider, providers } from "../domain/providers";
import { useAiSession } from "./ai-session";

export function ProviderSettings() {
  const { session, configure, disconnect, configuration, configurationFailed, credentials } = useAiSession();
  const { mode, provider, model, apiKey } = session;
  const hasKey = Boolean(apiKey);
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState("No provider selected. Nothing has been sent.");
  const [error, setError] = useState(false);
  const activeRequest = useRef<AbortController | null>(null);
  useEffect(() => () => { activeRequest.current?.abort(); }, []);
  function clear() {
    activeRequest.current?.abort(); activeRequest.current = null;
    disconnect(); setBusy(false); setError(false);
    setNotice("Disconnected. Browser key and selection cleared. Server environment configuration is unchanged.");
  }
  function changeMode(value: string) {
    clear();
    if (value === "environment") {
      configure({ mode: "environment", provider: configuration?.selection?.provider ?? "", model: configuration?.selection?.model ?? "" });
      setNotice("Server environment selected. No credential is returned to this browser.");
    }
  }
  async function testConnection(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const credential = credentials();
    if (!provider || busy || !credential) return;
    const controller = new AbortController(); activeRequest.current = controller;
    setBusy(true); setError(false); setNotice("Testing with the synthetic prompt only…");
    try {
      const response = await fetch("/api/ai/connection", { method: "POST", cache: "no-store", credentials: "omit",
        headers: { "Content-Type": "application/json", "X-SignalOps-Action": "test-connection" },
        body: JSON.stringify(credential),
        signal: AbortSignal.any([controller.signal, AbortSignal.timeout(18_000)]) });
      const result = connectionResultSchema.safeParse(await response.json());
      if (!result.success) throw new Error();
      if (controller.signal.aborted) return;
      setError(!result.data.ok);
      setNotice(result.data.ok ? "Connection verified with a synthetic request. No feedback, events or customer evidence was sent. This does not verify future insight quality." : `${errorMessages[result.data.code]} Reference: ${result.data.requestId}`);
    } catch {
      if (!controller.signal.aborted) { setError(true); setNotice("Connection test could not complete. Check connectivity or retry manually. No automatic retry was made."); }
    } finally {
      if (activeRequest.current === controller) { activeRequest.current = null; setBusy(false); }
    }
  }
  const selected = provider ? providers[provider] : undefined;
  return <section className="analytics-card ai-settings" aria-labelledby="ai-provider-heading">
    <h2 id="ai-provider-heading">AI Provider</h2>
    <p>Bring your own API key. Connection testing sends only the synthetic prompt below through this self-hosted server to your selected provider. Provider charges may apply.</p>
    <p className="data-notice">Connection tests send no feedback, events or customer evidence. AI Insights separately requires an evidence review and explicit approval for each generation.</p>
    <p>Server configuration: {configurationFailed ? "unavailable — check application origin configuration" : !configuration ? "checking…" : configuration.status === "configured" ? `configured · ${configuration.serverTestsEnabled ? "connection tests enabled" : "browser-triggered tests disabled"}` : configuration.status}.</p>
    <form onSubmit={testConnection} aria-label="AI provider configuration" className="ai-provider-form">
      <label>Configuration mode<select value={mode} onChange={(event) => changeMode(event.target.value)} disabled={busy}>
        <option value="browser">Browser memory only</option><option value="environment" disabled={!configuration?.serverTestsEnabled && !configuration?.serverInsightsEnabled}>Server environment</option>
      </select></label>
      <label>Provider<select value={provider} disabled={busy || mode === "environment"} onChange={(event) => {
        clear(); const value = event.target.value; if (isProvider(value)) { configure({ provider: value, model: providers[value].model }); setNotice("Provider selected; connection has not been tested."); }
      }} required><option value="">Select a provider</option>{Object.entries(providers).map(([id, item]) => <option key={id} value={id}>{item.label}</option>)}</select></label>
      <label>Model<select value={model} disabled={busy || !selected || mode === "environment"} onChange={(event) => { configure({ model: event.target.value }); setNotice("Model selected; connection has not been tested."); }} required>
        {!selected && <option value="">Select a provider first</option>}{selected && <option value={selected.model}>{selected.model}</option>}
      </select></label>
      {mode === "browser" && <label>API key<input value={apiKey} type="password" autoComplete="off" spellCheck={false} maxLength={1024} disabled={busy} required aria-describedby="key-handling" onChange={(event) => { configure({ apiKey: event.target.value }); setNotice("Browser key entered; connection has not been tested."); setError(false); }} /></label>}
      <p id="key-handling">Browser keys stay only in this application session’s memory across client navigation. Disconnect or full reload clears them. Explicit tests or approved insight requests send them through this server. Do not save them in a password manager. The host and browser extensions must be trusted; this is not a zero-retention claim.</p>
      {mode === "environment" && <p>Operator-enabled insight generation: {configuration?.serverInsightsEnabled ? "enabled" : "disabled"}. Selecting this mode explicitly permits use of the operator’s credential; each insight still needs its own approval.</p>}
      <div className="filter-actions"><button type="submit" className="primary-button" disabled={busy || !selected || (mode === "browser" ? !hasKey : !configuration?.serverTestsEnabled)}>{busy ? "Testing…" : "Test connection"}</button><button type="button" className="secondary-button" onClick={clear}>Disconnect / Clear</button></div>
    </form>
    <p role={error ? "alert" : "status"} aria-live="polite">{notice}</p>
    {selected && <p>Destination: <strong>{selected.destination}</strong> · <a className="text-link" href={selected.docs} target="_blank" rel="noreferrer">Official model documentation</a>. Curated text-only model; account availability and provider limits vary. No fallback.</p>}
    <h3>Connection-test payload</h3><blockquote>{connectionPrompt}</blockquote>
    <p>One request, maximum 32 output tokens, no tools, no automatic retries. Provider response text is discarded on the server.</p>
    <p className="warning-note">This endpoint has no authentication. Instance limits are shared by all visitors and reset on restart. Keep environment-key tests disabled on public deployments; use trusted ingress restrictions and provider spend limits.</p>
  </section>;
}

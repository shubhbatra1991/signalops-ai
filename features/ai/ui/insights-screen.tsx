"use client";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { errorMessages } from "../domain/contracts";
import { insightResultSchema, reviewResultSchema, type EvidenceSelection, type InsightOptions, type InsightReview } from "../domain/insights";
import { providers } from "../domain/providers";
import { presets } from "@/features/customer-intelligence/domain/explorer";
import { useAiSession } from "./ai-session";

export function InsightsScreen({ options }: { options: InsightOptions }) {
  const { session, credentials, configuration, insights } = useAiSession();
  const [project, setProject] = useState(options.projects[0]?.id ?? "");
  const [range, setRange] = useState<EvidenceSelection["range"]>("all");
  const [evidenceId, setEvidenceId] = useState("");
  const [regeneration, setRegeneration] = useState(0);
  const available = options.options.filter((item) => item.selection.project === project && item.selection.range === range);
  const chosen = available.find((item) => `${item.selection.kind}:${item.selection.evidenceId}` === evidenceId) ?? available[0];
  const configured = Boolean(credentials()) && (session.mode === "browser" || Boolean(configuration?.serverInsightsEnabled));
  return <>
    <div className="page-heading"><div><p className="eyebrow">Evidence-led research</p><h1>AI Insights</h1><p className="page-description">Review fictional evidence, then request a research draft from your chosen provider.</p></div></div>
    <p className="data-notice">Demonstration data only. No generated results exist until you approve a request. Observations are calculated; AI questions and actions remain unverified.</p>
    <section className="analytics-card ai-settings" aria-labelledby="evidence-heading">
      <h2 id="evidence-heading">Select evidence</h2>
      {!configured && <p role="status">No provider is ready for insights. <Link className="text-link" href="/settings">Configure an AI provider in Settings</Link>. Analytics remain available without AI.</p>}
      {session.provider && <p>Provider: {providers[session.provider].label} · {session.model} · {session.mode === "browser" ? "browser memory only" : "server environment"}.</p>}
      <div className="ai-provider-form">
        <label>Project<select value={project} onChange={(event) => { setProject(event.target.value); setEvidenceId(""); }}>{options.projects.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select></label>
        <label>UTC date range<select value={range} onChange={(event) => {
          const selected = presets.find((preset) => preset.id === event.target.value);
          if (selected) { setRange(selected.id); setEvidenceId(""); }
        }}>{presets.map((preset) => <option key={preset.id} value={preset.id}>{preset.label}</option>)}</select></label>
        <label>Opportunity or funnel issue<select value={chosen ? `${chosen.selection.kind}:${chosen.selection.evidenceId}` : ""} onChange={(event) => setEvidenceId(event.target.value)} disabled={!chosen}>
          {!chosen && <option value="">No eligible evidence</option>}{available.map((item) => <option key={`${item.selection.kind}:${item.selection.evidenceId}`} value={`${item.selection.kind}:${item.selection.evidenceId}`}>{item.label}</option>)}
        </select></label>
      </div>
      {chosen ? <InsightInteraction key={`${session.revision}:${JSON.stringify(chosen.selection)}:${regeneration}`} selection={chosen.selection} configured={configured} /> : <p>No recurring feedback opportunity or observed funnel noncompletion in this window. Try another date range.</p>}
    </section>
    <section className="opportunity-section" aria-labelledby="drafts-heading"><h2 id="drafts-heading">Session drafts</h2>
      <p>At most five drafts are kept in application memory. Disconnect or full reload clears them. Nothing is saved to a database.</p>
      {insights.length === 0 && <p>No AI-generated insights yet. Review evidence above to begin.</p>}
      <div className="opportunity-grid">{insights.map((insight) => <article key={insight.id} className="analytics-card insight-card">
        <p className="eyebrow">AI-generated research draft · requires human review</p><h3>{insight.title}</h3>
        <p className="insight-provenance">{providers[insight.provenance.provider].label} · {insight.provenance.model}<br /><time dateTime={insight.generatedAt}>{insight.generatedAt}</time> · {insight.provenance.promptVersion} · {insight.provenance.datasetVersion}</p>
        <h4>Observed evidence · deterministic</h4><p>{insight.observation}</p>
        <ul className="evidence-links">{insight.sources.map((source) => <li key={source.id}><Link className="text-link" href={source.href}>{source.id}</Link></li>)}</ul>
        <h4>Hypotheses · unverified questions</h4><ul>{insight.hypotheses.map((text, index) => <li key={index}>{text}</li>)}</ul>
        <h4>Limitations and unknowns</h4><ul>{insight.limitations.map((text, index) => <li key={index}>{text}</li>)}</ul>
        <h4>Suggested action · AI-generated</h4><p>{insight.recommendedAction}</p>
        <button className="secondary-button" onClick={() => { setProject(insight.selection.project); setRange(insight.selection.range); setEvidenceId(`${insight.selection.kind}:${insight.selection.evidenceId}`); setRegeneration((previous) => previous + 1); document.getElementById("evidence-heading")?.scrollIntoView({ block: "start" }); }}>Select evidence to regenerate</button>
        <p>Review and approve again above before another request.</p>
      </article>)}</div>
    </section>
  </>;
}

function InsightInteraction({ selection, configured }: { selection: EvidenceSelection; configured: boolean }) {
  const { session, credentials, addInsight } = useAiSession();
  const [review, setReview] = useState<InsightReview>();
  const [approved, setApproved] = useState(false);
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState("");
  const [failed, setFailed] = useState(false);
  const active = useRef<AbortController | null>(null);
  const dialog = useRef<HTMLDialogElement>(null);
  const reviewButton = useRef<HTMLButtonElement>(null);
  useEffect(() => () => {
    active.current?.abort(); active.current = null;
    // Next keeps inactive routes in Activity: discard consent, retain only the layout session.
    setReview(undefined); setApproved(false); setBusy(false);
  }, []);
  useEffect(() => {
    const element = dialog.current;
    const button = reviewButton.current;
    if (review) element?.showModal();
    return () => { element?.close(); if (review) button?.focus(); };
  }, [review]);
  function closeReview() { setReview(undefined); setApproved(false); }
  function cancel() {
    active.current?.abort(); active.current = null; setBusy(false); closeReview();
    setFailed(false); setNotice("Cancelled locally. An in-flight provider request may still incur charges. Review again to retry.");
  }
  async function request(kind: "preview" | "generate") {
    const credential = credentials();
    if (!session.provider || !configured || busy || (kind === "generate" && (!review || !approved || !credential))) return;
    const controller = new AbortController(); active.current = controller;
    const body = kind === "preview" ? { action: "preview", mode: session.mode, selection, provider: session.provider, model: session.model } :
      { action: "generate", selection, credentials: credential, approved: true, ticket: review?.ticket };
    if (kind === "generate") closeReview();
    setBusy(true); setFailed(false); setNotice(kind === "preview" ? "Reconstructing evidence locally; no provider call…" : "Generating from approved evidence…");
    try {
      const response = await fetch("/api/ai/insights", { method: "POST", cache: "no-store", credentials: "omit",
        headers: { "Content-Type": "application/json", "X-SignalOps-Action": "insights" }, body: JSON.stringify(body),
        signal: AbortSignal.any([controller.signal, AbortSignal.timeout(40_000)]) });
      const result = (kind === "preview" ? reviewResultSchema : insightResultSchema).safeParse(await response.json());
      if (!result.success) throw new Error();
      if (controller.signal.aborted) return;
      if (!result.data.ok) { setFailed(true); setNotice(`${errorMessages[result.data.code]} Reference: ${result.data.requestId}`); return; }
      if ("review" in result.data) { setApproved(false); setReview(result.data.review); setNotice("Evidence ready for review. Nothing has been sent to a provider."); }
      else { addInsight(result.data.insight); setNotice("Research draft generated. Review its sources and limitations before acting."); }
    } catch {
      if (!controller.signal.aborted) { setFailed(true); setNotice("The request could not complete. No result was accepted. Review again to retry; no automatic retry was made."); }
    } finally { if (active.current === controller) { active.current = null; setBusy(false); } }
  }
  return <div className="insight-interaction">
    <div className="filter-actions"><button ref={reviewButton} className="primary-button" disabled={!configured || busy} onClick={() => void request("preview")}>Review evidence before sending</button>{busy && <button className="secondary-button" onClick={cancel}>Cancel request</button>}</div>
    <p role={failed ? "alert" : "status"} aria-live="polite">{notice}</p>
    <dialog ref={dialog} aria-labelledby="review-heading" aria-describedby="review-privacy" className="insight-review" onCancel={(event) => { event.preventDefault(); closeReview(); }}>
      {review && <><h2 id="review-heading">Review this exact transmission</h2>
        <p>{providers[review.provider].label} · {review.model} · {review.destination}</p>
        <p id="review-privacy">Fictional demonstration aggregates and reference metadata. No raw feedback text, customer IDs or event properties. This host forwards the request; provider policies and charges apply. No zero-retention guarantee.</p>
        <p>Mode: {session.mode === "browser" ? "your browser-memory key" : "operator’s server credential"}. Output cap: {review.maxOutputTokens} tokens · {review.format}. Approval expires at {review.expiresAt}.</p>
        <h3>Exact prompt, evidence and output contract</h3><pre tabIndex={0} aria-label="Exact provider prompt">{review.prompt}</pre>
        <details><summary>Transport format and schema</summary><pre tabIndex={0}>{JSON.stringify({ format: review.format, outputSchema: review.outputSchema, maxOutputTokens: review.maxOutputTokens, digest: review.digest }, null, 2)}</pre></details>
        <label className="approval-control"><input type="checkbox" checked={approved} onChange={(event) => setApproved(event.target.checked)} />I reviewed this payload and approve sending it to this provider using the selected credential, including potential charges and provider processing.</label>
        <div className="filter-actions"><button className="primary-button" disabled={!approved || busy} onClick={() => void request("generate")}>Approve and generate</button><button className="secondary-button" onClick={closeReview} autoFocus>Cancel review</button></div>
      </>}
    </dialog>
  </div>;
}

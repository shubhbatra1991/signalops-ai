"use client";
import Link from "next/link";
import { MissionDetail } from "./mission-detail";
import { useEffect, useMemo, useRef, useState } from "react";
import { useAiSession } from "@/features/ai/ui/ai-session";
import { browserMissionRepository, missionStorageKey, type MissionSnapshot } from "../domain/repository";
import { createMission, updateMission, priorities, statuses, sources, unresolvedReferences, referenceKey, type Mission, type MissionInput, type MissionContext } from "../domain/missions";

const statusLabel = { backlog: "Backlog", in_progress: "In Progress", completed: "Completed", cancelled: "Cancelled" };
const blank = (projectId: string): MissionInput => ({ projectId, title: "", objective: "", status: "backlog", priority: "medium", source: "manual", references: [], successCriteria: "", measurementPlan: { metric: "", baselineReference: "", evaluation: "" } });

export function MissionsScreen({ context, seed = {} }: { context: MissionContext; seed?: Record<string, string> }) {
  const { insights } = useAiSession();
  const repository = useMemo(() => browserMissionRepository(() => window.localStorage), []);
  const [snapshot, setSnapshot] = useState<MissionSnapshot>({ missions: [], writable: false, message: "Loading local missions…" });
  const [ready, setReady] = useState(false);
  const [notice, setNotice] = useState("");
  const [editing, setEditing] = useState<Mission | null | undefined>();
  const [draft, setDraft] = useState<MissionInput>(() => blank(context.projects[0]?.id ?? ""));
  const [confirmed, setConfirmed] = useState(false);
  const [view, setView] = useState<"board" | "list">("board");
  const [filters, setFilters] = useState({ q: "", project: "", priority: "", status: "", source: "" });
  const [resetting, setResetting] = useState(false);
  const [detailId, setDetailId] = useState<string>();
  const detailTrigger = useRef<HTMLElement | null>(null);
  const editor = useRef<HTMLDialogElement>(null);
  const resetDialog = useRef<HTMLDialogElement>(null);
  const returnFocus = useRef<HTMLElement | null>(null);
  useEffect(() => {
    let active = true;
    const load = () => { const next = repository.load(); queueMicrotask(() => { if (active) { setSnapshot(next); setReady(true); } }); };
    load();
    if (window.matchMedia?.("(max-width: 767px)").matches) queueMicrotask(() => { if (active) setView("list"); });
    const changed = (event: StorageEvent) => { if (event.key === missionStorageKey || event.key === null) load(); };
    window.addEventListener("storage", changed);
    return () => { active = false; window.removeEventListener("storage", changed); };
  }, [repository]);
  useEffect(() => {
    const element = editor.current;
    if (editing !== undefined) element?.showModal();
    else returnFocus.current?.focus();
    return () => { element?.close(); };
  }, [editing]);
  useEffect(() => { const element = resetDialog.current; if (resetting) element?.showModal(); return () => { element?.close(); }; }, [resetting]);
  function close() {
    editor.current?.close();
    setEditing(undefined);
    setConfirmed(false);
  }
  function open(input: MissionInput, mission: Mission | null = null, trigger?: HTMLElement) {
    returnFocus.current = trigger ?? (document.activeElement instanceof HTMLElement ? document.activeElement : null);
    setDraft(input); setEditing(mission); setConfirmed(false); setNotice("");
  }
  const linked = context.evidence.find((item) => item.reference.kind === seed.source && item.reference.project === seed.project && item.reference.range === seed.range && item.reference.evidenceId === seed.evidence);
  const insight = insights.find((item) => item.id === seed.insight);
  function fromEvidence(item: MissionContext["evidence"][number]) {
    open({ ...blank(item.reference.project), source: item.reference.kind, title: item.label, objective: "Investigate this observed demonstration opportunity.", references: [item.reference],
      measurementPlan: { metric: "", baselineReference: item.reference.id, evaluation: "" } });
  }
  function fromInsight(item: typeof insights[number]) {
    const references = item.evidenceReferenceIds.map((id) => ({ ...item.selection, id }));
    if (unresolvedReferences({ ...blank(item.selection.project), references }, context).length) { setNotice("This draft's evidence is stale or unavailable. No mission was saved."); return; }
    open({ ...blank(item.selection.project), source: "ai_insight", title: item.title, objective: item.recommendedAction, references,
      provenance: { insightId: item.id, ...item.provenance, generatedAt: item.generatedAt } });
  }
  function persist(missions: Mission[]) {
    try { setSnapshot(repository.save(missions)); setNotice("Mission saved on this browser/device."); return true; }
    catch { setNotice("Save failed: storage is unavailable, full or changed. Reload before retrying. Previous data was preserved."); return false; }
  }
  function save(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!confirmed || !snapshot.writable) return;
    if (editing && snapshot.missions.find((item) => item.id === editing.id)?.updatedAt !== editing.updatedAt) { setNotice("This mission changed in another tab. Cancel and reopen it before saving."); return; }
    if (draft.source === "ai_insight" && editing === null && !insights.some((item) => item.id === draft.provenance?.insightId)) { setNotice("The memory-only AI draft is no longer available. Nothing was saved; create a manual mission instead."); return; }
    try {
      const now = new Date().toISOString();
      const mission = editing ? updateMission(editing, draft, context, now) : createMission(draft, context, crypto.randomUUID(), now);
      if (persist(editing ? snapshot.missions.map((item) => item.id === mission.id ? mission : item) : [mission, ...snapshot.missions])) close();
    } catch { setNotice("Review required fields, source/project evidence and limits. Do not include credentials or private data. Nothing was saved."); }
  }
  function changeStatus(mission: Mission, status: Mission["status"]) {
    try { const changed = updateMission(mission, { ...inputOf(mission), status }, context, new Date().toISOString()); persist(snapshot.missions.map((item) => item.id === mission.id ? changed : item)); }
    catch { setNotice("Mission evidence is unavailable or invalid. Review the mission before changing its status."); }
  }
  const filtered = snapshot.missions.filter((item) => (!filters.project || item.projectId === filters.project) && (!filters.priority || item.priority === filters.priority) &&
    (!filters.status || item.status === filters.status) && (!filters.source || item.source === filters.source) && `${item.title} ${item.objective}`.toLowerCase().includes(filters.q.toLowerCase()))
    .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt) || a.id.localeCompare(b.id));
  const archive = filters.status === "cancelled";
  const visible = filtered.filter((mission) => archive ? mission.status === "cancelled" : mission.status !== "cancelled");
  const detail = snapshot.missions.find((mission) => mission.id === detailId);
  function closeDetail() { setDetailId(undefined); detailTrigger.current?.focus(); }
  function card(mission: Mission) {
    const stale = unresolvedReferences(mission, context).length > 0 || !context.projects.some((project) => project.id === mission.projectId);
    return <article className="analytics-card mission-card" key={mission.id}>
      <p className="mission-card-meta"><span>{mission.priority} priority</span><span>{mission.source === "ai_insight" ? "AI proposal" : mission.source}</span></p>
      <h3>{mission.title}</h3>
      <p className="mission-objective">{mission.objective.length > 140 ? `${mission.objective.slice(0, 140)}…` : mission.objective}</p>
      <p className="mission-evidence-indicator">{stale ? "Evidence unresolved" : mission.references.length ? `${mission.references.length} linked evidence reference${mission.references.length === 1 ? "" : "s"}` : "Manual · no linked evidence"}</p>
      <div className="mission-card-actions">
        <button className="secondary-button" onClick={() => { detailTrigger.current = document.activeElement instanceof HTMLElement ? document.activeElement : null; setDetailId(mission.id); }} aria-label={`View details for ${mission.title}`}>View details</button>
        <label>Status for {mission.title}<select value={mission.status} disabled={!snapshot.writable || stale} onChange={(event) => { const status = statuses.find((value) => value === event.target.value); if (status) changeStatus(mission, status); }}>{statuses.map((status) => <option value={status} key={status}>{statusLabel[status]}</option>)}</select></label>
      </div>
    </article>;
  }
  return <>
    <div className="page-heading"><div><p className="eyebrow">Evidence to action</p><h1>Product Missions</h1><p className="page-description">Plan and track research work against fictional product evidence.</p></div><button className="primary-button" disabled={!ready || !snapshot.writable} onClick={(event) => open(blank(context.projects[0]?.id ?? ""), null, event.currentTarget)}>New Mission</button></div>
    <p className="data-notice">Demo evidence · Missions are stored only on this browser/device, not synced or backed up. Do not enter credentials, feedback excerpts or private customer data. Completion does not establish a successful outcome.</p>
    <p role="status">{notice || snapshot.message}</p>
    <section className="analytics-card mission-sources" aria-labelledby="mission-sources"><h2 id="mission-sources">Create from evidence or a reviewed draft</h2>
      {seed.source && !linked && <p className="warning-note">The requested evidence scope is unavailable. No source was substituted.</p>}
      {linked && <button className="secondary-button" disabled={!snapshot.writable} onClick={() => fromEvidence(linked)}>Review linked {linked.label}</button>}
      {seed.insight && !insight && <p className="warning-note">This memory-only insight draft is no longer available. No regeneration or mission creation occurred.</p>}
      {insight && <button className="secondary-button" disabled={!snapshot.writable} onClick={() => fromInsight(insight)}>Review linked AI proposal</button>}
      <label>Demonstration opportunity<select defaultValue="" onChange={(event) => { const item = context.evidence.find((candidate) => referenceKey(candidate.reference) === event.target.value); if (item && snapshot.writable) fromEvidence(item); event.target.value = ""; }} disabled={!snapshot.writable}><option value="">Choose feedback or funnel evidence</option>{context.evidence.map((item) => <option key={referenceKey(item.reference)} value={referenceKey(item.reference)}>{item.label} · {item.reference.range}</option>)}</select></label>
      {insights.map((item) => <button className="secondary-button" disabled={!snapshot.writable} key={item.id} onClick={() => fromInsight(item)}>Review AI proposal: {item.title}</button>)}
      <p>Project-wide UTC scope; filtered customer subsets are not implied. AI is optional. Nothing is saved until you review, edit and confirm.</p>
    </section>
    <div className="analytics-filters mission-filters" role="search" aria-label="Mission filters">
      <label>Search missions<input type="search" maxLength={160} value={filters.q} onChange={(event) => setFilters({ ...filters, q: event.target.value })} /></label>
      <label>Project<select value={filters.project} onChange={(event) => setFilters({ ...filters, project: event.target.value })}><option value="">All projects</option>{context.projects.map((project) => <option key={project.id} value={project.id}>{project.name}</option>)}</select></label>
      {(["priority", "status", "source"] as const).map((key) => <label key={key}>{key[0].toUpperCase() + key.slice(1)}<select value={filters[key]} onChange={(event) => setFilters({ ...filters, [key]: event.target.value })}><option value="">All {key} values</option>{(key === "priority" ? priorities : key === "status" ? statuses : sources).map((value) => <option key={value} value={value}>{value}</option>)}</select></label>)}
      <button className="secondary-button" onClick={() => setFilters({ q: "", project: "", priority: "", status: "", source: "" })}>Reset filters</button>
      <label>Mission view<select value={view} onChange={(event) => setView(event.target.value === "list" ? "list" : "board")}><option value="board">Board</option><option value="list">List</option></select></label>
    </div>
    <div className="mission-workspace-heading">
      <h2>{archive ? "Cancelled missions" : "Active missions"}</h2>
      <button className="secondary-button" aria-pressed={archive} onClick={() => setFilters({ ...filters, status: archive ? "" : "cancelled" })}>{archive ? "Back to active missions" : `Cancelled archive (${snapshot.missions.filter((mission) => mission.status === "cancelled").length})`}</button>
    </div>
    <p className="mission-count-note">Column counts reflect the current search and filters. Completed work does not establish positive impact.</p>
    {ready && visible.length === 0 && <section className="empty-panel"><h2>No missions in this selection</h2><p>Create a mission or reset filters. No sample work items are invented.</p></section>}
    {view === "list" || archive ? <section className="mission-list" aria-label={archive ? "Cancelled missions" : "Mission list"}>{visible.map(card)}</section> : <div className="mission-board" role="region" aria-label="Mission board — Backlog, In Progress and Completed" tabIndex={0}>{(["backlog", "in_progress", "completed"] as const).map((status) => {
      const missions = visible.filter((mission) => mission.status === status);
      return <section key={status} aria-label={statusLabel[status]}><h2>{statusLabel[status]} <span className="mission-count" aria-label={`${missions.length} mission${missions.length === 1 ? "" : "s"}`}>{missions.length}</span></h2>{missions.map(card)}{!missions.length && <p className="mission-column-empty">No {statusLabel[status].toLowerCase()} missions.</p>}</section>;
    })}</div>}
    {detail && <MissionDetail mission={detail} context={context} onClose={closeDetail} onEdit={() => { setDetailId(undefined); open(inputOf(detail), detail); returnFocus.current = detailTrigger.current; }} />}
    <button className="secondary-button" disabled={!ready} onClick={() => { returnFocus.current = document.activeElement instanceof HTMLElement ? document.activeElement : null; setResetting(true); }}>Reset local missions</button>
    <dialog className="insight-review mission-editor" ref={editor} aria-labelledby="mission-editor-heading" onCancel={close}>
      {editing !== undefined && <form onSubmit={save}><h2 id="mission-editor-heading">{editing ? "Edit mission" : "Review new mission"}</h2><p>Source: {draft.source}. This saves edited user-approved fields only. AI proposals are unverified. No credentials, raw prompts or feedback text are copied.</p>
        <div className="mission-form"><label>Mission project<select value={draft.projectId} disabled={draft.source !== "manual" || Boolean(editing)} onChange={(event) => setDraft({ ...draft, projectId: event.target.value })}>{context.projects.map((project) => <option key={project.id} value={project.id}>{project.name}</option>)}</select></label>
          <label>Mission title<input required minLength={3} maxLength={160} value={draft.title} onChange={(event) => setDraft({ ...draft, title: event.target.value })} /></label>
          <label>Objective<textarea required minLength={5} maxLength={1200} value={draft.objective} onChange={(event) => setDraft({ ...draft, objective: event.target.value })} /></label>
          <label>Success criteria<textarea required minLength={5} maxLength={1200} value={draft.successCriteria} onChange={(event) => setDraft({ ...draft, successCriteria: event.target.value })} /></label>
          <label>Mission priority<select value={draft.priority} onChange={(event) => { const priority = priorities.find((item) => item === event.target.value); if (priority) setDraft({ ...draft, priority }); }}>{priorities.map((priority) => <option key={priority}>{priority}</option>)}</select></label>
          <label>Mission status<select value={draft.status} onChange={(event) => { const status = statuses.find((item) => item === event.target.value); if (status) setDraft({ ...draft, status }); }}>{statuses.map((status) => <option value={status} key={status}>{statusLabel[status]}</option>)}</select></label>
          {(["metric", "baselineReference", "evaluation"] as const).map((field) => <label key={field}>{field === "metric" ? "Metric or evidence to monitor" : field === "baselineReference" ? "Baseline reference" : "Planned evaluation approach"}<textarea maxLength={field === "evaluation" ? 800 : 300} value={draft.measurementPlan?.[field] ?? ""} onChange={(event) => setDraft({ ...draft, measurementPlan: { metric: "", baselineReference: "", evaluation: "", ...draft.measurementPlan, [field]: event.target.value } })} /></label>)}
        </div>
        {draft.references.map((reference) => { const item = context.evidence.find((candidate) => referenceKey(candidate.reference) === referenceKey(reference)); return <p key={referenceKey(reference)}>{item ? <><Link href={item.href} className="text-link">{reference.id}</Link> · {reference.range}<br />Current calculated baseline (not saved as AI prose): {item.baseline}</> : "Warning: source evidence is stale or unresolved. Saving is blocked."}</p>; })}
        {draft.provenance && <p>AI proposal provenance: {draft.provenance.provider} / {draft.provenance.model} · {draft.provenance.generatedAt}</p>}
        <label className="approval-control"><input type="checkbox" checked={confirmed} onChange={(event) => setConfirmed(event.target.checked)} />I reviewed these fields and evidence and confirm saving this mission on this browser/device.</label>
        <p role="status" className="status-message">{notice}</p><div className="filter-actions"><button className="primary-button" type="submit" disabled={!confirmed || !snapshot.writable || unresolvedReferences(draft, context).length > 0}>Save mission</button><button className="secondary-button" type="button" onClick={close}>Cancel</button></div>
      </form>}
    </dialog>
    <dialog ref={resetDialog} className="insight-review" aria-labelledby="reset-missions-heading" onCancel={() => { setResetting(false); returnFocus.current?.focus(); }}><h2 id="reset-missions-heading">Reset all local missions?</h2><p>This removes mission data on this browser/device, including unreadable or unknown-version data. It cannot be undone. AI session and theme preferences are separate.</p><div className="filter-actions"><button className="secondary-button" onClick={() => { setResetting(false); returnFocus.current?.focus(); }}>Keep missions</button><button className="primary-button" onClick={() => { try { setSnapshot(repository.reset()); setNotice("Local missions reset."); setResetting(false); returnFocus.current?.focus(); } catch { setNotice("Reset failed. Storage is unavailable."); } }}>Confirm reset</button></div></dialog>
  </>;
}

function inputOf(mission: Mission): MissionInput {
  return { projectId: mission.projectId, title: mission.title, objective: mission.objective, status: mission.status, priority: mission.priority,
    source: mission.source, references: mission.references, ...(mission.provenance ? { provenance: mission.provenance } : {}), successCriteria: mission.successCriteria,
    ...(mission.measurementPlan ? { measurementPlan: mission.measurementPlan } : {}) };
}

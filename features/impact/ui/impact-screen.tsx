"use client";
import Link from "next/link";
import { useEffect, useState } from "react";
import { browserMissionRepository, missionStorageKey, type MissionSnapshot } from "@/features/missions/domain/repository";
import { evaluateMission, type Comparison, type ImpactContext, type MissionEvaluation } from "../domain/impact";
import { missionEvaluationFingerprint } from "../domain/impact";
import { browserEvaluationRepository, impactStorageKey, toEvaluationRecord, type EvaluationRecord, type EvaluationSnapshot } from "../domain/repository";

function label(status: string) { return status.replaceAll("_", " "); }

export function ComparisonDetail({ result }: { result: Comparison }) {
  const values = [result.baseline.value, result.comparison.value];
  const maximum = Math.max(...values.map((value) => value ?? 0), 1);
  return <>
    <p><strong>{label(result.status)}</strong> · {result.baseline.metric.kind === "event_count" ? "Events" : "Distinct customers with matching events"}</p>
    <div className="impact-table-scroll"><table className="impact-table"><caption>UTC measurements · start inclusive, end exclusive</caption>
      <thead><tr><th scope="col">Period</th><th scope="col">UTC window</th><th scope="col">Value</th></tr></thead>
      <tbody>{([result.baseline, result.comparison]).map((measurement, index) => <tr key={index}><th scope="row">{index === 0 ? "Baseline" : "Comparison"}</th><td><time>{measurement.period.start}</time><span> to </span><time>{measurement.period.end}</time></td><td>{measurement.value ?? "Unavailable"}</td></tr>)}</tbody>
    </table></div>
    <div className="impact-bars" aria-hidden="true">{values.map((value, index) => <div key={index}><span>{index === 0 ? "Baseline" : "Comparison"}</span><div className="impact-bar" style={{ width: `${(value ?? 0) / maximum * 100}%` }} /></div>)}</div>
    <p>Absolute change: <strong>{result.absoluteChange === null ? "Unavailable" : `${result.absoluteChange > 0 ? "+" : ""}${result.absoluteChange}`}</strong> · Relative change: <strong>{result.relativeChange === null ? "Undefined / unavailable" : `${result.relativeChange > 0 ? "+" : ""}${result.relativeChange.toFixed(2)}%`}</strong></p>
    <p>Calculated {result.evaluatedAt} · {result.baseline.metric.datasetVersion} · {result.baseline.metric.algorithmVersion}</p>
    <h3>Measurement limitations</h3><ul>{result.limitations.map((limitation) => <li key={limitation}>{limitation}</li>)}</ul>
    {([result.baseline, result.comparison]).map((measurement, index) => <details key={index}><summary>{index === 0 ? "Baseline" : "Comparison"} source evidence ({measurement.evidence.length} events)</summary>
      {!measurement.evidence.length && <p>{measurement.status === "available" ? "No matching events in this covered window." : "Evidence unavailable."}</p>}
      <ul className="impact-evidence">{measurement.evidence.map((reference) => <li key={reference.id}><Link className="text-link" href={reference.href}>{reference.id}</Link> · <time>{reference.occurredAt}</time></li>)}</ul>
    </details>)}
  </>;
}

export function ImpactScreen({ context, initialMission = "" }: { context: ImpactContext; initialMission?: string }) {
  const [snapshot, setSnapshot] = useState<MissionSnapshot>({ missions: [], writable: false, message: "" });
  const [history, setHistory] = useState<EvaluationSnapshot>({ evaluations: [], writable: false, message: "" });
  const [loaded, setLoaded] = useState(false);
  const [optionId, setOptionId] = useState(context.options[0]?.id ?? "");
  const [selectedId, setSelectedId] = useState(initialMission);
  useEffect(() => {
    const repository = browserMissionRepository(() => window.localStorage);
    const evaluationRepository = browserEvaluationRepository(() => window.localStorage);
    function load() { setSnapshot(repository.load()); setHistory(evaluationRepository.load()); setLoaded(true); }
    load();
    function refresh(event: StorageEvent) { if (event.key === missionStorageKey || event.key === impactStorageKey || event.key === null) load(); }
    window.addEventListener("storage", refresh);
    window.addEventListener("focus", load);
    return () => { window.removeEventListener("storage", refresh); window.removeEventListener("focus", load); };
  }, []);
  const completed = snapshot.missions.filter((mission) => mission.status === "completed");
  const mission = completed.find((item) => item.id === selectedId);
  const option = context.options.find((item) => item.id === optionId);
  const latest = new Map<string, EvaluationRecord>();
  for (const record of history.evaluations) latest.set(record.missionId, record);
  function restoredEvaluation(item: typeof completed[number]): { evaluation?: MissionEvaluation; stale: boolean; record?: EvaluationRecord } {
    const record = latest.get(item.id);
    if (!record) return { stale: false };
    const selected = context.options.find((candidate) => candidate.id === record.optionId);
    if (!selected || record.missionFingerprint !== missionEvaluationFingerprint(item)) return { stale: true, record };
    const evaluation = evaluateMission(item, selected, context, record.evaluatedAt);
    return evaluation.status === record.status ? { evaluation, stale: false, record } : { stale: true, record };
  }
  const current = mission ? restoredEvaluation(mission) : { stale: false };
  const evaluation = current.evaluation;
  const measured = completed.filter((item) => restoredEvaluation(item).evaluation?.result).length;
  const unavailable = completed.filter((item) => {
    const restored = restoredEvaluation(item); return Boolean(restored.record && !restored.stale && !restored.evaluation?.result);
  }).length;
  const historical = snapshot.missions.filter((item) => item.status !== "completed" && latest.has(item.id));
  return <div className="impact-workspace">
    <div className="page-heading"><div><p className="eyebrow">Demonstration evidence · no live measurements</p><h1>Impact Analytics</h1><p className="page-description">Review observed changes separately from completed work. Completion never verifies success.</p></div></div>
    <p className="warning-note">Fictional dataset: {context.coverage.start} to {context.coverage.end} (exclusive). New local missions have no verified post-completion results. No AI measurements or provider calls.</p>
    <section aria-label="Evaluation overview" className="impact-summary">
      {[ ["Completed missions", completed.length], ["Not evaluated", completed.length - measured - unavailable], ["Observed comparisons", measured], ["Evidence unavailable or incompatible", unavailable] ].map(([name, count]) => <div className="impact-panel" key={name}><p>{name}</p><strong>{loaded ? count : "Loading…"}</strong></div>)}
    </section>
    {(snapshot.message || history.message) && <p role="status" className="status-message">{snapshot.message || history.message}</p>}
    <section className="impact-panel" aria-labelledby="impact-missions-heading"><h2 id="impact-missions-heading">Completed missions</h2>
      <p>Read-only review of browser-local records. Validated evaluation history is restored on this browser/device; mission records are never changed here.</p>
      {!loaded ? <p role="status" className="status-message">Loading local missions…</p> : !completed.length ? <p>No completed missions on this browser. <Link className="text-link" href="/app/missions">Open Missions</Link> to review work; no outcomes are invented.</p> : <ul className="impact-mission-list">{completed.map((item) => { const restored = restoredEvaluation(item); return <li key={item.id}><button className="secondary-button" aria-pressed={selectedId === item.id} onClick={() => setSelectedId(item.id)}>{item.title}</button><span className="status-chip">{restored.stale ? "stale evaluation — re-evaluate" : label(restored.evaluation?.status ?? "not_evaluated")}</span></li>; })}</ul>}
      {historical.length > 0 && <details><summary>Evaluation history for reopened or cancelled missions ({historical.length})</summary><ul>{historical.map((item) => <li key={item.id}><strong>{item.title}</strong> · current status {label(item.status)} · previous evaluation retained as history and no longer current</li>)}</ul></details>}
      {loaded && selectedId && !mission && <p role="status">Selected mission is unavailable or not completed. No evaluation was assigned.</p>}
      {mission && <section className="impact-mission-detail" aria-labelledby="impact-mission-title"><h3 id="impact-mission-title">{mission.title}</h3><p>Completed: <time>{mission.completedAt}</time> · Work state only</p><p>{mission.objective}</p>
        <p>Planned metric (user text, not a measured statistic): {mission.measurementPlan?.metric || "Not specified"}</p>
        <p>Source references: {mission.references.length}. <Link className="text-link" href={`/app/missions?project=${encodeURIComponent(mission.projectId)}`}>Review mission and source evidence</Link></p>
        <p>Select a metric below, then explicitly check whether its windows support this mission. Historical results cannot be applied unless the baseline precedes completion and the comparison follows it.</p>
        {current.stale && <p className="warning-note" role="status">The mission status, success criteria, measurement plan or evidence changed after this evaluation. The previous record remains in history; re-evaluation is required.</p>}
        <button className="primary-button" disabled={!option || !history.writable} onClick={() => { if (!option) return; const next = evaluateMission(mission, option, context, new Date().toISOString()); const record = toEvaluationRecord(next, missionEvaluationFingerprint(mission), option.id, crypto.randomUUID()); const repository = browserEvaluationRepository(() => window.localStorage); const loadedHistory = repository.load(); try { setHistory(repository.save([...loadedHistory.evaluations, record])); } catch (error) { setHistory({ ...loadedHistory, writable: false, message: error instanceof Error ? error.message : "Evaluation could not be saved." }); } }}>Evaluate selected windows</button>
        <div aria-live="polite">{evaluation && <><h3>Mission evaluation: {label(evaluation.status)}</h3>{evaluation.result ? <ComparisonDetail result={evaluation.result} /> : <ul>{evaluation.limitations.map((limitation) => <li key={limitation}>{limitation}</li>)}</ul>}<p>Reviewed {evaluation.evaluatedAt}. This does not establish mission success.</p></>}</div>
      </section>}
    </section>
    <section className="impact-panel" aria-labelledby="historical-impact-heading"><h2 id="historical-impact-heading">Historical demo comparison · not a mission outcome</h2>
      <p>Two equal seven-day UTC windows from existing records. June 15 is excluded so exposure lengths match. These measurements describe activity, not an intervention.</p>
      <label className="impact-metric-label" htmlFor="impact-metric">Metric and event population</label><select id="impact-metric" value={optionId} onChange={(event) => setOptionId(event.target.value)}>{context.options.map((item) => <option key={item.id} value={item.id}>{item.label}</option>)}</select>
      <p>Event count counts matching records. Unique active customers counts distinct existing customer IDs with matching events. Both windows use the same eligible project population; no cohort filters, conversion rates or arbitrary metric text are inferred.</p>
      {option ? <ComparisonDetail result={option.result} /> : <p>No compatible measurements available.</p>}
    </section>
  </div>;
}

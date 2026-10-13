"use client";
import Link from "next/link";
import { useEffect, useRef } from "react";
import { referenceKey, unresolvedReferences, type Mission, type MissionContext } from "../domain/missions";
import { AppIcon } from "@/features/icons/app-icon";

export function MissionDetail({ mission, context, onClose, onEdit }: {
  mission: Mission; context: MissionContext; onClose: () => void; onEdit: () => void;
}) {
  const dialog = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const element = dialog.current;
    element?.showModal();
    return () => element?.close();
  }, []);
  function close() { dialog.current?.close(); onClose(); }
  return <dialog ref={dialog} className="insight-review mission-editor mission-detail" aria-labelledby="mission-detail-heading" onCancel={close}>
    <div className="mission-detail-heading"><h2 id="mission-detail-heading">{mission.title}</h2><button className="secondary-button" onClick={close}>Close details</button></div>
    <p>{mission.priority} priority · {mission.source} · {mission.status.replaceAll("_", " ")}</p>
    <h3>Objective</h3><p>{mission.objective}</p>
    <h3>Success criteria</h3><p>{mission.successCriteria}</p>
    {mission.status === "completed" && <p className="warning-note icon-message"><AppIcon name="warning" size={18} />Work marked completed; positive impact has not been verified.</p>}
    {mission.status === "completed" && <Link className="text-link icon-link" href={`/demo/impact?mission=${mission.id}`}><AppIcon name="evidence" size={16} />Review measurement evidence</Link>}
    <h3>Measurement plan</h3>
    <dl>{(["metric", "baselineReference", "evaluation"] as const).map((key) => <div key={key}><dt>{key === "metric" ? "Metric or evidence to monitor" : key === "baselineReference" ? "Baseline reference" : "Planned evaluation approach"}</dt><dd>{mission.measurementPlan?.[key] || "Not specified"}</dd></div>)}</dl>
    <h3>Source evidence</h3>
    {unresolvedReferences(mission, context).length > 0 && <p className="warning-note icon-message"><AppIcon name="warning" size={18} />Source evidence is stale or unavailable. Stored references were preserved.</p>}
    {!mission.references.length && <p>Manual mission · no linked source evidence.</p>}
    <ul className="evidence-links">{mission.references.map((reference) => {
      const item = context.evidence.find((candidate) => referenceKey(candidate.reference) === referenceKey(reference));
      return <li key={referenceKey(reference)}>{item ? <><Link className="text-link icon-link" href={item.href}><AppIcon name="evidence" size={16} />{reference.id} · {reference.range}</Link> · <Link className="text-link" href={item.eventsHref}>Related project events</Link><p>Current calculated baseline: {item.baseline}</p></> : <span>{reference.id} · {reference.range} · unresolved</span>}</li>;
    })}</ul>
    {mission.provenance && <><h3>Reviewed AI proposal · unverified wording</h3><dl>{Object.entries(mission.provenance).map(([key, value]) => <div key={key}><dt>{key}</dt><dd>{value}</dd></div>)}</dl></>}
    <h3>Record details</h3>
    <dl><div><dt>Mission ID</dt><dd>{mission.id}</dd></div><div><dt>Project</dt><dd>{context.projects.find((project) => project.id === mission.projectId)?.name ?? mission.projectId}</dd></div><div><dt>Created</dt><dd><time dateTime={mission.createdAt}>{mission.createdAt}</time></dd></div><div><dt>Updated</dt><dd><time dateTime={mission.updatedAt}>{mission.updatedAt}</time></dd></div>{mission.completedAt && <div><dt>Completed</dt><dd><time dateTime={mission.completedAt}>{mission.completedAt}</time></dd></div>}</dl>
    <button className="primary-button" onClick={() => { dialog.current?.close(); onEdit(); }}>Edit {mission.title}</button>
  </dialog>;
}

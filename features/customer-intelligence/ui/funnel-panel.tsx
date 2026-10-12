import type { DemoScreenModel } from "@/server/modules/demo/read-demo-screen";

export function FunnelPanel({ model }: { model: DemoScreenModel }) {
  const { funnel } = model;
  if (!funnel) return <section className="empty-panel"><h2>No configured funnel</h2><p>This project has no configured demonstration funnel.</p></section>;
  return <>
    <section className="analytics-card"><div className="card-heading"><div><h2>{funnel.name}</h2><p>{funnel.entrants} unique entrants · {funnel.completed} completed</p></div><strong className="conversion-total">{funnel.conversionRate.toFixed(1)}%<span>overall conversion</span></strong></div>
      {funnel.entrants === 0 && <p role="status" className="warning-note">No first-step entrants in this selection. Conversion and drop-off rates are 0.0% because their denominators are zero.</p>}
      <ol className="funnel-steps">{funnel.steps.map((step) => <li key={step.stepId}><div className="step-heading"><span className="step-number">{step.position}</span><div><h3>{step.name}</h3><code>{step.eventName}</code></div><strong>{step.customers}<span>unique users</span></strong></div><progress value={step.customers} max={funnel.entrants || 1} aria-label={`${step.name}: ${step.customers} of ${funnel.entrants} entrants`} />
        <p>{step.conversionRate.toFixed(1)}% of entrants · {step.stepConversionRate.toFixed(1)}% from {step.position === 1 ? "entry population" : "previous step"} · {step.dropOffCount} observed drop-offs ({step.dropOffRate.toFixed(1)}% of {step.position === 1 ? "entrants" : "previous step"})</p></li>)}</ol>
    </section>
    <section className="methodology"><h2>Sequential funnel methodology</h2><p>Algorithm: {funnel.algorithmVersion}. Each customer counts at most once at each step, in the configured order. Events must have strictly increasing occurrence timestamps; equal-time events cannot advance a step. Repeats do not inflate counts, and events before a required predecessor do not count.</p>
      <p>The cohort is customers whose first matching entry occurs inside the selected UTC window [start, end). Every subsequent step must also occur inside that same window and within {funnel.conversionWindowMs / 86_400_000} days of entry, inclusive. An expired first entry does not restart. The customer filter applies to the entire sequence.</p>
      <p>Step conversion is users reaching this step divided by users reaching the previous step. Step drop-off is the previous-step count minus this-step count, divided by the previous-step count. Overall conversion is completed / entrants; overall observed drop-off is (entrants − completed) / entrants.</p>
      <p className="warning-note">Observed drop-off means not completed within this observation window, not proven abandonment. Late entrants can still be in progress; the selected end truncates their seven-day opportunity. This demo does not infer final abandonment or classify in-progress users.</p>
    </section>
  </>;
}

import Link from "next/link";
import type { DemoScreenModel } from "@/server/modules/demo/read-demo-screen";
import { analyticsHref } from "../domain/explorer";

export function OverviewPanel({ model }: { model: DemoScreenModel }) {
  const { eventSummary, funnel, activity } = model;
  const maximum = Math.max(1, ...activity.map((day) => day.events));
  const metrics = [
    ["Total events", String(eventSummary.totalEvents), "Occurrences in the selected window"],
    ["Unique active users", String(eventSummary.uniqueCustomers), "Distinct demo customers with events"],
    ["Funnel conversion", `${(funnel?.conversionRate ?? 0).toFixed(1)}%`, `${funnel?.completed ?? 0} of ${funnel?.entrants ?? 0} entrants completed`],
    ["Observed drop-off", `${model.dropOffRate.toFixed(1)}%`, `${model.dropOffCount} entrants did not complete in this window`],
  ];
  return <>
    {eventSummary.totalEvents === 0 && <div className="empty-panel"><h2>No activity in this selection</h2><p>Choose another date range or reset the customer filter to explore the demonstration.</p></div>}
    <div className="metric-grid">{metrics.map(([title, value, definition]) => <section key={title} className="metric-card" aria-label={title}><h2>{title}</h2><strong>{value}</strong><p>{definition}</p></section>)}</div>
    <div className="analytics-grid"><section className="analytics-card activity-card"><div className="card-heading"><div><h2>Event activity</h2><p>Daily event occurrences · UTC</p></div><span className="badge">{eventSummary.totalEvents} events</span></div>
      <svg viewBox="0 0 640 220" role="img" aria-label={`Daily demonstration event activity: ${eventSummary.totalEvents} events. Exact counts in the table below.`}>
        {[0, 1, 2].map((line) => <line key={line} x1="10" x2="630" y1={30 + line * 75} y2={30 + line * 75} className="chart-grid" />)}
        {activity.map((day, index) => <rect key={day.date} x={16 + index * 610 / activity.length} y={180 - day.events / maximum * 150} width={Math.max(2, 610 / activity.length - 9)} height={day.events / maximum * 150} rx="3" className="chart-bar"><title>{`${day.date}: ${day.events} events`}</title></rect>)}
        <text x="16" y="210" className="chart-label">{activity[0]?.date}</text><text x="625" y="210" textAnchor="end" className="chart-label">{activity.at(-1)?.date}</text>
      </svg>
      <details className="data-disclosure"><summary>View daily counts as a table</summary><table><caption>Demo event occurrences by UTC date</caption><thead><tr><th scope="col">Date (UTC)</th><th scope="col">Events</th></tr></thead><tbody>{activity.map((day) => <tr key={day.date}><th scope="row">{day.date}</th><td>{day.events}</td></tr>)}</tbody></table></details>
    </section><section className="analytics-card"><h2>Top event types</h2><p className="card-subtitle">Ranked by actual occurrences</p><ol className="event-ranking">{model.topEvents.map((event) => <li key={event.eventName}><Link className="text-link" href={analyticsHref("/events", model.filters, { type: event.eventName, q: "", page: 1 })}>{event.eventName}</Link><strong>{event.count}</strong></li>)}</ol>{!model.topEvents.length && <p>No event types in this selection.</p>}</section></div>
    <section className="analytics-card funnel-summary"><div><p className="eyebrow">Selected funnel</p><h2>{funnel?.name ?? "No configured funnel"}</h2><p>{funnel?.entrants ?? 0} entrants → {funnel?.completed ?? 0} completed · Strict sequential progression</p></div><Link className="primary-button" href={analyticsHref("/funnels", model.filters)}>Explore funnel →</Link></section>
  </>;
}

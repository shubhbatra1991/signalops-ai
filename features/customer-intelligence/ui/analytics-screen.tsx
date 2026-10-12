import Link from "next/link";
import type { DemoScreenModel } from "@/server/modules/demo/read-demo-screen";
import { analyticsHref, type AnalyticsPage } from "../domain/explorer";
import { ContextFields } from "./context-fields";
import { OverviewPanel } from "./overview-panel";
import { EventsPanel } from "./events-panel";
import { FunnelPanel } from "./funnel-panel";

const utc = (value: string) => `${value.slice(0, 10)} ${value.slice(11, 19)} UTC`;
export function AnalyticsScreen({ page, model }: { page: AnalyticsPage; model: DemoScreenModel }) {
  const title = { overview: "Overview", events: "Events", funnels: "Funnels" }[page];
  const path = page === "overview" ? "/app" : `/app/${page}`;
  const { filters } = model;
  return <>
    <div className="page-heading"><div><p className="eyebrow">{model.project.productName} · Customer intelligence</p>
      <h1>{title}</h1><p className="page-description">Explore the fictional product journey, from first account to first report.</p></div>
      <span className="badge demo-badge">Demo Data · {model.metadata.datasetVersion}</span></div>
    <p className="data-notice">{model.metadata.label}. No connected production sources.</p>
    <form method="get" action={path} className="analytics-filters" aria-label={`${title} filters`} key={JSON.stringify(filters)}>
      <ContextFields model={model} />
      {page === "events" && <>
        <label>Event type<select name="type" defaultValue={filters.type}><option value="">All event types</option>{model.eventTypes.map((name) => <option key={name}>{name}</option>)}</select></label>
        <label>Search events<input name="q" type="search" maxLength={80} defaultValue={filters.q} placeholder="Name, ID or properties" /></label>
        <input type="hidden" name="sort" value={filters.sort} />
      </>}
      <div className="filter-actions"><button type="submit" className="primary-button">Apply filters</button><Link href={path} className="text-link">Reset filters</Link></div>
    </form>
    {model.corrected && <p role="status" className="warning-note">Unsupported or malformed filters were replaced with safe defaults.</p>}
    <p className="range-note">UTC occurrence window: {utc(model.range.start)} inclusive → {utc(model.range.end)} exclusive.</p>
    {page === "overview" ? <OverviewPanel model={model} /> : page === "events" ? <EventsPanel model={model} /> : <FunnelPanel model={model} />}
    <aside className="methodology" aria-label="Metric definitions"><h2>Reading this demonstration</h2>
      <p>Events count actual occurrences. Active users are distinct demo customer IDs with at least one event in the selected project, UTC range and customer filter. Event search and type filters affect only the Events table.</p>
      <p>Overview and Funnels share the same selected funnel and population. Rates use unrounded counts and display one decimal place; zero denominators display 0.0%. <Link className="text-link" href={analyticsHref("/funnels", filters)}>Inspect the funnel methodology</Link>.</p>
    </aside>
  </>;
}

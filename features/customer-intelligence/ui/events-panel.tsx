import Link from "next/link";
import type { DemoScreenModel } from "@/server/modules/demo/read-demo-screen";
import { analyticsHref } from "../domain/explorer";

export function EventsPanel({ model }: { model: DemoScreenModel }) {
  const { explorer, filters } = model;
  const href = (page: number) => analyticsHref("/events", filters, { page });
  return <section className="analytics-card"><div className="card-heading"><div><h2>Event explorer</h2><p>{explorer.total} matching demonstration events · {explorer.pageSize} per page</p></div></div>
    {!explorer.total ? <div className="empty-panel"><h3>No matching events</h3><p>Try a different search, customer, event type or date range.</p><Link className="text-link" href="/app/events">Reset all event filters</Link></div> : <>
      <div className="table-scroll" role="region" aria-label="Event results" tabIndex={0}><table className="events-table"><caption>Fictional events sorted by occurrence time, with event ID ascending for ties</caption><thead><tr>
        <th scope="col" aria-sort={filters.sort === "asc" ? "ascending" : "descending"}><Link className="text-link" href={analyticsHref("/events", filters, { sort: filters.sort === "asc" ? "desc" : "asc", page: 1 })} aria-label={`Sort timestamp ${filters.sort === "asc" ? "newest" : "oldest"} first`}>Timestamp (UTC) {filters.sort === "asc" ? "↑" : "↓"}</Link></th>
        <th scope="col">Event</th><th scope="col">Customer identifier</th><th scope="col">Properties & details</th></tr></thead><tbody>
        {explorer.events.map((event) => <tr key={event.id}><td><time dateTime={event.occurredAt}>{event.occurredAt.slice(0, 10)}<br />{event.occurredAt.slice(11, 19)}</time></td><td><code>{event.name}</code></td><td>{event.customerId}</td><td>
          <span className="event-property-preview">{Object.entries(event.properties).map(([key, value]) => `${key}: ${value}`).join(" · ") || "No properties"}</span>
          <details className="event-detail"><summary aria-label={`View event ${event.id}`}>Event details</summary><div role="region" aria-label={`Details for ${event.id}`}><dl><dt>Event ID</dt><dd>{event.id}</dd><dt>Received (UTC)</dt><dd>{event.receivedAt}</dd><dt>Data origin</dt><dd>Demonstration · fictional</dd></dl><pre aria-label="Event properties">{JSON.stringify(event.properties, null, 2)}</pre></div></details>
        </td></tr>)}
      </tbody></table></div>
      <nav aria-label="Event pagination" className="pagination">{explorer.page > 1 ? <Link href={href(explorer.page - 1)}>← Previous page</Link> : <span aria-disabled="true">← Previous page</span>}<span>Page {explorer.page} of {explorer.pages}</span>{explorer.page < explorer.pages ? <Link href={href(explorer.page + 1)}>Next page →</Link> : <span aria-disabled="true">Next page →</span>}</nav>
    </>}
  </section>;
}

import Link from "next/link";
import { AppIcon, EmptyStateIcon } from "@/features/icons/app-icon";
import type { FeedbackScreenModel } from "@/server/modules/demo/read-feedback-screen";
import { analyticsHref } from "@/features/customer-intelligence/domain/explorer";
import { feedbackHref } from "../domain/feedback";
import { feedbackThemes } from "../domain/catalog";

export function FeedbackExplorer({ model }: { model: FeedbackScreenModel }) {
  const { filters, explorer } = model;
  return <section className="analytics-card feedback-explorer" aria-label="Feedback explorer"><div className="card-heading"><div><h2>Feedback explorer</h2><p>{explorer.total} matching fictional records · {explorer.pageSize} per page</p></div></div>
    {!explorer.total && <div className="empty-panel"><EmptyStateIcon name="feedback" /><h3>No matching feedback</h3><p>Try another customer, date range, category, source, label or search.</p><Link className="text-link" href="/demo/feedback">Reset all feedback filters</Link></div>}
    <ol className="feedback-list">{model.details.map(({ record, context }) => <li key={record.id}>
      <article aria-label={`Feedback ${record.id}`}><div className="feedback-record-heading"><span className="badge">{record.category}</span><span>{record.source}</span><time dateTime={record.submittedAt}>{record.submittedAt.slice(0, 10)} {record.submittedAt.slice(11, 19)} UTC</time></div>
        <blockquote>{record.text}</blockquote><p>{record.customerId} · {record.id} · Sentiment: {record.sentiment ?? "unlabelled"}</p>
        <ul className="feedback-tags" aria-label={`Themes for ${record.id}`}>{[...new Set(record.themeIds)].map((id) => <li key={id}>{feedbackThemes[id].label}</li>)}</ul>
        <details className="feedback-detail"><summary aria-label={`View feedback ${record.id}`}>Evidence & behavioural context</summary><div role="region" aria-label={`Details for ${record.id}`}>
          <dl><dt>Provenance</dt><dd>Demonstration · {record.provenance.kind} · {record.provenance.annotations}</dd><dt>Project</dt><dd>{record.projectId}</dd><dt>Observed event history</dt><dd>{context.eventCount ? `${context.eventCount} events in this window at or before the comment.` : "No event history available in this window at or before the comment. Participation is unknown."}</dd></dl>
          {context.eventCount > 0 && context.funnel && <p>{context.funnel.name}: {context.funnel.reachedSteps} of {context.funnel.totalSteps} steps observed{context.funnel.lastStep ? `; last reached: ${context.funnel.lastStep}` : "; no first-step entry observed in this window"}. {context.funnel.completed ? "Completion observed by comment time." : "Completion not observed by comment time; no abandonment claim."}</p>}
          {!context.funnel && <p>No configured funnel context is available.</p>}
          <h4>Linked event evidence</h4><ul className="evidence-links">{context.linkedEvents.map((event) => <li key={event.id}><Link className="text-link icon-link" href={analyticsHref("/events", filters, { customer: record.customerId, q: event.id, type: "", page: 1 })}><AppIcon name="evidence" size={16} />{event.name} · {event.id}</Link></li>)}</ul>
          {!context.linkedEvents.length && <p>No linked events available in this observation window.</p>}
          {context.unavailableReferences > 0 && <p>{context.unavailableReferences} authored event references are unavailable in this context; they may be outside the window or missing.</p>}
          <div className="feedback-context-links"><Link className="text-link" href={analyticsHref("/events", filters, { customer: record.customerId, q: "", type: "", page: 1 })}>Explore this customer’s events</Link><Link className="text-link" href={analyticsHref("/funnels", filters, { customer: record.customerId })}>View customer funnel over full selected window</Link></div>
          <p>These are observed associations. They do not demonstrate that feedback caused a funnel drop-off. Linked explorer pages use the full selected window and may contain activity after the comment.</p>
        </div></details>
      </article>
    </li>)}</ol>
    {explorer.total > 0 && <nav aria-label="Feedback pagination" className="pagination">{explorer.page > 1 ? <Link className="icon-link" href={feedbackHref(filters, { page: explorer.page - 1 })}><AppIcon name="arrow-left" size={18} />Previous page</Link> : <span aria-disabled="true" className="icon-link"><AppIcon name="arrow-left" size={18} />Previous page</span>}<span>Page {explorer.page} of {explorer.pages}</span>{explorer.page < explorer.pages ? <Link className="icon-link" href={feedbackHref(filters, { page: explorer.page + 1 })}>Next page<AppIcon name="arrow-right" size={18} /></Link> : <span aria-disabled="true" className="icon-link">Next page<AppIcon name="arrow-right" size={18} /></span>}</nav>}
  </section>;
}

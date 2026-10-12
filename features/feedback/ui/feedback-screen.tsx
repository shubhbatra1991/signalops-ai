import Link from "next/link";
import type { FeedbackScreenModel } from "@/server/modules/demo/read-feedback-screen";
import { ContextFields } from "@/features/customer-intelligence/ui/context-fields";
import { feedbackCategories, feedbackSentiments, feedbackSources, feedbackThemes } from "../domain/catalog";
import { feedbackHref } from "../domain/feedback";
import { FeedbackExplorer } from "./feedback-explorer";

export function FeedbackScreen({ model }: { model: FeedbackScreenModel }) {
  const { filters, summary } = model;
  const metrics = [
    ["Feedback records", summary.total, "All records matching the active filters"],
    ["Unique contributors", summary.contributors, "Distinct existing demo customer IDs"],
    ["Recurring themes", summary.recurringThemes, "Themes tagged on at least two matching records"],
    ["Opportunity candidates", summary.opportunities.length, "Recurring themes from at least two contributors"],
  ];
  return <>
    <div className="page-heading"><div><p className="eyebrow">{model.project.productName} · Customer intelligence</p>
      <h1>Feedback</h1><p className="page-description">Connect recurring feedback to observed product journeys.</p></div>
      <span className="badge demo-badge">Demo Data · {model.metadata.datasetVersion}</span></div>
    <p className="data-notice">{model.metadata.label}. Comments, themes and sentiment labels are authored fixtures, not AI findings.</p>
    <form method="get" action="/feedback" className="analytics-filters" aria-label="Feedback filters" key={JSON.stringify(filters)}>
      <ContextFields model={model} />
      <label>Category<select name="category" defaultValue={filters.category}><option value="">All categories</option>{feedbackCategories.map((value) => <option key={value}>{value}</option>)}</select></label>
      <label>Source<select name="source" defaultValue={filters.source}><option value="">All demo sources</option>{feedbackSources.map((value) => <option key={value}>{value}</option>)}</select></label>
      <label>Sentiment<select name="sentiment" defaultValue={filters.sentiment}><option value="">All labels</option>{feedbackSentiments.map((value) => <option key={value}>{value}</option>)}</select></label>
      <label>Theme<select name="theme" defaultValue={filters.theme}><option value="">All themes</option>{Object.entries(feedbackThemes).map(([id, theme]) => <option key={id} value={id}>{theme.label}</option>)}</select></label>
      <label>Search feedback<input name="q" type="search" maxLength={80} defaultValue={filters.q} placeholder="Comment, record ID or theme" /></label>
      <label>Sort order<select name="sort" defaultValue={filters.sort}><option value="desc">Newest first</option><option value="asc">Oldest first</option></select></label>
      <div className="filter-actions"><button className="primary-button" type="submit">Apply filters</button><Link className="text-link" href="/feedback">Reset filters</Link></div>
    </form>
    {model.corrected && <p role="status" className="warning-note">Unsupported or malformed filters were replaced with safe defaults.</p>}
    <p className="range-note">UTC submission window: {model.range.start} inclusive → {model.range.end} exclusive. Behavioural context uses event occurrence time, up to each comment’s timestamp within this same window.</p>
    <div className="metric-grid">{metrics.map(([title, value, definition]) => <section key={title} className="metric-card" aria-label={String(title)}><h2>{title}</h2><strong>{value}</strong><p>{definition}</p></section>)}</div>
    <div className="analytics-grid"><section className="analytics-card"><h2>Feedback themes</h2><p className="card-subtitle">Authored tags · one count per record per theme; recurring means at least two records</p>
      <ul className="event-ranking">{summary.themes.map((theme) => <li key={theme.id}><div><Link className="text-link" href={feedbackHref(filters, { theme: theme.id, page: 1 })}>{theme.label}</Link><p>{theme.contributors} unique contributors</p></div><strong>{theme.recordCount} records</strong></li>)}</ul>
      {!summary.themes.length && <p>No themes in the current selection.</p>}
    </section><section className="analytics-card"><h2>Category breakdown</h2><p className="card-subtitle">Counts use the complete filtered selection, before pagination.</p><ul className="event-ranking">{summary.categories.map((category) => <li key={category.category}><span>{category.category}</span><strong>{category.count}</strong></li>)}</ul><h3 className="feedback-subheading">Authored sentiment labels</h3><ul className="event-ranking">{summary.sentiments.map((item) => <li key={item.sentiment}><span>{item.sentiment}</span><strong>{item.count}</strong></li>)}</ul><p>Unlabelled means no authored sentiment annotation. It is not inferred as neutral.</p></section></div>
    <FeedbackExplorer model={model} />
    <section className="opportunity-section" aria-label="Product opportunities"><h2>Product opportunities</h2><p className="page-description">Deterministic review prompts from recurring themes. Ranked by supporting record count, then theme ID. Not AI-generated, not a priority score.</p>
      {!summary.opportunities.length && <div className="empty-panel"><h3>Not enough recurring evidence</h3><p>An opportunity requires at least two records from two distinct contributors in this selection.</p></div>}
      <div className="opportunity-grid">{summary.opportunities.map((item) => <article key={item.id} className="analytics-card"><p className="eyebrow">Authored theme · {item.label}</p><h3>{item.opportunity}</h3><p>{item.recordCount} supporting records · {item.contributors} unique contributors. Review the comments before deciding whether to act.</p><ul className="evidence-links" aria-label={`Evidence for ${item.label}`}>{item.feedbackIds.map((id) => <li key={id}><Link className="text-link" href={feedbackHref(filters, { q: id, category: "", source: "", sentiment: "", theme: "", page: 1 })}>{id}</Link></li>)}</ul></article>)}</div>
    </section>
    <aside className="methodology" aria-label="Feedback metric definitions"><h2>Reading feedback evidence</h2><p>All metrics use the complete filtered feedback selection, not only the visible page. Contributors are distinct customer IDs. Multiple themes may be assigned to one record, so theme counts can sum to more than the record count. Repeated comments from one customer count as records but do not add contributors.</p>
      <p>Funnel participation is calculated using the existing strict sequential, seven-day method, restricted to the selected UTC window and events observed at or before that comment. Missing history means unknown context, not proof of inactivity. Observed noncompletion is not verified abandonment. Feedback and behaviour do not establish causation.</p>
      <p>Evidence metadata is prepared locally with bounded references and aggregate analytics. No provider is called; feedback text, customer identifiers and raw event properties are excluded from the future-provider payload. Privacy review and explicit provider configuration are still required before any transmission.</p></aside>
  </>;
}

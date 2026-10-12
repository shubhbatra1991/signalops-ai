import Link from "next/link";
import type { DemoScreenModel } from "@/server/modules/demo/read-demo-screen";
import { ThemeControl } from "@/features/theme/ui/theme-control";
import { StoryRail } from "./story-rail";

const sourceUrl = "https://github.com/shubhbatra1991/signalops-ai";
const featureCards = [
  ["Events", "↗", "Search a coherent fictional event history with stable IDs and exact UTC timestamps.", "/app/events"],
  ["Funnels", "▽", "Review calculated progression, conversion and drop-off with disclosed methodology.", "/app/funnels"],
  ["Feedback", "☷", "Explore recurring authored themes alongside relevant behavioural context.", "/app/feedback"],
  ["AI Insights", "✧", "Use your configured provider for explicitly approved, evidence-grounded research.", "/app/insights"],
  ["Missions", "◎", "Plan editable product work while preserving its provenance and evidence links.", "/app/missions"],
  ["Impact", "▥", "Measure compatible before-and-after windows without inventing causal success.", "/app/impact"],
] as const;

export function LandingPage({ preview }: { preview: DemoScreenModel }) {
  return <div className="marketing-page">
    <a className="skip-link" href="#landing-main">Skip to main content</a>
    <header className="marketing-header">
      <Link className="marketing-brand" href="/" aria-label="SignalOps-AI home"><span aria-hidden="true">S</span><strong>SignalOps</strong><small>AI</small></Link>
      <nav aria-label="Public navigation"><a href="#workflow">Workflow</a><a href="#features">Features</a><a href="#self-host">Self-host</a><a href="#licensing">Licensing</a></nav>
      <div className="marketing-header-actions"><ThemeControl /><Link className="secondary-button" href="/app">Open demo</Link></div>
    </header>
    <main id="landing-main">
      <section className="marketing-hero">
        <div className="hero-copy">
          <p className="marketing-kicker">Source-available · Self-hostable · Bring your own key</p>
          <h1>From customer signals<br />to product impact.</h1>
          <p className="hero-lede">SignalOps-AI connects behavioural analytics, customer feedback and evidence-grounded AI research—then carries that evidence into product missions and measured outcomes.</p>
          <div className="hero-actions"><Link className="primary-button" href="/app">Explore the demo <span aria-hidden="true">→</span></Link><a className="secondary-button" href={sourceUrl} target="_blank" rel="noreferrer">View source <span aria-hidden="true">↗</span></a></div>
          <p className="hero-note">Fictional demonstration data · Real deterministic calculations · No account required</p>
        </div>
        <ProductPreview preview={preview} />
      </section>
      <section className="trust-strip" aria-label="Product principles"><span>Deterministic analytics</span><span>Evidence before inference</span><span>Explicit AI approval</span><span>Server-side credentials</span></section>
      <section className="marketing-section workflow-section" id="workflow">
        <div className="section-intro"><p className="marketing-kicker">One continuous evidence trail</p><h2>Follow the signal. Keep the context.</h2><p>Move from observed activity to measured outcomes without turning hypotheses into facts.</p></div><StoryRail />
      </section>
      <section className="marketing-section" id="features">
        <div className="section-intro"><p className="marketing-kicker">Explore the working demonstration</p><h2>Built around the questions product teams ask.</h2><p>Every section uses the same fictional project and shared evidence. Calculated metrics come from the dataset, not generated copy.</p></div>
        <div className="feature-grid">{featureCards.map(([title, symbol, copy, href]) => <Link className="feature-card" href={href} key={title}><span className="feature-symbol" aria-hidden="true">{symbol}</span><span><h3>{title}</h3><p>{copy}</p></span><b aria-hidden="true">→</b></Link>)}</div>
      </section>
      <section className="marketing-section byok-section">
        <div><p className="marketing-kicker">Bring your own key</p><h2>Your provider. Your explicit decision to send.</h2><p>Configure OpenAI, Groq, Anthropic or Z.ai for the current browser session, or use validated server environment variables in a self-hosted instance. Browser-entered keys remain in memory and are never written to browser storage. Evidence is previewed before each generation request.</p><Link className="text-link" href="/app/settings">Review AI settings →</Link></div>
        <div className="provider-stack" aria-label="Supported AI providers"><span>OpenAI</span><span>Groq</span><span>Anthropic</span><span>Z.ai</span><small>No silent provider fallback</small></div>
      </section>
      <section className="marketing-section self-host-section" id="self-host">
        <div><p className="marketing-kicker">Run it on your infrastructure</p><h2>A local demonstration in two commands.</h2><p>The current static-first application runs without PostgreSQL, Docker or project-owner services. Node.js and npm are required; provider credentials are optional unless you choose to test AI.</p><p className="section-caveat">Production deployment hardening, authentication and real-data connectors remain future work.</p></div>
        <div className="terminal-card" aria-label="Local setup commands"><div><i /><i /><i /><span>signalops-ai</span></div><pre><code><span>$</span> npm ci{"\n"}<span>$</span> npm run dev</code></pre><p>Then open <strong>http://localhost:3000</strong></p></div>
      </section>
      <section className="marketing-section license-section" id="licensing">
        <p className="marketing-kicker">Licensing direction</p><h2>Open to inspect and self-host.</h2><p>The repository currently includes the MIT License. Product strategy intends free personal, educational, internal organisational, modification and self-hosting use; competing hosted offerings and commercial resale may require separate paid terms.</p><p>Final source-available wording and redistribution rights are <strong>pending legal review</strong>. The current <a className="text-link" href={`${sourceUrl}/blob/main/LICENSE`} target="_blank" rel="noreferrer">LICENSE</a> remains the operative public text until an approved change is published.</p>
      </section>
      <section className="final-cta"><p className="marketing-kicker">Start with the evidence</p><h2>See the full workflow with transparent demo data.</h2><p>Explore every calculation, inspect its source records, and decide where AI belongs.</p><div className="hero-actions"><Link className="primary-button" href="/app">Open SignalOps-AI <span aria-hidden="true">→</span></Link><a className="secondary-button" href={sourceUrl} target="_blank" rel="noreferrer">GitHub <span aria-hidden="true">↗</span></a></div></section>
    </main>
    <footer className="marketing-footer"><Link className="marketing-brand" href="/"><span aria-hidden="true">S</span><strong>SignalOps</strong><small>AI</small></Link><p>Evidence-led product intelligence. Fictional demonstration data.</p><div><Link href="/app">Demo</Link><a href={sourceUrl} target="_blank" rel="noreferrer">Source</a></div></footer>
  </div>;
}

function ProductPreview({ preview }: { preview: DemoScreenModel }) {
  const activity = preview.activity.slice(-10);
  const max = Math.max(1, ...activity.map((day) => day.events));
  return <div className="product-preview" aria-label="Calculated FlowPilot demonstration preview">
    <div className="preview-chrome"><span /><span /><span /><small>SignalOps-AI / Overview</small></div>
    <div className="preview-body"><aside aria-hidden="true"><b>S</b>{["◫", "↗", "▽", "☷", "✧", "◎"].map((symbol, index) => <i className={index === 0 ? "active" : ""} key={symbol}>{symbol}</i>)}</aside>
      <div className="preview-content"><div className="preview-heading"><span><small>DEMONSTRATION DATA</small><strong>{preview.project.name}</strong></span><em>Full demo · UTC</em></div>
        <div className="preview-metrics"><span><small>Total events</small><strong>{preview.eventSummary.totalEvents}</strong></span><span><small>Active users</small><strong>{preview.eventSummary.uniqueCustomers}</strong></span><span><small>Conversion</small><strong>{(preview.funnel?.conversionRate ?? 0).toFixed(1)}%</strong></span></div>
        <div className="preview-chart"><div><small>Event activity</small><strong>Actual occurrences</strong></div><div className="preview-bars">{activity.map((day) => <i key={day.date} style={{ height: `${Math.max(8, day.events / max * 100)}%` }} title={`${day.date}: ${day.events} events`} />)}</div></div>
        <div className="preview-funnel"><span><small>Selected funnel</small><strong>{preview.funnel?.name ?? "No configured funnel"}</strong></span><em>{preview.funnel?.entrants ?? 0} entrants → {preview.funnel?.completed ?? 0} completed</em></div>
      </div></div>
    <p><span aria-hidden="true">●</span> Calculated from {preview.metadata.datasetVersion} fictional records</p>
  </div>;
}

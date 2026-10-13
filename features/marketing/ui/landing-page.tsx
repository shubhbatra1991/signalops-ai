import Link from "next/link";
import type { DemoScreenModel } from "@/server/modules/demo/read-demo-screen";
import { ThemeControl } from "@/features/theme/ui/theme-control";
import { BrandLink } from "@/features/shell/ui/brand-link";
import { AppIcon } from "@/features/icons/app-icon";
import { StoryRail } from "./story-rail";
import { AnimatedProductPreview, HeroContent, MarketingMotionProvider, RevealSection } from "./landing-motion";

const sourceUrl = "https://github.com/shubhbatra1991/signalops-ai";
const featureCards = [
  ["Events", "events", "Search a coherent fictional event history with stable IDs and exact UTC timestamps.", "/demo/events"],
  ["Funnels", "funnels", "Review calculated progression, conversion and drop-off with disclosed methodology.", "/demo/funnels"],
  ["Feedback", "feedback", "Explore recurring authored themes alongside relevant behavioural context.", "/demo/feedback"],
  ["AI Insights", "insights", "Use your configured provider for explicitly approved, evidence-grounded research.", "/demo/insights"],
  ["Missions", "missions", "Plan editable product work while preserving its provenance and evidence links.", "/demo/missions"],
  ["Impact", "impact", "Measure compatible before-and-after windows without inventing causal success.", "/demo/impact"],
] as const;

export function LandingPage({ preview }: { preview: DemoScreenModel }) {
  return <MarketingMotionProvider><div className="marketing-page">
    <a className="skip-link" href="#landing-main">Skip to main content</a>
    <header className="marketing-header">
      <BrandLink variant="marketing" />
      <nav aria-label="Public navigation"><a href="#workflow">Workflow</a><a href="#features">Features</a><a href="#self-host">Self-host</a><a href="#licensing">Licensing</a></nav>
      <div className="marketing-header-actions"><ThemeControl /><Link className="secondary-button" href="/start">Open demo</Link></div>
    </header>
    <main id="landing-main">
      <section className="marketing-hero"><HeroContent sourceUrl={sourceUrl} /><AnimatedProductPreview preview={preview} /></section>
      <section className="trust-strip" aria-label="Product principles"><span><AppIcon name="success" size={16} />Deterministic analytics</span><span><AppIcon name="success" size={16} />Evidence before inference</span><span><AppIcon name="success" size={16} />Explicit AI approval</span><span><AppIcon name="security" size={16} />Server-side credentials</span></section>
      <section className="marketing-section workflow-section" id="workflow">
        <div className="section-intro"><p className="marketing-kicker">One continuous evidence trail</p><h2>Follow the signal. Keep the context.</h2><p>Move from observed activity to measured outcomes without turning hypotheses into facts.</p></div><StoryRail />
      </section>
      <RevealSection className="marketing-section" id="features">
        <div className="section-intro"><p className="marketing-kicker">Explore the working demonstration</p><h2>Built around the questions product teams ask.</h2><p>Every section uses the same fictional project and shared evidence. Calculated metrics come from the dataset, not generated copy.</p></div>
        <div className="feature-grid">{featureCards.map(([title, icon, copy, href]) => <Link className="feature-card" href={href} key={title}><span className="feature-symbol"><AppIcon name={icon} size={24} /></span><span><h3>{title}</h3><p>{copy}</p></span><AppIcon name="arrow-right" size={18} /></Link>)}</div>
      </RevealSection>
      <RevealSection className="marketing-section byok-section">
        <div><p className="marketing-kicker">Bring your own key</p><h2>Your provider. Your explicit decision to send.</h2><p>Configure OpenAI, Groq, Anthropic or Z.ai for the current browser session, or use validated server environment variables in a self-hosted instance. Browser-entered keys remain in memory and are never written to browser storage. Evidence is previewed before each generation request.</p><Link className="text-link icon-link" href="/demo/settings">Review AI settings <AppIcon name="arrow-right" size={18} /></Link></div>
        <div className="provider-stack" aria-label="Supported AI providers"><span>OpenAI</span><span>Groq</span><span>Anthropic</span><span>Z.ai</span><small>No silent provider fallback</small></div>
      </RevealSection>
      <RevealSection className="marketing-section self-host-section" id="self-host">
        <div><p className="marketing-kicker">Run it on your infrastructure</p><h2>A local demonstration in two commands.</h2><p>The current static-first application runs without PostgreSQL, Docker or project-owner services. Node.js and npm are required; provider credentials are optional unless you choose to test AI.</p><p className="section-caveat">Production deployment hardening, authentication and real-data connectors remain future work.</p></div>
        <div className="terminal-card" aria-label="Local setup commands"><div><i /><i /><i /><span>signalops-ai</span></div><pre><code><span>$</span> npm ci{"\n"}<span>$</span> npm run dev</code></pre><p>Then open <strong>http://localhost:3000</strong></p></div>
      </RevealSection>
      <section className="marketing-section license-section" id="licensing">
        <p className="marketing-kicker">Licensing</p><h2>MIT-licensed today.</h2><p>SignalOps-AI is currently distributed under the <a className="text-link" href={`${sourceUrl}/blob/main/LICENSE`} target="_blank" rel="noreferrer">MIT License</a>, which permits commercial use, modification, redistribution, and hosting subject to its terms.</p><p>We are evaluating alternative licensing arrangements for future releases, including separate commercial licensing for certain hosted or redistributed offerings. No additional commercial restrictions apply to the existing MIT-licensed release.</p>
      </section>
      <RevealSection className="final-cta"><p className="marketing-kicker">Start with the evidence</p><h2>See the full workflow with transparent demo data.</h2><p>Explore every calculation, inspect its source records, and decide where AI belongs.</p><div className="hero-actions"><Link className="primary-button" href="/start">Open SignalOps-AI <AppIcon name="arrow-right" size={18} /></Link><a className="secondary-button" href={sourceUrl} target="_blank" rel="noreferrer">GitHub <AppIcon name="arrow-right" size={18} /></a></div></RevealSection>
    </main>
    <footer className="marketing-footer"><BrandLink variant="marketing" /><p>Evidence-led product intelligence. Fictional demonstration data.</p><div><Link href="/start">Demo</Link><a href={sourceUrl} target="_blank" rel="noreferrer">Source</a></div></footer>
  </div></MarketingMotionProvider>;
}

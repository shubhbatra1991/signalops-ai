import Link from "next/link";
import { ThemeControl } from "@/features/theme/ui/theme-control";
import { BrandLink } from "@/features/shell/ui/brand-link";
import { AppIcon } from "@/features/icons/app-icon";

export function ExperienceSelector() {
  return <div className="experience-page">
    <a className="skip-link" href="#experience-main">Skip to experience choices</a>
    <header className="experience-header"><BrandLink variant="marketing" /><div className="experience-theme-controls"><ThemeControl /></div></header>
    <main id="experience-main" className="experience-main">
      <div className="experience-intro">
        <p className="marketing-kicker">Choose your experience</p>
        <h1 id="experience-title">How would you like to explore SignalOps-AI?</h1>
        <p>Start with the working fictional demonstration today. Private personal workspaces will require Google authentication in Stage 4.2.</p>
      </div>
      <section className="experience-options" aria-labelledby="experience-title">
        <article className="experience-card experience-card-primary">
          <div className="experience-icon"><AppIcon name="guest" size={24} /></div>
          <p className="eyebrow">Available now</p>
          <h2>Explore as Guest</h2>
          <p>Use the fictional FlowPilot dataset, guided tour and browser-local missions without creating an account.</p>
          <ul><li><AppIcon name="success" size={16} />Deterministic analytics</li><li><AppIcon name="success" size={16} />Guided evidence journey</li><li><AppIcon name="success" size={16} />Optional memory-only BYOK</li></ul>
          <Link className="primary-button" href="/demo">Open guest demo <AppIcon name="arrow-right" size={18} /></Link>
        </article>
        <article className="experience-card experience-card-unavailable" aria-describedby="workspace-availability">
          <div className="experience-icon"><AppIcon name="workspace" size={24} /></div>
          <p className="eyebrow">Coming in Stage 4.2</p>
          <h2>My Workspace</h2>
          <p id="workspace-availability">Google authentication and private personal workspaces are not available yet.</p>
          <ul><li><AppIcon name="success" size={16} />Initially empty workspace</li><li><AppIcon name="success" size={16} />Private evidence and missions</li><li><AppIcon name="success" size={16} />Server-authorized membership</li></ul>
          <span className="unavailable-action" aria-label="My Workspace sign-in unavailable">Sign in is not yet available</span>
        </article>
      </section>
      <Link className="experience-back text-link" href="/"><AppIcon name="arrow-left" size={18} />Back to home</Link>
    </main>
  </div>;
}

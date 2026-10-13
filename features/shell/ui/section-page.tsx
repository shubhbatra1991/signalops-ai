import Link from "next/link";
import { navigation } from "../navigation";

export function SectionPage({ section }: { section: (typeof navigation)[number] }) {
  return <>
    <div className="page-heading"><div><p className="eyebrow">YOUR PRODUCT, IN FOCUS</p><h1>{section.title}</h1><p className="page-description">{section.description}</p></div><span className="badge">Application preview</span></div>
    <section className="empty-panel" aria-labelledby="empty-title">
      <div className="empty-illustration" aria-hidden="true"><div className="illustration-grid" /><span>{section.symbol}</span></div>
      <p className="eyebrow">A CLEAR START</p><h2 id="empty-title">{section.emptyTitle}</h2><p>{section.emptyDescription}</p>
      <div className="empty-note"><span className="status-dot" aria-hidden="true" />No connected data · No generated results</div>
    </section>
    {section.href === "/" && <section className="explore-section" aria-labelledby="explore-title">
      <div className="section-heading"><h2 id="explore-title">Explore your workspace</h2><p>The structure is ready. Your evidence comes next.</p></div>
      <div className="explore-grid">{[
        { href: "/events", title: "Understand the journey", text: "Explore customer activity and funnel progression.", label: "Events & funnels", symbol: "↗" },
        { href: "/feedback", title: "Listen to the signal", text: "Connect the customer voice to product questions.", label: "Customer feedback", symbol: "☷" },
        { href: "/missions", title: "Move with intention", text: "Follow evidence through to actions and outcomes.", label: "Missions & impact", symbol: "◎" },
      ].map((item) => <Link className="explore-card" href={item.href} key={item.href}><span className="card-symbol" aria-hidden="true">{item.symbol}</span><p className="eyebrow">{item.label}</p><h3>{item.title}</h3><p>{item.text}</p><span className="card-arrow" aria-hidden="true">↗</span></Link>)}</div>
    </section>}
  </>;
}

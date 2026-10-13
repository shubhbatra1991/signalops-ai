"use client";

import Link from "next/link";
import { useId, useState, type KeyboardEvent } from "react";
import { AppIcon, type AppIconName } from "@/features/icons/app-icon";

const steps = [
  { title: "Events", icon: "events", href: "/demo/events", copy: "Inspect timestamped product activity with deterministic counts and customer-level context." },
  { title: "Funnels", icon: "funnels", href: "/demo/funnels", copy: "Measure strict sequential progression and observed noncompletion within explicit UTC windows." },
  { title: "Feedback", icon: "feedback", href: "/demo/feedback", copy: "Connect fictional customer comments to prior event history without claiming causation." },
  { title: "AI Insights", icon: "insights", href: "/demo/insights", copy: "Review minimized evidence before an explicitly approved BYOK request generates research hypotheses." },
  { title: "Missions", icon: "missions", href: "/demo/missions", copy: "Turn reviewed opportunities into editable work with source and evidence traceability." },
  { title: "Impact", icon: "impact", href: "/demo/impact", copy: "Compare compatible measurements while keeping observed change separate from causal impact." },
] as const;

export function StoryRail() {
  const [active, setActive] = useState(0);
  const prefix = useId();
  function onKeyDown(event: KeyboardEvent<HTMLButtonElement>, index: number) {
    let next = index;
    if (event.key === "ArrowRight" || event.key === "ArrowDown") next = (index + 1) % steps.length;
    else if (event.key === "ArrowLeft" || event.key === "ArrowUp") next = (index - 1 + steps.length) % steps.length;
    else if (event.key === "Home") next = 0;
    else if (event.key === "End") next = steps.length - 1;
    else return;
    event.preventDefault();
    setActive(next);
    document.getElementById(`${prefix}-tab-${next}`)?.focus();
  }
  const step = steps[active];
  return <div className="story-explorer">
    <div className="story-tabs" role="tablist" aria-label="Product intelligence workflow">
      {steps.map((item, index) => <button key={item.title} id={`${prefix}-tab-${index}`} role="tab" aria-selected={active === index} aria-controls={`${prefix}-panel`} tabIndex={active === index ? 0 : -1} onClick={() => setActive(index)} onKeyDown={(event) => onKeyDown(event, index)}>
        <span><AppIcon name={item.icon as AppIconName} /></span><span>{item.title}</span><small>{String(index + 1).padStart(2, "0")}</small>
      </button>)}
    </div>
    <div className="story-panel" id={`${prefix}-panel`} role="tabpanel" aria-labelledby={`${prefix}-tab-${active}`}>
      <div><p className="marketing-kicker">Step {active + 1} of {steps.length}</p><h3>{step.title}</h3><p>{step.copy}</p><Link className="text-link" href={step.href}>Explore {step.title} in the demo <AppIcon name="arrow-right" size={18} /></Link></div>
      <div className="story-signal" aria-hidden="true"><span><AppIcon name={step.icon as AppIconName} size={24} /></span><i /><i /><i /></div>
    </div>
  </div>;
}

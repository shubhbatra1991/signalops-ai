"use client";

import Link from "next/link";
import { useId, useState, type KeyboardEvent } from "react";
import { m, usePageInView, useReducedMotion } from "motion/react";
import { AppIcon, type AppIconName } from "@/features/icons/app-icon";

const ease = [0.22, 1, 0.36, 1] as const;
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
  const [direction, setDirection] = useState(1);
  const reduced = Boolean(useReducedMotion());
  const pageInView = usePageInView();
  const prefix = useId();

  function select(next: number) {
    setDirection(next >= active ? 1 : -1);
    setActive(next);
  }

  function onKeyDown(event: KeyboardEvent<HTMLButtonElement>, index: number) {
    let next = index;
    if (event.key === "ArrowRight" || event.key === "ArrowDown") next = (index + 1) % steps.length;
    else if (event.key === "ArrowLeft" || event.key === "ArrowUp") next = (index - 1 + steps.length) % steps.length;
    else if (event.key === "Home") next = 0;
    else if (event.key === "End") next = steps.length - 1;
    else return;
    event.preventDefault();
    select(next);
    document.getElementById(`${prefix}-tab-${next}`)?.focus();
  }

  const step = steps[active];
  return <div className="story-explorer" data-motion-workflow="interactive">
    <div className="story-tabs" role="tablist" aria-label="Product intelligence workflow">
      <span className="story-progress" aria-hidden="true"><m.i
        initial={false}
        animate={{ scaleX: (active + 1) / steps.length }}
        transition={reduced ? { duration: 0 } : { type: "spring", stiffness: 220, damping: 28 }}
      /></span>
      {steps.map((item, index) => <button
        key={item.title}
        id={`${prefix}-tab-${index}`}
        role="tab"
        aria-selected={active === index}
        aria-controls={`${prefix}-panel`}
        tabIndex={active === index ? 0 : -1}
        onClick={() => select(index)}
        onKeyDown={(event) => onKeyDown(event, index)}
      >
        <m.span
          className="story-active-indicator"
          initial={false}
          animate={{ opacity: active === index ? 1 : 0, scale: active === index ? 1 : 0.97 }}
          transition={reduced ? { duration: 0 } : { duration: 0.32, ease }}
          aria-hidden="true"
        />
        <m.span
          className="story-tab-icon"
          animate={{ scale: active === index && !reduced ? 1.08 : 1, y: active === index && !reduced ? -1 : 0 }}
          transition={reduced ? { duration: 0 } : { duration: 0.3, ease }}
        ><AppIcon name={item.icon as AppIconName} /></m.span>
        <span className="story-tab-label">{item.title}</span>
        <small>{String(index + 1).padStart(2, "0")}</small>
      </button>)}
    </div>
    <m.div
      key={step.title}
      className="story-panel"
      id={`${prefix}-panel`}
      role="tabpanel"
      aria-labelledby={`${prefix}-tab-${active}`}
      data-motion-workflow-panel={step.title}
      initial={reduced ? false : { opacity: 0.18, x: direction * 28 }}
      animate={{ opacity: 1, x: 0 }}
      transition={reduced ? { duration: 0 } : { duration: 0.48, ease }}
    >
      <div>
        <p className="marketing-kicker">Step {active + 1} of {steps.length}</p>
        <h3>{step.title}</h3>
        <p>{step.copy}</p>
        <Link className="text-link" href={step.href}>Explore {step.title} in the demo <AppIcon name="arrow-right" size={18} /></Link>
      </div>
      <div className="story-signal" aria-hidden="true">
        <svg
          className="story-signal-path"
          viewBox="0 0 220 220"
          focusable="false"
          style={{ position: "absolute", inset: "7%", width: "86%", height: "86%", overflow: "visible" }}
        >
          <path
            className="story-signal-track"
            d="M22 110 C58 28 162 192 198 110 C162 28 58 192 22 110"
            fill="none"
            stroke="var(--border-strong)"
            strokeWidth="1.5"
            strokeLinecap="round"
          />
          <m.path
            key={`path-${active}`}
            className="story-signal-active"
            d="M22 110 C58 28 162 192 198 110 C162 28 58 192 22 110"
            fill="none"
            stroke="var(--accent)"
            strokeWidth="1.5"
            strokeLinecap="round"
            initial={reduced ? false : { pathLength: 0.08, opacity: 0.22 }}
            animate={{ pathLength: (active + 1) / steps.length, opacity: 0.88 }}
            transition={reduced ? { duration: 0 } : { duration: 0.72, ease }}
          />
          <m.circle
            key={`particle-${active}`}
            className="story-signal-particle"
            r="4"
            fill="var(--signal-glow, var(--accent))"
            initial={reduced ? false : { cx: 22, cy: 110, opacity: 0 }}
            animate={!reduced && pageInView
              ? { cx: [22, 74, 146, 198], cy: [110, 70, 150, 110], opacity: [0, 1, 1, 0] }
              : { cx: 110, cy: 110, opacity: 0.35 }}
            transition={!reduced && pageInView ? { duration: 2.8, repeat: Infinity, ease: "easeInOut" } : { duration: 0 }}
          />
        </svg>
        <m.span
          key={step.icon}
          initial={reduced ? false : { opacity: 0.12, scale: 0.72, rotate: -8 }}
          animate={{ opacity: 1, scale: 1, rotate: 0 }}
          transition={reduced ? { duration: 0 } : { duration: 0.46, ease }}
        ><AppIcon name={step.icon as AppIconName} size={28} /></m.span>
      </div>
    </m.div>
  </div>;
}

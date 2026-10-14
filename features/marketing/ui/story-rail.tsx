"use client";

import Link from "next/link";
import { useEffect, useId, useState, type KeyboardEvent } from "react";
import { m, useReducedMotion } from "motion/react";
import { AppIcon, type AppIconName } from "@/features/icons/app-icon";

const ease = [0.22, 1, 0.36, 1] as const;
const presentationIntervalMs = 3800;
const steps = [
  { title: "Events", icon: "events", href: "/demo/events", copy: "Inspect timestamped product activity with deterministic counts and customer-level context.", visual: "events" },
  { title: "Funnels", icon: "funnels", href: "/demo/funnels", copy: "Measure strict sequential progression and observed noncompletion within explicit UTC windows.", visual: "funnels" },
  { title: "Feedback", icon: "feedback", href: "/demo/feedback", copy: "Connect fictional customer comments to prior event history without claiming causation.", visual: "feedback" },
  { title: "AI Insights", icon: "insights", href: "/demo/insights", copy: "Review minimized evidence before an explicitly approved BYOK request generates research hypotheses.", visual: "insights" },
  { title: "Missions", icon: "missions", href: "/demo/missions", copy: "Turn reviewed opportunities into editable work with source and evidence traceability.", visual: "missions" },
  { title: "Impact", icon: "impact", href: "/demo/impact", copy: "Compare compatible measurements while keeping observed change separate from causal impact.", visual: "impact" },
] as const;

type StoryVisual = typeof steps[number]["visual"];

function StageVisual({ visual, reduced }: { visual: StoryVisual; reduced: boolean }) {
  const transition = reduced ? { duration: 0 } : { duration: 0.46, ease };
  const common = { initial: reduced ? false as const : { opacity: 0, scale: 0.72 }, animate: { opacity: 1, scale: 1 }, transition };

  if (visual === "events") return <div className="story-stage-visual story-events" data-story-visual="events">
    {[0, 1, 2, 3].map((item) => <m.i key={item} {...common} transition={{ ...transition, delay: reduced ? 0 : item * 0.07 }} />)}
  </div>;
  if (visual === "funnels") return <div className="story-stage-visual story-funnels" data-story-visual="funnels">
    {[92, 70, 48].map((width, index) => <m.i key={width} initial={reduced ? false : { scaleX: 0 }} animate={{ scaleX: 1 }} transition={{ ...transition, delay: reduced ? 0 : index * 0.09 }} style={{ width: `${width}%`, transformOrigin: "left" }} />)}
  </div>;
  if (visual === "feedback") return <div className="story-stage-visual story-feedback" data-story-visual="feedback">
    <m.i {...common} /><m.i {...common} transition={{ ...transition, delay: reduced ? 0 : 0.1 }} /><m.span initial={reduced ? false : { scaleX: 0 }} animate={{ scaleX: 1 }} transition={transition} />
  </div>;
  if (visual === "insights") return <div className="story-stage-visual story-insights" data-story-visual="insights">
    <m.i {...common} /><m.i {...common} transition={{ ...transition, delay: reduced ? 0 : 0.1 }} /><m.i {...common} transition={{ ...transition, delay: reduced ? 0 : 0.2 }} />
  </div>;
  if (visual === "missions") return <div className="story-stage-visual story-missions" data-story-visual="missions">
    <m.i initial={reduced ? false : { y: 12 }} animate={{ y: 0 }} transition={transition}><b /><span /><span /></m.i>
  </div>;
  return <div className="story-stage-visual story-impact" data-story-visual="impact">
    <m.i initial={reduced ? false : { scaleY: 0 }} animate={{ scaleY: 0.58 }} transition={transition} /><m.i initial={reduced ? false : { scaleY: 0 }} animate={{ scaleY: 1 }} transition={{ ...transition, delay: reduced ? 0 : 0.12 }} /><m.span {...common} />
  </div>;
}

export function StoryRail() {
  const [active, setActive] = useState(0);
  const [direction, setDirection] = useState(1);
  const [isPlaying, setIsPlaying] = useState(false);
  const [pageVisible, setPageVisible] = useState(true);
  const reduced = Boolean(useReducedMotion());
  const prefix = useId();

  useEffect(() => {
    function updateVisibility() {
      setPageVisible(document.visibilityState !== "hidden");
    }
    updateVisibility();
    document.addEventListener("visibilitychange", updateVisibility);
    return () => document.removeEventListener("visibilitychange", updateVisibility);
  }, []);

  useEffect(() => {
    if (!isPlaying || !pageVisible || reduced) return;
    const timer = window.setInterval(() => {
      setDirection(1);
      setActive((current) => (current + 1) % steps.length);
    }, presentationIntervalMs);
    return () => window.clearInterval(timer);
  }, [isPlaying, pageVisible, reduced]);

  function select(next: number, manual = true) {
    setDirection(next >= active ? 1 : -1);
    setActive(next);
    if (manual) setIsPlaying(false);
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
  const presenting = isPlaying && pageVisible && !reduced;
  return <div className="story-explorer" data-motion-workflow="interactive" data-presentation={presenting ? "playing" : "paused"}>
    <div className="story-tabs">
      <div className="story-tab-list" role="tablist" aria-label="Product intelligence workflow">
        <span className="story-progress" aria-hidden="true"><m.i initial={false} animate={{ scaleX: (active + 1) / steps.length }} transition={reduced ? { duration: 0 } : { type: "spring", stiffness: 220, damping: 28 }} /></span>
        {steps.map((item, index) => <button key={item.title} id={`${prefix}-tab-${index}`} role="tab" aria-selected={active === index} aria-controls={`${prefix}-panel`} tabIndex={active === index ? 0 : -1} onClick={() => select(index)} onKeyDown={(event) => onKeyDown(event, index)}>
          <m.span className="story-active-indicator" initial={false} animate={{ opacity: active === index ? 1 : 0, scale: active === index ? 1 : 0.97 }} transition={reduced ? { duration: 0 } : { duration: 0.32, ease }} aria-hidden="true" />
          <m.span className="story-tab-icon" animate={{ scale: active === index && !reduced ? 1.08 : 1, y: active === index && !reduced ? -1 : 0 }} transition={reduced ? { duration: 0 } : { duration: 0.3, ease }}><AppIcon name={item.icon as AppIconName} /></m.span>
          <span className="story-tab-label">{item.title}</span>
          <small>{String(index + 1).padStart(2, "0")}</small>
        </button>)}
      </div>
      <div className="story-presentation-controls">
        <button type="button" className="story-play-button" aria-pressed={isPlaying} onClick={() => setIsPlaying((current) => !current)} disabled={reduced}><AppIcon name={isPlaying ? "pause" : "play"} size={16} />{isPlaying ? "Pause journey" : "Play journey"}</button>
        <span className="sr-only" role="status" aria-live="polite">{reduced ? "Presentation motion is disabled by your reduced motion preference." : presenting ? `Presentation playing. ${step.title} selected.` : `Presentation paused. ${step.title} selected.`}</span>
      </div>
    </div>
    <m.div key={step.title} className="story-panel" id={`${prefix}-panel`} role="tabpanel" aria-labelledby={`${prefix}-tab-${active}`} data-motion-workflow-panel={step.title} initial={reduced ? false : { x: direction * 18 }} animate={{ x: 0 }} transition={reduced ? { duration: 0 } : { duration: 0.38, ease }}>
        <div>
          <p className="marketing-kicker">Step {active + 1} of {steps.length}</p><h3>{step.title}</h3><p>{step.copy}</p>
          <Link className="text-link" href={step.href}>Explore {step.title} in the demo <AppIcon name="arrow-right" size={18} /></Link>
        </div>
        <div className="story-signal" aria-hidden="true">
          <svg className="story-signal-path" viewBox="0 0 220 220" focusable="false">
            <path className="story-signal-track" pathLength="1" d="M22 110 C58 28 162 192 198 110 C162 28 58 192 22 110" />
            <m.path key={`path-${active}`} className="story-signal-active" pathLength="1" d="M22 110 C58 28 162 192 198 110 C162 28 58 192 22 110" initial={reduced ? false : { strokeDashoffset: 1, opacity: 0.28 }} animate={{ strokeDashoffset: 1 - (active + 1) / steps.length, opacity: 0.9 }} transition={reduced ? { duration: 0 } : { duration: 0.48, ease }} />
            <m.circle key={`particle-${active}`} className="story-signal-particle" r="4" initial={reduced ? false : { cx: 22, cy: 110, opacity: 0 }} animate={reduced ? { cx: 110, cy: 110, opacity: 0.45 } : { cx: [22, 74, 146, 198], cy: [110, 70, 150, 110], opacity: [0, 1, 1, 0] }} transition={reduced ? { duration: 0 } : { duration: 0.78, ease: "easeInOut" }} />
          </svg>
          <StageVisual visual={step.visual} reduced={reduced} />
          <m.span className="story-stage-icon" initial={reduced ? false : { scale: 0.82, rotate: -6 }} animate={{ scale: 1, rotate: 0 }} transition={reduced ? { duration: 0 } : { duration: 0.4, ease }}><AppIcon name={step.icon as AppIconName} size={24} /></m.span>
        </div>
    </m.div>
  </div>;
}

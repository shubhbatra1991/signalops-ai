"use client";

import Link from "next/link";
import { useLayoutEffect, useRef, type ReactNode } from "react";
import {
  LazyMotion,
  MotionConfig,
  domAnimation,
  m,
  useAnimationControls,
  usePageInView,
  useReducedMotion,
} from "motion/react";
import type { DemoScreenModel } from "@/server/modules/demo/read-demo-screen";
import { AppIcon, type AppIconName } from "@/features/icons/app-icon";

const ease = [0.22, 1, 0.36, 1] as const;

export const heroItemVariants = {
  hidden: { opacity: 0.08, y: 28 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.64, ease } },
};

export function revealMotion(reduced: boolean, delay = 0, distance = 24) {
  return reduced
    ? { initial: false as const, transition: { duration: 0 } }
    : { initial: { opacity: 0.08, y: distance }, transition: { duration: 0.64, delay, ease } };
}

function useEntranceSequence(reduced: boolean) {
  const controls = useAnimationControls();

  useLayoutEffect(() => {
    if (reduced) {
      controls.set("visible");
      return;
    }

    controls.set("hidden");
    const frame = requestAnimationFrame(() => void controls.start("visible"));
    return () => cancelAnimationFrame(frame);
  }, [controls, reduced]);

  return controls;
}

export function MarketingMotionProvider({ children }: { children: ReactNode }) {
  const pageInView = usePageInView();
  return <LazyMotion features={domAnimation} strict>
    <MotionConfig reducedMotion="user">
      <div className="marketing-motion-root" data-motion-page={pageInView ? "active" : "paused"}>{children}</div>
    </MotionConfig>
  </LazyMotion>;
}

export function HeroContent({ sourceUrl }: { sourceUrl: string }) {
  const reduced = Boolean(useReducedMotion());
  const controls = useEntranceSequence(reduced);
  const containerVariants = {
    hidden: {},
    visible: { transition: { delayChildren: 0.08, staggerChildren: 0.12 } },
  };

  return <m.div
    className="hero-copy"
    data-motion-region="hero-copy"
    data-motion-sequence={reduced ? "reduced" : "cinematic"}
    initial={false}
    animate={controls}
    variants={containerVariants}
  >
    <m.p className="marketing-kicker" data-motion-step="eyebrow" variants={heroItemVariants}>Source-available · Self-hostable · Bring your own key</m.p>
    <h1>
      <m.span className="hero-line" data-motion-step="headline-1" variants={heroItemVariants}>From customer signals</m.span>
      <m.span className="hero-line" data-motion-step="headline-2" variants={heroItemVariants}>to product impact.</m.span>
    </h1>
    <m.p className="hero-lede" data-motion-step="supporting-copy" variants={heroItemVariants}>SignalOps-AI connects behavioural analytics, customer feedback and evidence-grounded AI research—then carries that evidence into product missions and measured outcomes.</m.p>
    <m.div className="hero-actions" data-motion-step="actions" variants={heroItemVariants}>
      <Link className="primary-button" href="/start">Explore the demo <AppIcon name="arrow-right" size={18} /></Link>
      <a className="secondary-button" href={sourceUrl} target="_blank" rel="noreferrer">View source <AppIcon name="arrow-right" size={18} /></a>
    </m.div>
    <m.p className="hero-note" data-motion-step="disclosure" variants={heroItemVariants}>Fictional demonstration data · Real deterministic calculations · No account required</m.p>
  </m.div>;
}

const previewVariants = {
  hidden: { opacity: 0.06, y: 34, scale: 0.96 },
  visible: {
    opacity: 1,
    y: 0,
    scale: 1,
    transition: { duration: 0.82, delay: 0.28, ease },
  },
};

const previewItemVariants = {
  hidden: { opacity: 0.08, y: 12 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.48, delay: 0.58, ease } },
};

export function AnimatedProductPreview({ preview }: { preview: DemoScreenModel }) {
  const reduced = Boolean(useReducedMotion());
  const controls = useEntranceSequence(reduced);
  const activity = preview.activity.slice(-10);
  const max = Math.max(1, ...activity.map((day) => day.events));
  const conversion = Math.max(0, Math.min(100, preview.funnel?.conversionRate ?? 0));

  return <m.div
    className="product-preview-motion"
    data-motion-region="product-preview"
    data-motion-sequence={reduced ? "reduced" : "cinematic"}
    initial={false}
    animate={controls}
    variants={previewVariants}
  >
    <div className="product-preview" aria-label="Calculated FlowPilot demonstration preview">
      <div className="preview-chrome"><span /><span /><span /><small>SignalOps-AI / Overview</small></div>
      <div className="preview-body">
        <aside aria-hidden="true"><b>S</b>{(["overview", "events", "funnels", "feedback", "insights", "missions"] as AppIconName[]).map((icon, index) => <i className={index === 0 ? "active" : ""} key={icon}><AppIcon name={icon} /></i>)}</aside>
        <div className="preview-content">
          <div className="preview-heading"><span><small>DEMONSTRATION DATA</small><strong>{preview.project.name}</strong></span><em>Full demo · UTC</em></div>
          <div className="preview-metrics">{[
            ["Total events", preview.eventSummary.totalEvents],
            ["Active users", preview.eventSummary.uniqueCustomers],
            ["Conversion", `${conversion.toFixed(1)}%`],
          ].map(([label, value]) => <m.span key={label} data-motion-preview="metric" variants={previewItemVariants}><small>{label}</small><strong>{value}</strong></m.span>)}</div>
          <div className="preview-chart"><div><small>Event activity</small><strong>Actual occurrences</strong></div><div className="preview-bars">{activity.map((day, index) => <m.i
            key={day.date}
            data-motion-preview="bar"
            custom={index}
            style={{ height: `${Math.max(8, day.events / max * 100)}%`, transformOrigin: "bottom" }}
            variants={{
              hidden: { scaleY: 0, opacity: 0.18 },
              visible: (barIndex: number) => ({ scaleY: 1, opacity: 0.84, transition: { duration: 0.58, delay: 0.7 + barIndex * 0.035, ease } }),
            }}
            title={`${day.date}: ${day.events} events`}
          />)}</div></div>
          <div className="preview-funnel">
            <span className="preview-funnel-progress" aria-hidden="true"><m.i
              data-motion-preview="funnel"
              style={{ width: `${conversion}%`, transformOrigin: "left" }}
              variants={{ hidden: { scaleX: 0, opacity: 0.3 }, visible: { scaleX: 1, opacity: 0.82, transition: { duration: 0.78, delay: 0.82, ease } } }}
            /></span>
            <span><small>Selected funnel</small><strong>{preview.funnel?.name ?? "No configured funnel"}</strong></span>
            <em>{preview.funnel?.entrants ?? 0} entrants → {preview.funnel?.completed ?? 0} completed</em>
          </div>
        </div>
      </div>
      <p><AppIcon name="information" size={16} /> Calculated from {preview.metadata.datasetVersion} fictional records</p>
    </div>
  </m.div>;
}

export function RevealSection({ children, className, id }: { children: ReactNode; className: string; id?: string }) {
  const reduced = Boolean(useReducedMotion());
  const controls = useAnimationControls();
  const sectionRef = useRef<HTMLElement>(null);

  useLayoutEffect(() => {
    if (reduced || typeof IntersectionObserver === "undefined") {
      controls.set("visible");
      return;
    }

    const section = sectionRef.current;
    if (!section) {
      controls.set("visible");
      return;
    }

    controls.set("hidden");
    const observer = new IntersectionObserver(([entry]) => {
      if (!entry?.isIntersecting) return;
      void controls.start("visible");
      observer.disconnect();
    }, { threshold: 0.16 });
    observer.observe(section);
    return () => observer.disconnect();
  }, [controls, reduced]);

  return <m.section
    ref={sectionRef}
    className={className}
    id={id}
    data-motion-region="section"
    initial={false}
    animate={controls}
    variants={{
      hidden: { opacity: 0.12, y: 32 },
      visible: { opacity: 1, y: 0, transition: { duration: 0.72, ease } },
    }}
  >{children}</m.section>;
}

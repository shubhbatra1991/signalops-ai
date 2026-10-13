"use client";

import { usePathname, useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { DEMO_GUIDE_DISMISSAL_KEY, type DemoGuideDescriptor, type DemoGuideStep } from "../domain/guide";
import { AppIcon, type AppIconName } from "@/features/icons/app-icon";

type GuideState = "pending" | "closed" | "welcome" | "active";
const guideIcons: Record<DemoGuideStep["id"], AppIconName> = {
  overview: "overview",
  funnel: "funnels",
  feedback: "feedback",
  ai: "insights",
  mission: "missions",
  impact: "impact",
};

export function DemoGuide({ guide }: { guide: DemoGuideDescriptor }) {
  const router = useRouter();
  const pathname = usePathname();
  const [state, setState] = useState<GuideState>("pending");
  const [stepIndex, setStepIndex] = useState(0);
  const launchButton = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    let dismissed = false;
    try { dismissed = window.localStorage.getItem(DEMO_GUIDE_DISMISSAL_KEY) === "1"; } catch { /* Safe default: offer the optional guide. */ }
    document.documentElement.dataset.demoGuide = dismissed ? "dismissed" : "available";
    queueMicrotask(() => setState(dismissed ? "closed" : "welcome"));
  }, []);
  const step = guide.steps[stepIndex];
  function start() {
    setStepIndex(0); setState("active"); router.push(guide.steps[0].href);
  }
  function dismiss() {
    try { window.localStorage.setItem(DEMO_GUIDE_DISMISSAL_KEY, "1"); } catch { /* Closing still works when storage is unavailable. */ }
    document.documentElement.dataset.demoGuide = "dismissed";
    setState("closed"); queueMicrotask(() => launchButton.current?.focus());
  }
  function restart() {
    document.documentElement.dataset.demoGuide = "available";
    setStepIndex(0); setState("active"); router.push(guide.steps[0].href);
  }
  function move(index: number) { setStepIndex(index); router.push(guide.steps[index].href); }

  if (state === "pending") return <div className="demo-guide-pending">
    <section className="demo-guide demo-guide-welcome demo-guide-pending-welcome">
      <div><p className="eyebrow">Optional guided demo</p><strong className="demo-guide-pending-title">See the evidence trail in six steps</strong><p>Follow real fictional records from calculated activity through mission planning and honest impact measurement. No account or AI key is required.</p></div>
      <div className="demo-guide-actions"><span className="primary-button">Start guided demo</span><span className="secondary-button">Not now</span></div>
    </section>
    <div className="demo-guide-launch demo-guide-pending-launch"><span className="secondary-button"><AppIcon name="help" />Demo guide</span></div>
  </div>;
  if (state === "closed") return <div className="demo-guide-launch"><button ref={launchButton} className="secondary-button" onClick={restart}><AppIcon name="help" />Demo guide</button></div>;
  if (state === "welcome") return <section className="demo-guide demo-guide-welcome" aria-labelledby="demo-guide-welcome-title">
    <div><p className="eyebrow">Optional guided demo</p><h2 id="demo-guide-welcome-title">See the evidence trail in six steps</h2><p>Follow real fictional records from calculated activity through mission planning and honest impact measurement. No account or AI key is required.</p></div>
    <div className="demo-guide-actions"><button className="primary-button" onClick={start}>Start guided demo</button><button className="secondary-button" onClick={dismiss}>Not now</button></div>
  </section>;
  return <section className="demo-guide" aria-labelledby="demo-guide-title">
    <div className="demo-guide-copy" aria-live="polite">
      <p className="eyebrow guide-step-label"><AppIcon name={guideIcons[step.id]} />{step.eyebrow} · Step {stepIndex + 1} of {guide.steps.length}</p><h2 id="demo-guide-title">{step.title}</h2><p>{step.description}</p>
      {!step.available && <p className="warning-note icon-message" role="status"><AppIcon name="warning" size={18} />{step.unavailableMessage}</p>}
      {pathname !== new URL(step.href, "https://demo.invalid").pathname && <p className="demo-guide-route-note">The guide will open the relevant application section when you continue.</p>}
    </div>
    <ol className="demo-guide-progress" aria-label="Guide progress">{guide.steps.map((item, index) => <li key={item.id} aria-current={index === stepIndex ? "step" : undefined}><span>{index + 1}</span><span className="sr-only">{item.title}</span></li>)}</ol>
    <div className="demo-guide-actions">
      {stepIndex > 0 && <button className="secondary-button" onClick={() => move(stepIndex - 1)}><AppIcon name="arrow-left" size={18} />Back</button>}
      {stepIndex < guide.steps.length - 1 ? <button className="primary-button" onClick={() => move(stepIndex + 1)}>Next<AppIcon name="arrow-right" size={18} /></button> : <button className="primary-button" onClick={dismiss}>Finish guide</button>}
      <button className="guide-skip" onClick={dismiss}>Skip guide</button>
    </div>
  </section>;
}

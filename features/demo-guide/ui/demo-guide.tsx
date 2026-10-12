"use client";

import { usePathname, useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { DEMO_GUIDE_DISMISSAL_KEY, type DemoGuideDescriptor } from "../domain/guide";

type GuideState = "closed" | "welcome" | "active";

export function DemoGuide({ guide }: { guide: DemoGuideDescriptor }) {
  const router = useRouter();
  const pathname = usePathname();
  const [state, setState] = useState<GuideState>("closed");
  const [stepIndex, setStepIndex] = useState(0);
  const launchButton = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    let dismissed = false;
    try { dismissed = window.localStorage.getItem(DEMO_GUIDE_DISMISSAL_KEY) === "1"; } catch { /* Safe default: offer the optional guide. */ }
    queueMicrotask(() => setState(dismissed ? "closed" : "welcome"));
  }, []);
  const step = guide.steps[stepIndex];
  function start() {
    setStepIndex(0); setState("active"); router.push(guide.steps[0].href);
  }
  function dismiss() {
    try { window.localStorage.setItem(DEMO_GUIDE_DISMISSAL_KEY, "1"); } catch { /* Closing still works when storage is unavailable. */ }
    setState("closed"); queueMicrotask(() => launchButton.current?.focus());
  }
  function restart() {
    setStepIndex(0); setState("active"); router.push(guide.steps[0].href);
  }
  function move(index: number) { setStepIndex(index); router.push(guide.steps[index].href); }

  if (state === "closed") return <div className="demo-guide-launch"><button ref={launchButton} className="secondary-button" onClick={restart}><span aria-hidden="true">?</span> Demo guide</button></div>;
  if (state === "welcome") return <section className="demo-guide demo-guide-welcome" aria-labelledby="demo-guide-welcome-title">
    <div><p className="eyebrow">Optional guided demo</p><h2 id="demo-guide-welcome-title">See the evidence trail in six steps</h2><p>Follow real fictional records from calculated activity through mission planning and honest impact measurement. No account or AI key is required.</p></div>
    <div className="demo-guide-actions"><button className="primary-button" onClick={start}>Start guided demo</button><button className="secondary-button" onClick={dismiss}>Not now</button></div>
  </section>;
  return <section className="demo-guide" aria-labelledby="demo-guide-title">
    <div className="demo-guide-copy" aria-live="polite">
      <p className="eyebrow">{step.eyebrow} · Step {stepIndex + 1} of {guide.steps.length}</p><h2 id="demo-guide-title">{step.title}</h2><p>{step.description}</p>
      {!step.available && <p className="warning-note" role="status">{step.unavailableMessage}</p>}
      {pathname !== new URL(step.href, "https://demo.invalid").pathname && <p className="demo-guide-route-note">The guide will open the relevant application section when you continue.</p>}
    </div>
    <ol className="demo-guide-progress" aria-label="Guide progress">{guide.steps.map((item, index) => <li key={item.id} aria-current={index === stepIndex ? "step" : undefined}><span>{index + 1}</span><span className="sr-only">{item.title}</span></li>)}</ol>
    <div className="demo-guide-actions">
      {stepIndex > 0 && <button className="secondary-button" onClick={() => move(stepIndex - 1)}>← Back</button>}
      {stepIndex < guide.steps.length - 1 ? <button className="primary-button" onClick={() => move(stepIndex + 1)}>Next →</button> : <button className="primary-button" onClick={dismiss}>Finish guide</button>}
      <button className="guide-skip" onClick={dismiss}>Skip guide</button>
    </div>
  </section>;
}

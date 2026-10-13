export const DEMO_GUIDE_DISMISSAL_KEY = "signalops.demo-guide.dismissed";
export const GUIDE_FEEDBACK_THEME = "integration-permissions";
export const guidePreferenceBootstrap = `(()=>{let state="available";try{if(localStorage.getItem(${JSON.stringify(DEMO_GUIDE_DISMISSAL_KEY)})==="1")state="dismissed"}catch{}document.documentElement.dataset.demoGuide=state})();`;

export interface DemoGuideStep {
  readonly id: "overview" | "funnel" | "feedback" | "ai" | "mission" | "impact";
  readonly title: string;
  readonly eyebrow: string;
  readonly description: string;
  readonly href: string;
  readonly available: boolean;
  readonly unavailableMessage?: string;
}

export interface DemoGuideDescriptor {
  readonly label: string;
  readonly steps: readonly DemoGuideStep[];
}

export interface DemoGuideEvidence {
  readonly projectId?: string;
  readonly funnelId?: string;
  readonly feedbackThemeId?: string;
}

export function buildDemoGuide(evidence: DemoGuideEvidence): DemoGuideDescriptor {
  const project = evidence.projectId;
  const funnel = evidence.funnelId;
  const theme = evidence.feedbackThemeId;
  const common = new URLSearchParams();
  if (project) common.set("project", project);
  common.set("range", "all");
  if (funnel) common.set("funnel", funnel);
  const feedbackQuery = new URLSearchParams(common);
  if (theme) feedbackQuery.set("theme", theme);
  feedbackQuery.set("sort", "desc");
  feedbackQuery.set("page", "1");
  const missionQuery = new URLSearchParams({ source: "feedback", range: "all" });
  if (project) missionQuery.set("project", project);
  if (theme) missionQuery.set("evidence", theme);
  const projectAvailable = Boolean(project);
  const funnelAvailable = projectAvailable && Boolean(funnel);
  const feedbackAvailable = projectAvailable && Boolean(theme);

  return {
    label: "Evidence-to-action demo guide",
    steps: [
      { id: "overview", title: "Start with the Overview", eyebrow: "Calculated activity", description: "Read the event, active-user, conversion and observed noncompletion metrics calculated from the fictional FlowPilot records.", href: "/demo", available: projectAvailable, unavailableMessage: projectAvailable ? undefined : "The demonstration project is unavailable. No replacement data was generated." },
      { id: "funnel", title: "Inspect the onboarding funnel", eyebrow: "Observed progression", description: "Follow the configured account-to-first-report journey. Counts use strict sequential progression in the selected UTC window; noncompletion is not abandonment.", href: funnelAvailable ? `/demo/funnels?${common}` : "/demo/funnels", available: funnelAvailable, unavailableMessage: funnelAvailable ? undefined : "The configured onboarding funnel is unavailable. Open Funnels to review the empty state." },
      { id: "feedback", title: "Follow a recurring feedback theme", eyebrow: "Customer evidence", description: "Review the authored Calendar permissions theme and open its linked event histories. The association supplies context and does not prove the feedback caused a funnel outcome.", href: feedbackAvailable ? `/demo/feedback?${feedbackQuery}` : "/demo/feedback", available: feedbackAvailable, unavailableMessage: feedbackAvailable ? undefined : "The expected feedback theme is unavailable. Open Feedback without a substituted theme." },
      { id: "ai", title: "Understand optional BYOK research", eyebrow: "No key required", description: "AI Insights can turn approved fictional evidence into research hypotheses when you configure your own provider. The guide never sends a request, and deterministic analytics remain available without AI.", href: "/demo/insights", available: true },
      { id: "mission", title: "Review a Product Mission", eyebrow: "Evidence to action", description: "Open the mission handoff for the same feedback theme. You decide whether to create and save it; existing browser-local missions are preserved.", href: feedbackAvailable ? `/demo/missions?${missionQuery}` : "/demo/missions", available: feedbackAvailable, unavailableMessage: feedbackAvailable ? undefined : "The expected evidence handoff is unavailable. Open Missions without creating or changing a record." },
      { id: "impact", title: "Separate completion from impact", eyebrow: "Measured outcomes", description: "Impact compares compatible evidence windows. A completed mission is a work state, never automatic proof of positive or causal impact.", href: "/demo/impact", available: true },
    ],
  };
}

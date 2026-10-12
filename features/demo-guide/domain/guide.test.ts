import { describe, expect, test } from "vitest";
import { buildDemoGuide, GUIDE_FEEDBACK_THEME } from "./guide";

describe("demo guide route contract", () => {
  test("uses the verified project, funnel and feedback evidence identifiers", () => {
    const guide = buildDemoGuide({ projectId: "demo-project-flowpilot", funnelId: "demo-funnel-onboarding", feedbackThemeId: GUIDE_FEEDBACK_THEME });
    expect(guide.steps.map((step) => step.id)).toEqual(["overview", "funnel", "feedback", "ai", "mission", "impact"]);
    expect(guide.steps[1].href).toContain("funnel=demo-funnel-onboarding");
    expect(guide.steps[2].href).toContain("theme=integration-permissions");
    expect(guide.steps[4].href).toContain("evidence=integration-permissions");
    expect(guide.steps.every((step) => step.available)).toBe(true);
  });

  test("missing evidence is disclosed and never replaced with another identifier", () => {
    const guide = buildDemoGuide({});
    expect(guide.steps.find((step) => step.id === "feedback")).toMatchObject({ href: "/app/feedback", available: false });
    expect(guide.steps.find((step) => step.id === "mission")).toMatchObject({ href: "/app/missions", available: false });
    expect(guide.steps.filter((step) => !step.available).every((step) => step.unavailableMessage)).toBe(true);
    expect(guide.steps.map((step) => step.href).join(" ")).not.toContain(GUIDE_FEEDBACK_THEME);
  });
});

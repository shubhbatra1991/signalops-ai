import type { FeedbackThemeId } from "@/features/customer-intelligence/domain/types";

/** Authored demo taxonomy/action templates, not automatically inferred insights. */
export const feedbackThemes: Readonly<Record<FeedbackThemeId, { label: string; opportunity: string }>> = {
  "integration-permissions": { label: "Calendar permissions", opportunity: "Review calendar permission guidance" },
  "integration-recovery": { label: "Integration recovery", opportunity: "Review timeout and retry guidance" },
  "onboarding-guidance": { label: "Onboarding guidance", opportunity: "Explore clearer workspace onboarding" },
  "report-navigation": { label: "Report navigation", opportunity: "Review the path to the first report" },
  "report-value": { label: "Report usefulness", opportunity: "Preserve and explore useful report workflows" },
  "report-export": { label: "Report exports", opportunity: "Explore demand for report exports" },
};
export const feedbackCategories = ["friction", "praise", "question", "feature-request"] as const;
export const feedbackSources = ["demo-survey", "demo-support", "demo-interview"] as const;
export const feedbackSentiments = ["positive", "neutral", "negative", "unlabelled"] as const;

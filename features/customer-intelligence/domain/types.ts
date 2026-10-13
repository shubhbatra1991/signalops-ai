/** Public showcase records only. These types do not represent authenticated users. */
export interface DemonstrationRecord {
  readonly dataOrigin: "demonstration";
}

export interface ProjectScope {
  readonly workspaceId: string;
  readonly projectId: string;
}

/** Canonical UTC ISO timestamps; start inclusive, end exclusive. */
export interface DateRange {
  readonly start: string;
  readonly end: string;
}

export interface Project extends DemonstrationRecord {
  readonly id: string;
  readonly workspaceId: string;
  readonly name: string;
  readonly productName: string;
  readonly description: string;
  readonly createdAt: string;
}

export interface Customer extends DemonstrationRecord, ProjectScope {
  readonly id: string;
  readonly displayName: string;
  readonly plan: "trial" | "starter";
  readonly createdAt: string;
}

export interface ProductEvent extends DemonstrationRecord, ProjectScope {
  readonly id: string;
  readonly customerId: string;
  readonly name: string;
  readonly occurredAt: string;
  readonly receivedAt: string;
  readonly properties: Readonly<Record<string, string | number | boolean>>;
}

export interface FunnelStep {
  readonly id: string;
  readonly position: number;
  readonly name: string;
  readonly eventName: string;
}

export interface Funnel extends DemonstrationRecord, ProjectScope {
  readonly id: string;
  readonly name: string;
  readonly conversionWindowMs: number;
  readonly steps: readonly FunnelStep[];
}

export interface CustomerFeedback extends DemonstrationRecord, ProjectScope {
  readonly id: string;
  readonly customerId: string;
  readonly submittedAt: string;
  readonly source: "demo-survey" | "demo-support" | "demo-interview";
  readonly category: "friction" | "praise" | "question" | "feature-request";
  readonly themeIds: readonly FeedbackThemeId[];
  readonly sentiment?: "positive" | "neutral" | "negative";
  readonly provenance: {
    readonly kind: "authored-fictional-fixture";
    readonly annotations: "fixture-authored-not-model-inferred";
  };
  readonly text: string;
  readonly relatedEventIds: readonly string[];
}

export type FeedbackThemeId = "integration-permissions" | "integration-recovery" |
  "onboarding-guidance" | "report-navigation" | "report-value" | "report-export";

export interface DemonstrationMetadata {
  readonly dataOrigin: "demonstration";
  readonly label: string;
  readonly datasetVersion: string;
  readonly description: string;
  readonly range: DateRange;
}

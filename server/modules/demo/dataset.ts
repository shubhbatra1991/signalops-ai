import "server-only";
import type {
  Customer,
  CustomerFeedback,
  DemonstrationMetadata,
  Funnel,
  ProductEvent,
  Project,
  FeedbackThemeId,
} from "@/features/customer-intelligence/domain/types";
import { DEMO_WORKSPACE_ID } from "@/features/workspaces/domain/context";

export interface DemoDataset {
  readonly metadata: DemonstrationMetadata;
  readonly projects: readonly Project[];
  readonly customers: readonly Customer[];
  readonly events: readonly ProductEvent[];
  readonly funnels: readonly Funnel[];
  readonly feedback: readonly CustomerFeedback[];
}

/** Fixed fictional fixture, not a simulator, live activity or generated AI output. */
export function createDemoDataset(): DemoDataset {
  const scope = { workspaceId: DEMO_WORKSPACE_ID, projectId: "demo-project-flowpilot" };
  const dataOrigin = "demonstration" as const;
  const baseTime = Date.parse("2026-06-01T10:00:00.000Z");
  const minute = 60_000;
  const day = 24 * 60 * minute;
  const customers: Customer[] = [];
  const events: ProductEvent[] = [];

  for (let index = 0; index < 32; index += 1) {
    const number = String(index + 1).padStart(2, "0");
    const customerId = `demo-customer-${number}`;
    const joinedAt = baseTime + (index % 14) * day + Math.floor(index / 14) * 60 * minute;
    const cohort = index % 8;
    customers.push({
      ...scope,
      dataOrigin,
      id: customerId,
      displayName: `Demo customer ${number}`,
      plan: cohort >= 4 ? "starter" : "trial",
      createdAt: new Date(joinedAt).toISOString(),
    });

    const addEvent = (
      suffix: string,
      name: string,
      offsetMinutes: number,
      properties: ProductEvent["properties"] = {},
    ) => {
      const occurredAt = joinedAt + offsetMinutes * minute;
      events.push({
        ...scope,
        dataOrigin,
        id: `${customerId}:${suffix}`,
        customerId,
        name,
        occurredAt: new Date(occurredAt).toISOString(),
        receivedAt: new Date(occurredAt + 1000).toISOString(),
        properties,
      });
    };

    addEvent("signup", "account_created", 0, { channel: index % 2 === 0 ? "search" : "referral" });
    addEvent("session-1", "session_started", 1);
    if (cohort === 0) continue;
    addEvent("workspace", "workspace_created", 4, { template: "client-delivery" });
    addEvent("integration-started-1", "integration_started", 9, { provider: "demo-calendar" });
    if (cohort === 1 || cohort === 2) {
      const reason = cohort === 1 ? "permission_unclear" : "setup_timeout";
      addEvent("integration-failed-1", "integration_failed", 11, { reason });
      addEvent("help", "help_article_viewed", 13, { article: "connect-calendar" });
      addEvent("integration-started-2", "integration_started", 18, { provider: "demo-calendar" });
      addEvent("integration-failed-2", "integration_failed", 20, { reason });
      continue;
    }
    addEvent("integration", "integration_connected", 12, { provider: "demo-calendar" });
    if (cohort === 3) continue;
    addEvent("report-1", "report_viewed", 22, { report: "delivery-health" });
    addEvent("report-2", "report_viewed", 24 * 60 + 10, { report: "delivery-health" });
  }

  const originalFeedbackSpecifications = [
    { customer: "02", event: "integration-failed-2", category: "friction", text: "The calendar permission request was unclear, so I stopped after trying again." },
    { customer: "03", event: "integration-failed-2", category: "friction", text: "Calendar setup timed out twice. The help article did not explain how to recover." },
    { customer: "04", event: "integration", category: "question", text: "The calendar connected, but I could not tell where to open the delivery report next." },
    { customer: "05", event: "report-1", category: "praise", text: "The first delivery report gave me a useful starting point for the team discussion." },
    { customer: "06", event: "report-2", category: "praise", text: "I returned to the delivery report the next day to review our client work." },
    { customer: "09", event: "signup", category: "question", text: "I created an account but wanted to understand the workspace templates before continuing." },
    { customer: "11", event: "integration-failed-2", category: "friction", text: "A retry ended with another timeout. I would like a clearer next step." },
    { customer: "13", event: "report-1", category: "praise", text: "Connecting the calendar and opening the first report was straightforward for our trial." },
  ] as const;
  const originalThemes: readonly FeedbackThemeId[] = [
    "integration-permissions", "integration-recovery", "report-navigation", "report-value",
    "report-value", "onboarding-guidance", "integration-recovery", "report-value",
  ];
  const feedbackSpecifications: readonly {
    customer: string; event: string; category: CustomerFeedback["category"]; text: string;
    source: CustomerFeedback["source"]; themeIds: readonly FeedbackThemeId[];
    sentiment?: CustomerFeedback["sentiment"];
  }[] = [
    ...originalFeedbackSpecifications.map((item, index) => ({ ...item, source: "demo-survey" as const,
      themeIds: [originalThemes[index]], sentiment: item.category === "praise" ? "positive" as const : item.category === "friction" ? "negative" as const : "neutral" as const })),
    { customer: "10", event: "integration-failed-2", source: "demo-support", category: "friction", themeIds: ["integration-permissions"], sentiment: "negative", text: "I was unsure which calendar permissions were required. A preview of the request would help." },
    { customer: "18", event: "integration-failed-2", source: "demo-interview", category: "question", themeIds: ["integration-permissions", "onboarding-guidance"], text: "Which permissions does the demo calendar need, and what comes after that step?" },
    { customer: "19", event: "integration-failed-2", source: "demo-support", category: "friction", themeIds: ["integration-recovery"], sentiment: "negative", text: "The second connection attempt timed out. I could not find a recovery checklist." },
    { customer: "27", event: "integration-failed-2", source: "demo-survey", category: "feature-request", themeIds: ["integration-recovery"], sentiment: "neutral", text: "Could connection setup keep my progress and offer a retry checklist after a timeout?" },
    { customer: "17", event: "signup", source: "demo-interview", category: "question", themeIds: ["onboarding-guidance"], sentiment: "neutral", text: "I wanted an example of a workspace template before choosing one." },
    { customer: "25", event: "signup", source: "demo-survey", category: "friction", themeIds: ["onboarding-guidance"], sentiment: "negative", text: "The first screen did not explain whether a workspace was for one client or my whole team." },
    { customer: "12", event: "integration", source: "demo-support", category: "friction", themeIds: ["report-navigation"], sentiment: "negative", text: "The connection succeeded, but I could not locate the first report from the setup screen." },
    { customer: "20", event: "integration", source: "demo-interview", category: "question", themeIds: ["report-navigation"], text: "Where do I open the delivery report after connecting the calendar?" },
    { customer: "07", event: "report-2", source: "demo-survey", category: "feature-request", themeIds: ["report-export"], sentiment: "neutral", text: "I would like to export the delivery report as a PDF for our weekly review." },
    { customer: "15", event: "report-1", source: "demo-interview", category: "feature-request", themeIds: ["report-export", "report-value"], sentiment: "positive", text: "The report is useful for our client review. Could I export a copy for the meeting?" },
    { customer: "23", event: "report-1", source: "demo-support", category: "feature-request", themeIds: ["report-export"], text: "Could we download the report so colleagues can review it offline?" },
    { customer: "08", event: "report-1", source: "demo-survey", category: "praise", themeIds: ["report-value"], sentiment: "positive", text: "The delivery report made our first planning discussion easier to follow." },
    { customer: "16", event: "report-2", source: "demo-interview", category: "praise", themeIds: ["report-value"], sentiment: "positive", text: "I came back to the report the following day because the overview was clear." },
    { customer: "24", event: "report-1", source: "demo-survey", category: "friction", themeIds: ["report-navigation"], sentiment: "negative", text: "I found the report, but the navigation labels made switching back to setup confusing." },
    { customer: "02", event: "help", source: "demo-support", category: "question", themeIds: ["integration-permissions"], sentiment: "neutral", text: "Does the calendar request need access to every calendar or only the selected one?" },
    { customer: "03", event: "help", source: "demo-survey", category: "feature-request", themeIds: ["integration-recovery"], sentiment: "neutral", text: "Please add a timeout troubleshooting section to the calendar help article." },
  ];
  const feedback: CustomerFeedback[] = feedbackSpecifications.map((specification, index) => {
    const customerId = `demo-customer-${specification.customer}`;
    const eventId = `${customerId}:${specification.event}`;
    const relatedEvent = events.find((event) => event.id === eventId);
    if (!relatedEvent) throw new Error("Demo feedback references a missing event.");
    return {
      ...scope,
      dataOrigin,
      id: `demo-feedback-${String(index + 1).padStart(2, "0")}`,
      customerId,
      submittedAt: new Date(Date.parse(relatedEvent.occurredAt) + 2 * minute).toISOString(),
      source: specification.source,
      category: specification.category,
      themeIds: specification.themeIds,
      sentiment: specification.sentiment,
      provenance: { kind: "authored-fictional-fixture", annotations: "fixture-authored-not-model-inferred" },
      text: specification.text,
      relatedEventIds: [eventId],
    };
  });

  return {
    metadata: {
      dataOrigin,
      label: "Demonstration data — fictional, not live customer activity",
      datasetVersion: "flowpilot-v2",
      description: "FlowPilot Demo is a fictional client-delivery SaaS. Customer labels, activity and feedback are authored fixtures, not real people or AI findings.",
      range: { start: "2026-06-01T00:00:00.000Z", end: "2026-06-16T00:00:00.000Z" },
    },
    projects: [{
      dataOrigin,
      id: scope.projectId,
      workspaceId: scope.workspaceId,
      name: "FlowPilot Demo onboarding",
      productName: "FlowPilot Demo (fictional SaaS)",
      description: "A fictional client-delivery workspace for small service teams.",
      createdAt: "2026-05-25T09:00:00.000Z",
    }],
    customers,
    events: events.sort((left, right) => Date.parse(left.occurredAt) - Date.parse(right.occurredAt)
      || (left.id < right.id ? -1 : left.id > right.id ? 1 : 0)),
    funnels: [{
      ...scope,
      dataOrigin,
      id: "demo-funnel-onboarding",
      name: "Demonstration onboarding: account to first report",
      conversionWindowMs: 7 * day,
      steps: [
        { id: "demo-step-account", position: 1, name: "Create account", eventName: "account_created" },
        { id: "demo-step-workspace", position: 2, name: "Create workspace", eventName: "workspace_created" },
        { id: "demo-step-integration", position: 3, name: "Connect calendar", eventName: "integration_connected" },
        { id: "demo-step-report", position: 4, name: "View first report", eventName: "report_viewed" },
      ],
    }],
    feedback,
  };
}

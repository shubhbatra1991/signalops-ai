import "server-only";
import type { DateRange, ProjectScope } from "@/features/customer-intelligence/domain/types";
import { aggregateEvents } from "@/domain/analytics/events";
import { calculateFunnel } from "@/domain/analytics/funnel";
import { demoRepository, getDemoMetadata } from "./repository";

/** Read-only application query. No metrics are stored or supplied as constants. */
export async function readDemoAnalytics(scope: ProjectScope, range?: DateRange, customerId?: string) {
  const metadata = getDemoMetadata();
  const selectedRange = range ?? metadata.range;
  const project = await demoRepository.getProject(scope);
  if (!project) return undefined;
  const [projectEvents, funnels] = await Promise.all([
    demoRepository.listEvents(scope, selectedRange),
    demoRepository.listFunnels(scope),
  ]);
  const events = projectEvents.filter((event) => !customerId || event.customerId === customerId);
  return {
    metadata,
    project,
    range: { ...selectedRange },
    eventSummary: aggregateEvents(events, { ...scope, range: selectedRange }),
    funnels: funnels.map((funnel) => ({
      funnelId: funnel.id,
      name: funnel.name,
      ...calculateFunnel(events, funnel, selectedRange),
    })),
  };
}

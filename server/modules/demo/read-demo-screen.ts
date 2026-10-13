import "server-only";
import { demoRepository } from "./repository";
import { readDemoContext } from "./read-demo-context";
import { readDemoAnalytics } from "./read-demo-analytics";
import { dailyActivity, exploreEvents, type SearchInput } from "@/features/customer-intelligence/domain/explorer";
import { percentage } from "@/domain/analytics/funnel";

/** Public fictional scope only; these identifiers do not authorize access to real data. */
export async function readDemoScreen(input: SearchInput) {
  const { projects, scope, customers, configuredFunnels, eventTypes, filters, corrected, range } = await readDemoContext(input);
  const analytics = await readDemoAnalytics(scope, range, filters.customer);
  if (!analytics) throw new Error("Demonstration analytics are unavailable.");
  const events = (await demoRepository.listEvents(scope, range)).filter((event) => !filters.customer || event.customerId === filters.customer);
  const funnel = analytics.funnels.find((item) => item.funnelId === filters.funnel);
  const dropOffCount = funnel ? funnel.entrants - funnel.completed : 0;
  return {
    ...analytics, projects, customers, configuredFunnels, eventTypes,
    filters, corrected, funnel, dropOffCount, dropOffRate: percentage(dropOffCount, funnel?.entrants ?? 0),
    activity: dailyActivity(events, range), explorer: exploreEvents(events, filters),
    topEvents: [...analytics.eventSummary.countsByEvent].sort((left, right) => right.count - left.count || (left.eventName < right.eventName ? -1 : left.eventName > right.eventName ? 1 : 0)),
  };
}
export type DemoScreenModel = Awaited<ReturnType<typeof readDemoScreen>>;

import "server-only";
import { compareMeasurements, measure, type ImpactContext, type MetricKind } from "@/features/impact/domain/impact";
import { demoRepository, getDemoMetadata } from "./repository";
import { readMissionContext } from "./read-mission-context";
import { DEMO_WORKSPACE_ID } from "@/features/workspaces/domain/context";

export async function readImpact(evaluatedAt: string): Promise<ImpactContext> {
  const metadata = getDemoMetadata();
  const projects = await demoRepository.listProjects(DEMO_WORKSPACE_ID);
  const options: ImpactContext["options"] = [];
  for (const project of projects) {
    const scope = { workspaceId: project.workspaceId, projectId: project.id };
    const [events, customers] = await Promise.all([demoRepository.listEvents(scope), demoRepository.listCustomers(scope)]);
    const eventNames = [undefined, ...new Set(events.map((event) => event.name).sort())];
    for (const kind of ["event_count", "active_customers"] satisfies MetricKind[]) {
      for (const eventName of eventNames) {
        const metric = { ...scope, kind, eventName, cohort: customers.map((customer) => customer.id).sort(), datasetVersion: metadata.datasetVersion, algorithmVersion: "impact-v1" as const };
        const baseline = measure(events, metric, { start: "2026-06-01T00:00:00.000Z", end: "2026-06-08T00:00:00.000Z" }, metadata.range);
        const comparison = measure(events, metric, { start: "2026-06-08T00:00:00.000Z", end: "2026-06-15T00:00:00.000Z" }, metadata.range);
        options.push({ id: `${project.id}:${kind}:${eventName ?? "all"}`, label: `${project.name} · ${kind === "event_count" ? "Event count" : "Unique active customers"} · ${eventName ?? "All event types"}`, result: compareMeasurements(baseline, comparison, evaluatedAt) });
      }
    }
  }
  return { missionContext: await readMissionContext(), options, datasetVersion: metadata.datasetVersion, coverage: metadata.range };
}

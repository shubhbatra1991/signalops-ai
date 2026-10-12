import "server-only";
import { demoRepository, getDemoMetadata } from "./repository";
import { parseFilters, selectedRange, type SearchInput } from "@/features/customer-intelligence/domain/explorer";

/** Shared public demo selection, not an authorization boundary. */
export async function readDemoContext(input: SearchInput) {
  const projects = await demoRepository.listProjects("demo-workspace");
  const project = projects.find((item) => item.id === input.project) ?? projects[0];
  if (!project) throw new Error("Demonstration project is unavailable.");
  const scope = { workspaceId: project.workspaceId, projectId: project.id };
  const [customers, funnels, allEvents] = await Promise.all([
    demoRepository.listCustomers(scope), demoRepository.listFunnels(scope), demoRepository.listEvents(scope),
  ]);
  const eventTypes = [...new Set(allEvents.map((event) => event.name))].sort();
  const parsed = parseFilters(input, {
    projects: projects.map((item) => item.id), customers: customers.map((item) => item.id),
    funnels: funnels.map((item) => item.id), eventTypes,
  });
  return { ...parsed, projects, project, scope, customers, configuredFunnels: funnels,
    allEvents, eventTypes, metadata: getDemoMetadata(), range: selectedRange(parsed.filters.range) };
}

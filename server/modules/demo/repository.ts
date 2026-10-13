import "server-only";
import type { ProjectScope } from "@/features/customer-intelligence/domain/types";
import type { DemoDataRepository } from "@/features/workspaces/domain/repository";
import { demoDataContext } from "@/features/workspaces/domain/context";
import { filterEvents } from "@/domain/analytics/events";
import { createDemoDataset } from "./dataset";
import { filterFeedback } from "@/features/feedback/domain/feedback";

const dataset = createDemoDataset();

function inScope(record: ProjectScope, scope: ProjectScope): boolean {
  return record.workspaceId === scope.workspaceId && record.projectId === scope.projectId;
}

/** Fresh copies prevent callers from mutating the shared fixture between reads. */
export const demoRepository: DemoDataRepository = {
  context: demoDataContext,
  async listProjects(workspaceId) {
    return structuredClone(dataset.projects.filter((project) => project.workspaceId === workspaceId));
  },
  async getProject(scope) {
    return structuredClone(dataset.projects.find((project) =>
      project.workspaceId === scope.workspaceId && project.id === scope.projectId));
  },
  async listCustomers(scope) {
    return structuredClone(dataset.customers.filter((customer) => inScope(customer, scope)));
  },
  async listEvents(scope, range = dataset.metadata.range) {
    return structuredClone(filterEvents(dataset.events, { ...scope, range }));
  },
  async listFunnels(scope) {
    return structuredClone(dataset.funnels.filter((funnel) => inScope(funnel, scope)));
  },
  async listFeedback(scope, range = dataset.metadata.range) {
    return structuredClone(filterFeedback(dataset.feedback, { ...scope, range }));
  },
};

export function getDemoMetadata() {
  return structuredClone(dataset.metadata);
}

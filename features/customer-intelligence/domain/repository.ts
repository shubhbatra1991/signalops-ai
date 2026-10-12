import type {
  Customer,
  CustomerFeedback,
  DateRange,
  Funnel,
  ProductEvent,
  Project,
  ProjectScope,
} from "./types";

/** Storage-independent reads. Scope is a filter, never proof of authorization. */
export interface CustomerIntelligenceRepository {
  listProjects(workspaceId: string): Promise<readonly Project[]>;
  getProject(scope: ProjectScope): Promise<Project | undefined>;
  listCustomers(scope: ProjectScope): Promise<readonly Customer[]>;
  listEvents(scope: ProjectScope, range?: DateRange): Promise<readonly ProductEvent[]>;
  listFunnels(scope: ProjectScope): Promise<readonly Funnel[]>;
  listFeedback(scope: ProjectScope, range?: DateRange): Promise<readonly CustomerFeedback[]>;
}

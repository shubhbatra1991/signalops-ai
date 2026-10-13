import type { Customer, CustomerFeedback, DateRange, Funnel, ProductEvent, Project } from "@/features/customer-intelligence/domain/types";
import type { CustomerIntelligenceRepository } from "@/features/customer-intelligence/domain/repository";
import type { AuthorizedWorkspaceContext, DemoDataContext } from "./context";

/** Public, fictional reads. This marker prevents callers from presenting them as private workspace data. */
export interface DemoDataRepository extends CustomerIntelligenceRepository {
  readonly context: DemoDataContext;
}

/** Future persistent reads require a server-verified context, never a client-supplied workspace ID. */
export interface AuthenticatedWorkspaceDataRepository {
  listProjects(context: AuthorizedWorkspaceContext): Promise<readonly Project[]>;
  listCustomers(context: AuthorizedWorkspaceContext, projectId: string): Promise<readonly Customer[]>;
  listEvents(context: AuthorizedWorkspaceContext, projectId: string, range?: DateRange): Promise<readonly ProductEvent[]>;
  listFunnels(context: AuthorizedWorkspaceContext, projectId: string): Promise<readonly Funnel[]>;
  listFeedback(context: AuthorizedWorkspaceContext, projectId: string, range?: DateRange): Promise<readonly CustomerFeedback[]>;
}

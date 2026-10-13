declare const authorizedWorkspaceContext: unique symbol;

export const DEMO_WORKSPACE_ID = "demo-workspace";

export interface DemoDataContext {
  readonly kind: "demo";
  readonly workspaceId: typeof DEMO_WORKSPACE_ID;
  readonly dataOrigin: "demonstration";
}

export const demoDataContext: DemoDataContext = {
  kind: "demo",
  workspaceId: DEMO_WORKSPACE_ID,
  dataOrigin: "demonstration",
};

/** A URL slug is routing input only and grants no workspace access. */
export interface WorkspaceRouteIntent {
  readonly kind: "untrusted-workspace-route";
  readonly workspaceSlug: string;
}

export interface WorkspaceIdentity {
  readonly userId: string;
  readonly sessionId: string;
}

export type WorkspaceRole = "owner" | "member";

/** Stage 4.2 may construct this only after server-side session and membership checks. */
export interface AuthorizedWorkspaceContext {
  readonly kind: "authenticated-workspace";
  readonly identity: WorkspaceIdentity;
  readonly workspaceId: string;
  readonly workspaceSlug: string;
  readonly membershipId: string;
  readonly role: WorkspaceRole;
  readonly [authorizedWorkspaceContext]: true;
}

export function readWorkspaceRouteIntent(value: string): WorkspaceRouteIntent | undefined {
  return /^[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?$/.test(value)
    ? { kind: "untrusted-workspace-route", workspaceSlug: value }
    : undefined;
}

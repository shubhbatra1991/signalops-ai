import "server-only";

type LogLevel = "info" | "warn" | "error";

type LogContext = {
  requestId?: string;
  workspaceId?: string;
  projectId?: string;
  durationMs?: number;
};

// Use developer-defined event names and opaque IDs, never user text or secrets.
// Explicit fields prevent arbitrary payloads and Error objects being serialized.
export function logServerEvent(
  level: LogLevel,
  event: string,
  context: LogContext = {},
): void {
  const entry = {
    timestamp: new Date().toISOString(),
    level,
    event,
    requestId: context.requestId,
    workspaceId: context.workspaceId,
    projectId: context.projectId,
    durationMs: context.durationMs,
  };

  console[level](JSON.stringify(entry));
}

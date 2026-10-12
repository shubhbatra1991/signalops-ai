import { afterEach, describe, expect, test, vi } from "vitest";

// Next enforces this marker at build time. Only this Node unit test replaces it.
vi.mock("server-only", () => ({}));

import { logServerEvent } from "@/server/observability/logger";

afterEach(() => vi.useRealTimers());

describe("server logging", () => {
  test.each(["info", "warn", "error"] as const)(
    "writes a JSON record to the %s output with correlation context",
    (level) => {
      vi.useFakeTimers();
      vi.setSystemTime(new Date("2026-10-10T12:00:00.000Z"));
      const output = vi.spyOn(console, level).mockImplementation(() => {});

      logServerEvent(level, "foundation.check", {
        requestId: "synthetic-request",
        workspaceId: "synthetic-workspace",
        projectId: "synthetic-project",
        durationMs: 0,
      });

      expect(output).toHaveBeenCalledExactlyOnceWith(
        JSON.stringify({
          timestamp: "2026-10-10T12:00:00.000Z",
          level,
          event: "foundation.check",
          requestId: "synthetic-request",
          workspaceId: "synthetic-workspace",
          projectId: "synthetic-project",
          durationMs: 0,
        }),
      );
    },
  );

  test("does not serialize unexpected payload fields or error details", () => {
    const output = vi.spyOn(console, "error").mockImplementation(() => {});
    const context = {
      requestId: "synthetic-request",
      payload: { privateText: "must-not-be-logged" },
      error: new Error("internal-details-must-not-be-logged"),
    };

    logServerEvent("error", "foundation.failed", context);

    expect(output).toHaveBeenCalledOnce();
    expect(output).toHaveBeenCalledWith(
      expect.not.stringContaining("must-not-be-logged"),
    );
    expect(output).toHaveBeenCalledWith(
      expect.stringContaining('"requestId":"synthetic-request"'),
    );
  });
});

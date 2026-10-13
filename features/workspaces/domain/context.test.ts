import { describe, expect, test } from "vitest";
import { demoDataContext, readWorkspaceRouteIntent } from "./context";

describe("workspace data contexts", () => {
  test("labels the public fixture as demonstration data", () => {
    expect(demoDataContext).toEqual({ kind: "demo", workspaceId: "demo-workspace", dataOrigin: "demonstration" });
  });

  test.each(["personal", "alice-2", "a"])("accepts a syntactically safe but untrusted slug: %s", (workspaceSlug) => {
    expect(readWorkspaceRouteIntent(workspaceSlug)).toEqual({ kind: "untrusted-workspace-route", workspaceSlug });
  });

  test.each(["", "UPPER", "-leading", "trailing-", "path/segment", "a".repeat(64)])("rejects malformed route input: %s", (workspaceSlug) => {
    expect(readWorkspaceRouteIntent(workspaceSlug)).toBeUndefined();
  });
});

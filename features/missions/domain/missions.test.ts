import { expect, test } from "vitest";
import { createMission, updateMission, missionSchema, type MissionContext, type MissionInput } from "./missions";
import { browserMissionRepository, missionStorageKey } from "./repository";

const context: MissionContext = { projects: [{ id: "demo-project", name: "Demo" }], evidence: [
  { reference: { project: "demo-project", range: "all", kind: "feedback", evidenceId: "value", id: "theme:value" }, label: "Value", href: "/feedback?theme=value", eventsHref: "/events", baseline: "Calculated baseline" },
  { reference: { project: "demo-project", range: "all", kind: "funnel", evidenceId: "step", id: "step:step" }, label: "Step", href: "/funnels", eventsHref: "/events", baseline: "Calculated baseline" },
] };
const input: MissionInput = { projectId: "demo-project", title: "Investigate guidance", objective: "Review setup with volunteers", status: "backlog", priority: "medium", source: "manual", references: [], successCriteria: "Document findings and review them" };
const id = "6a8f69fb-538a-4f2a-8ad7-3c17ff68381a";
const at = "2026-10-12T10:00:00.000Z";
const later = "2026-10-13T10:00:00.000Z";
const mission = () => createMission(input, context, id, at);

test("manual creation validates and trims user fields without generated outcomes", () => {
  const result = createMission({ ...input, title: "  Investigate guidance  " }, context, id, at);
  expect(result.title).toBe(input.title); expect(result.createdAt).toBe(at); expect(result.completedAt).toBeUndefined();
  expect(result).not.toHaveProperty("outcome");
});
test.each(["", "a", "x".repeat(161), "gsk_abcdefghijklmnopqrstuv"])("rejects invalid/credential-shaped title %s", (title) => {
  expect(() => createMission({ ...input, title }, context, id, at)).toThrow();
});
test("editing and completion/reopening/cancellation have consistent timestamps", () => {
  const completed = updateMission(mission(), { ...input, status: "completed" }, context, later);
  expect(completed.completedAt).toBe(later);
  expect(updateMission(completed, { ...input, status: "completed", title: "Revised research" }, context, "2026-10-14T00:00:00.000Z").completedAt).toBe(later);
  const reopened = updateMission(completed, { ...input, status: "in_progress" }, context, later);
  expect(reopened.completedAt).toBeUndefined(); expect(reopened.createdAt).toBe(at);
  expect(updateMission(reopened, { ...input, status: "cancelled" }, context, later).completedAt).toBeUndefined();
  expect(updateMission(reopened, input, context, at).updatedAt).toBe(later);
});
test("stored lifecycle timestamps must match completed status", () => {
  expect(missionSchema.safeParse({ ...mission(), status: "completed" }).success).toBe(false);
  expect(missionSchema.safeParse({ ...mission(), updatedAt: "2025-01-01T00:00:00Z" }).success).toBe(false);
});
test.each(["feedback", "funnel"] as const)("creates %s mission from valid scoped evidence", (source) => {
  const reference = context.evidence.find((item) => item.reference.kind === source)!.reference;
  expect(createMission({ ...input, source, references: [reference] }, context, id, at).references).toEqual([reference]);
});
test.each(["project", "id", "range", "duplicate"])("rejects cross-project/stale/duplicate evidence: %s", (field) => {
  const reference = context.evidence[0].reference;
  const references = field === "duplicate" ? [reference, reference] : [{ ...reference, [field]: field === "range" ? "second-week" : "unknown" }];
  expect(() => createMission({ ...input, source: "feedback", references }, context, id, at)).toThrow();
});
test("AI mission requires lightweight provenance and never accepts raw credential/prompt fields", () => {
  const ai = { ...input, source: "ai_insight", references: [context.evidence[0].reference], provenance: { insightId: id, provider: "groq", model: "openai/gpt-oss-20b", promptVersion: "insight-prompt-v1", datasetVersion: "flowpilot-v2", generatedAt: at } };
  expect(createMission(ai, context, id, at).provenance?.insightId).toBe(id);
  expect(() => createMission({ ...ai, apiKey: "synthetic-secret" }, context, id, at)).toThrow();
  expect(() => createMission({ ...ai, prompt: "raw prompt" }, context, id, at)).toThrow();
  expect(() => createMission({ ...ai, provenance: undefined }, context, id, at)).toThrow();
});
function storageFixture(initial: string | null = null) {
  let value = initial;
  const storage = { getItem: () => value, setItem: (_key: string, next: string) => { value = next; }, removeItem: () => { value = null; } };
  return { storage, read: () => value };
}
test("versioned local storage restores validated records and reset touches only its key", () => {
  const { storage, read } = storageFixture(); const repository = browserMissionRepository(() => storage);
  repository.load(); repository.save([mission()]);
  expect(JSON.parse(read()!)).toEqual({ version: 1, missions: [mission()] });
  expect(browserMissionRepository(() => storage).load().missions).toEqual([mission()]);
  expect(repository.reset().missions).toEqual([]); expect(read()).toBeNull(); expect(missionStorageKey).toBe("signalops.missions.v1");
});
test.each(["not JSON", '{"version":2,"important":"preserve"}', '{"version":1,"missions":[{}]}', JSON.stringify({ version: 1, missions: [{ ...mission(), apiKey: "secret" }] }), "x".repeat(262145)])("invalid/unknown/oversized data is preserved: %s", (original) => {
  const { storage, read } = storageFixture(original); const repository = browserMissionRepository(() => storage);
  expect(repository.load().writable).toBe(false); expect(() => repository.save([mission()])).toThrow(); expect(read()).toBe(original);
});
test("storage unavailability, quota failure and concurrent edits do not overwrite prior records", () => {
  expect(browserMissionRepository(() => { throw new Error(); }).load().writable).toBe(false);
  const { storage, read } = storageFixture(); const repository = browserMissionRepository(() => storage); repository.load();
  storage.setItem = () => { throw new Error("quota"); }; expect(() => repository.save([mission()])).toThrow(); expect(read()).toBeNull();
  const concurrent = storageFixture(); const first = browserMissionRepository(() => concurrent.storage); first.load();
  concurrent.storage.setItem(missionStorageKey, '{"version":2}'); expect(() => first.save([mission()])).toThrow(); expect(concurrent.read()).toBe('{"version":2}');
});

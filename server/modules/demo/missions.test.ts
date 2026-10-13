import { expect, test, vi } from "vitest";
vi.mock("server-only", () => ({}));
import { readMissionContext } from "./read-mission-context";
import { reconstructEvidence } from "@/server/ai/insight-evidence";
test("mission sources reuse actual scoped feedback and funnel facts without customer rows", async () => {
  const context = await readMissionContext();
  expect(context.evidence.some((item) => item.reference.kind === "feedback")).toBe(true);
  expect(context.evidence.some((item) => item.reference.kind === "funnel")).toBe(true);
  for (const item of context.evidence) {
    const facts = (await reconstructEvidence(item.reference)).facts;
    expect(facts).toContainEqual({ id: item.reference.id, observation: item.baseline, href: item.href });
    expect(context.projects.some((project) => project.id === item.reference.project)).toBe(true);
  }
  expect(JSON.stringify(context)).not.toMatch(/customerId|apiKey|"text"|properties/);
});

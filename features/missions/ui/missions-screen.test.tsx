// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import { cleanup, fireEvent, render, screen, within, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, expect, test, vi } from "vitest";
import { AiSessionProvider, useAiSession } from "@/features/ai/ui/ai-session";
import type { Insight } from "@/features/ai/domain/insights";
import { MissionsScreen } from "./missions-screen";
import { missionStorageKey } from "../domain/repository";
import type { MissionContext } from "../domain/missions";

const reference = { project: "demo-project", range: "all", kind: "feedback", evidenceId: "value", id: "theme:value" } as const;
const context: MissionContext = { projects: [{ id: "demo-project", name: "Demo project" }], evidence: [{ reference, label: "Feedback value", href: "/feedback?theme=value", eventsHref: "/events?project=demo-project", baseline: "Calculated fixture baseline" }] };
const insight: Insight = { schemaVersion: "insight-v1", id: "6a8f69fb-538a-4f2a-8ad7-3c17ff68381a", title: "Research report value", observation: "Verified fixture observation", evidenceReferenceIds: [reference.id],
  sources: [{ id: reference.id, href: "/feedback?theme=value", observation: "Verified fixture observation" }], hypotheses: ["Could reports help?"], limitations: ["Impact unknown"], recommendedAction: "Interview volunteers about reports.",
  provenance: { provider: "groq", model: "openai/gpt-oss-20b", promptVersion: "insight-prompt-v1", datasetVersion: "flowpilot-v2" }, generatedAt: "2026-10-12T00:00:00.000Z", selection: reference };
beforeEach(() => {
  localStorage.clear();
  Object.defineProperty(HTMLDialogElement.prototype, "showModal", { configurable: true, value: function (this: HTMLDialogElement) { this.setAttribute("open", ""); } });
  Object.defineProperty(HTMLDialogElement.prototype, "close", { configurable: true, value: function (this: HTMLDialogElement) { this.removeAttribute("open"); } });
  vi.stubGlobal("fetch", vi.fn().mockResolvedValue(Response.json({ status: "unconfigured", serverTestsEnabled: false, deployment: { mode: "self-hosted", providerRequestsEnabled: true, configurationValid: true } })));
});
afterEach(() => { cleanup(); localStorage.clear(); vi.restoreAllMocks(); vi.unstubAllGlobals(); });
function SessionControls() {
  const { addInsight, configure, disconnect } = useAiSession();
  return <><button onClick={() => { configure({ provider: "groq", model: "openai/gpt-oss-20b", apiKey: "synthetic-memory-secret" }); addInsight(insight); }}>Add test draft</button><button onClick={disconnect}>Disconnect test session</button></>;
}
function setup(seed: Record<string, string> = {}) { render(<AiSessionProvider><SessionControls /><MissionsScreen context={context} seed={seed} /></AiSessionProvider>); }
async function ready() { await waitFor(() => expect(screen.getByRole("button", { name: "New Mission" })).toBeEnabled()); }
function fill() {
  fireEvent.change(screen.getByLabelText("Mission title"), { target: { value: "Research guidance" } });
  fireEvent.change(screen.getByLabelText("Objective"), { target: { value: "Interview volunteers about guidance" } });
  fireEvent.change(screen.getByLabelText("Success criteria"), { target: { value: "Document research findings" } });
}
function confirmSave() { fireEvent.click(screen.getByRole("checkbox")); fireEvent.click(screen.getByRole("button", { name: "Save mission" })); }
test("manual workflow is accessible and independent of AI configuration; explicit save, edit, completion and list", async () => {
  setup(); await ready(); fireEvent.click(screen.getByRole("button", { name: "New Mission" }));
  expect(screen.getByRole("dialog", { name: "Review new mission" })).toBeVisible();
  expect(screen.getByRole("button", { name: "Save mission" })).toBeDisabled(); fill();
  expect(localStorage.getItem(missionStorageKey)).toBeNull(); confirmSave();
  expect(screen.getByRole("heading", { name: "Research guidance" })).toBeVisible();
  fireEvent.change(screen.getByLabelText("Status for Research guidance"), { target: { value: "completed" } });
  fireEvent.click(screen.getByRole("button", { name: "View details for Research guidance" }));
  expect(screen.getByRole("dialog")).toHaveTextContent("positive impact has not been verified");
  fireEvent.click(screen.getByRole("button", { name: "Close details" }));
  fireEvent.change(screen.getByLabelText("Mission view"), { target: { value: "list" } });
  expect(screen.getByRole("region", { name: "Mission list" })).toBeVisible();
  fireEvent.click(screen.getByRole("button", { name: "View details for Research guidance" }));
  fireEvent.click(screen.getByRole("button", { name: "Edit Research guidance" }));
  fireEvent.change(screen.getByLabelText("Mission title"), { target: { value: "Edited research" } }); confirmSave();
  expect(screen.getByRole("heading", { name: "Edited research" })).toBeVisible();
  expect(fetch).toHaveBeenCalledTimes(1);
});
test("feedback link opens canonical evidence review and persists only minimal references", async () => {
  setup({ source: "feedback", project: reference.project, range: "all", evidence: "value" }); await ready();
  fireEvent.click(screen.getByRole("button", { name: "Review linked Feedback value" }));
  expect(screen.getByRole("link", { name: "theme:value" })).toHaveAttribute("href", "/feedback?theme=value");
  expect(screen.getByText(/Current calculated baseline/)).toBeVisible(); fill(); confirmSave();
  const saved = localStorage.getItem(missionStorageKey)!;
  expect(JSON.parse(saved).missions[0].references).toEqual([reference]);
  expect(saved).not.toContain("Calculated fixture baseline");
});
test("AI proposal requires review and confirmation; persistence excludes session key and raw insight", async () => {
  setup(); await ready(); fireEvent.click(screen.getByRole("button", { name: "Add test draft" }));
  fireEvent.click(screen.getByRole("button", { name: "Review AI proposal: Research report value" }));
  expect(screen.getByLabelText("Objective")).toHaveValue(insight.recommendedAction);
  expect(localStorage.getItem(missionStorageKey)).toBeNull();
  fireEvent.change(screen.getByLabelText("Success criteria"), { target: { value: "Review interview findings" } }); confirmSave();
  const saved = localStorage.getItem(missionStorageKey)!;
  expect(JSON.parse(saved).missions[0].references).toEqual([reference]);
  expect(JSON.parse(saved).missions[0].provenance).toEqual({ insightId: insight.id, ...insight.provenance, generatedAt: insight.generatedAt });
  expect(saved).toContain("ai_insight"); expect(saved).toContain(insight.id);
  for (const secret of ["synthetic-memory-secret", insight.observation, "hypotheses", "apiKey", "prompt\""]) expect(saved).not.toContain(secret);
});
test("missing AI draft and invalid evidence URL never create or regenerate a mission", async () => {
  setup({ insight: insight.id, source: "feedback", project: "other", range: "all", evidence: "value" }); await ready();
  expect(screen.getByText(/memory-only insight draft is no longer available/)).toBeVisible();
  expect(screen.getByText(/No source was substituted/)).toBeVisible();
  expect(localStorage.getItem(missionStorageKey)).toBeNull(); expect(fetch).toHaveBeenCalledTimes(1);
});
test("a draft disappearing during review blocks saving without a provider call", async () => {
  setup(); await ready(); fireEvent.click(screen.getByRole("button", { name: "Add test draft" }));
  fireEvent.click(screen.getByRole("button", { name: "Review AI proposal: Research report value" }));
  fireEvent.change(screen.getByLabelText("Success criteria"), { target: { value: "Review interview findings" } });
  fireEvent.click(screen.getByRole("button", { name: "Disconnect test session" })); confirmSave();
  expect(screen.getByRole("dialog")).toHaveTextContent("The memory-only AI draft is no longer available");
  expect(localStorage.getItem(missionStorageKey)).toBeNull(); expect(fetch).toHaveBeenCalledTimes(1);
});
test("search and status filters hide records without deleting them and reset restores the list", async () => {
  setup(); await ready(); fireEvent.click(screen.getByRole("button", { name: "New Mission" })); fill(); confirmSave();
  fireEvent.change(screen.getByLabelText("Search missions"), { target: { value: "unmatched" } });
  expect(screen.queryByRole("heading", { name: "Research guidance" })).not.toBeInTheDocument();
  fireEvent.click(screen.getByRole("button", { name: "Reset filters" }));
  fireEvent.change(screen.getByLabelText("Status", { exact: true }), { target: { value: "cancelled" } });
  expect(screen.queryByRole("heading", { name: "Research guidance" })).not.toBeInTheDocument();
  fireEvent.click(screen.getByRole("button", { name: "Reset filters" }));
  expect(screen.getByRole("heading", { name: "Research guidance" })).toBeVisible();
  expect(JSON.parse(localStorage.getItem(missionStorageKey)!).missions).toHaveLength(1);
});
test("cancel creation writes nothing; reset requires a separate confirmed action and can be declined", async () => {
  setup(); await ready(); fireEvent.click(screen.getByRole("button", { name: "New Mission" })); fill();
  fireEvent.click(screen.getByRole("button", { name: "Cancel" })); expect(localStorage.getItem(missionStorageKey)).toBeNull();
  fireEvent.click(screen.getByRole("button", { name: "New Mission" })); fill(); confirmSave();
  fireEvent.click(screen.getByRole("button", { name: "Reset local missions" }));
  fireEvent.click(screen.getByRole("button", { name: "Keep missions" })); expect(localStorage.getItem(missionStorageKey)).not.toBeNull();
  fireEvent.click(screen.getByRole("button", { name: "Reset local missions" }));
  const dialog = screen.getByRole("dialog", { name: "Reset all local missions?" }); fireEvent.click(within(dialog).getByRole("button", { name: "Confirm reset" }));
  expect(localStorage.getItem(missionStorageKey)).toBeNull();
});
test("unknown storage version is preserved and new mission is disabled", async () => {
  localStorage.setItem(missionStorageKey, '{"version":9,"userData":"preserve"}'); setup();
  await screen.findByText(/Unsupported mission storage version/);
  expect(screen.getByRole("button", { name: "New Mission" })).toBeDisabled();
  expect(localStorage.getItem(missionStorageKey)).toContain("preserve");
});

test("compact cards hide full fields; details expose measurement, evidence and provenance after remount", async () => {
  setup(); await ready(); fireEvent.click(screen.getByRole("button", { name: "Add test draft" }));
  fireEvent.click(screen.getByRole("button", { name: "Review AI proposal: Research report value" }));
  fireEvent.change(screen.getByLabelText("Mission title"), { target: { value: "Reviewed report research" } });
  fireEvent.change(screen.getByLabelText("Objective"), { target: { value: "Edited research objective" } });
  fireEvent.change(screen.getByLabelText("Success criteria"), { target: { value: "Document reviewed findings" } });
  fireEvent.change(screen.getByLabelText("Metric or evidence to monitor"), { target: { value: "Existing report theme" } });
  confirmSave();
  fireEvent.change(screen.getByLabelText("Status for Reviewed report research"), { target: { value: "completed" } });
  const stored = localStorage.getItem(missionStorageKey)!;
  const record = JSON.parse(stored).missions[0];
  expect(record.completedAt).toBeTruthy();
  cleanup(); setup(); await ready();
  expect(screen.queryByText("Document reviewed findings")).not.toBeInTheDocument();
  expect(screen.queryByRole("button", { name: /Review AI proposal:/ })).not.toBeInTheDocument();
  fireEvent.click(screen.getByRole("button", { name: "View details for Reviewed report research" }));
  const dialog = screen.getByRole("dialog", { name: "Reviewed report research" });
  expect(dialog).toHaveTextContent("Edited research objective");
  expect(dialog).toHaveTextContent("Document reviewed findings");
  expect(dialog).toHaveTextContent("Existing report theme");
  expect(dialog).toHaveTextContent(record.completedAt);
  expect(dialog).toHaveTextContent(insight.provenance.model);
  expect(within(dialog).getByRole("link", { name: "theme:value · all" })).toHaveAttribute("href", "/feedback?theme=value");
  expect(localStorage.getItem(missionStorageKey)).toBe(stored);
  expect(stored).not.toMatch(/synthetic-memory-secret|apiKey|hypotheses|Verified fixture observation/);
});

test("board counts reflect actual filtered records and cancellation moves a mission to its archive", async () => {
  setup(); await ready(); fireEvent.click(screen.getByRole("button", { name: "New Mission" })); fill(); confirmSave();
  expect(within(screen.getByRole("region", { name: "Backlog" })).getByLabelText("1 mission")).toHaveTextContent("1");
  fireEvent.change(screen.getByLabelText("Search missions"), { target: { value: "unmatched" } });
  expect(within(screen.getByRole("region", { name: "Backlog" })).getByLabelText("0 missions")).toHaveTextContent("0");
  fireEvent.click(screen.getByRole("button", { name: "Reset filters" }));
  fireEvent.change(screen.getByLabelText("Status for Research guidance"), { target: { value: "cancelled" } });
  expect(screen.queryByRole("heading", { name: "Research guidance" })).not.toBeInTheDocument();
  fireEvent.click(screen.getByRole("button", { name: "Cancelled archive (1)" }));
  expect(screen.getByRole("region", { name: "Cancelled missions" })).toHaveTextContent("Research guidance");
  fireEvent.change(screen.getByLabelText("Status for Research guidance"), { target: { value: "backlog" } });
  fireEvent.click(screen.getByRole("button", { name: "Back to active missions" }));
  expect(screen.getByRole("region", { name: "Backlog" })).toHaveTextContent("Research guidance");
});

test("mobile starts in list view while preserving an explicit board selection", async () => {
  vi.stubGlobal("matchMedia", vi.fn().mockReturnValue({ matches: true }));
  setup(); await ready();
  expect(screen.getByRole("combobox", { name: "Mission view" })).toHaveValue("list");
  fireEvent.change(screen.getByLabelText("Mission view"), { target: { value: "board" } });
  expect(screen.getByRole("region", { name: "Mission board — Backlog, In Progress and Completed" })).toHaveAttribute("tabindex", "0");
});

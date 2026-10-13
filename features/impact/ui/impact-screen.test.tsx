// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, expect, test, vi } from "vitest";
import { createMission, updateMission, type MissionContext } from "@/features/missions/domain/missions";
import { missionStorageKey } from "@/features/missions/domain/repository";
import { impactStorageKey } from "../domain/repository";
import type { ImpactContext } from "../domain/impact";
import { ImpactScreen } from "./impact-screen";

const missionContext: MissionContext = { projects: [{ id: "project", name: "Demo project" }], evidence: [] };
const input = { projectId: "project", title: "Review activation", objective: "Understand observed activation", successCriteria: "Review evidence", status: "completed" as const, priority: "medium" as const, source: "manual" as const, references: [] };
const missionId = "6a8f69fb-538a-4f2a-8ad7-3c17ff68381a";
const mission = createMission(input, missionContext, missionId, "2026-10-12T10:00:00.000Z");
const result = {
  baseline: { metric: { workspaceId: "workspace", projectId: "project", kind: "event_count" as const, datasetVersion: "fixture-v1", algorithmVersion: "impact-v1" as const, cohort: ["customer"] }, period: { start: "2026-06-01T00:00:00.000Z", end: "2026-06-08T00:00:00.000Z" }, value: 1, evidence: [{ id: "event-1", occurredAt: "2026-06-01T00:00:00.000Z", href: "/events?q=event-1" }], status: "available" as const },
  comparison: { metric: { workspaceId: "workspace", projectId: "project", kind: "event_count" as const, datasetVersion: "fixture-v1", algorithmVersion: "impact-v1" as const, cohort: ["customer"] }, period: { start: "2026-06-08T00:00:00.000Z", end: "2026-06-15T00:00:00.000Z" }, value: 2, evidence: [{ id: "event-2", occurredAt: "2026-06-08T00:00:00.000Z", href: "/events?q=event-2" }], status: "available" as const },
  status: "observed_change" as const, absoluteChange: 1, relativeChange: 100, evaluatedAt: "2026-10-12T10:00:00.000Z", limitations: ["Observed change is not causal impact or verified mission success."],
};
const context: ImpactContext = { missionContext, datasetVersion: "fixture-v1", coverage: { start: "2026-06-01T00:00:00.000Z", end: "2026-06-16T00:00:00.000Z" }, options: [{ id: "metric", label: "Demo project · Event count", result }] };

function saveMissions(records = [mission]) { localStorage.setItem(missionStorageKey, JSON.stringify({ version: 1, missions: records })); }
beforeEach(() => { localStorage.clear(); saveMissions(); vi.spyOn(globalThis.crypto, "randomUUID").mockReturnValue("7b9ff825-8a86-473c-aa4f-4b4ef9a14a13"); });
afterEach(() => { cleanup(); localStorage.clear(); vi.restoreAllMocks(); });

test("renders accessible evidence and keeps completion separate from positive impact", async () => {
  render(<ImpactScreen context={context} initialMission={missionId} />);
  expect(await screen.findByRole("heading", { name: "Impact Analytics" })).toBeVisible();
  expect(screen.getByRole("combobox", { name: "Metric and event population" })).toHaveValue("metric");
  expect(screen.getByRole("table", { name: /UTC measurements/ })).toBeVisible();
  expect(screen.getByRole("link", { name: "event-1" })).toHaveAttribute("href", "/events?q=event-1");
  expect(screen.getByText(/Completion never verifies success/)).toBeVisible();
  const evaluate = await screen.findByRole("button", { name: "Evaluate selected windows" });
  evaluate.focus(); expect(evaluate).toHaveFocus(); fireEvent.keyDown(evaluate, { key: "Enter" }); fireEvent.click(evaluate);
  expect(await screen.findByRole("heading", { name: "Mission evaluation: insufficient data" })).toBeVisible();
  expect(screen.queryByText(/verified positive impact/i)).not.toBeInTheDocument();
});

test("restores evaluation history after full component reload", async () => {
  const first = render(<ImpactScreen context={context} initialMission={missionId} />);
  fireEvent.click(await screen.findByRole("button", { name: "Evaluate selected windows" }));
  await waitFor(() => expect(localStorage.getItem(impactStorageKey)).toContain("insufficient_data"));
  first.unmount();
  render(<ImpactScreen context={context} initialMission={missionId} />);
  expect(await screen.findByRole("heading", { name: "Mission evaluation: insufficient data" })).toBeVisible();
});

test("edited measurement fields show stale history and require re-evaluation", async () => {
  const first = render(<ImpactScreen context={context} initialMission={missionId} />);
  fireEvent.click(await screen.findByRole("button", { name: "Evaluate selected windows" }));
  await waitFor(() => expect(localStorage.getItem(impactStorageKey)).not.toBeNull());
  first.unmount();
  const edited = updateMission(mission, { ...input, successCriteria: "Revised evidence criteria", measurementPlan: { metric: "Activation", baselineReference: "Week one", evaluation: "Equal-window comparison" } }, missionContext, "2026-10-13T00:00:00.000Z");
  saveMissions([edited]);
  render(<ImpactScreen context={context} initialMission={missionId} />);
  expect(await screen.findByText(/stale evaluation — re-evaluate/)).toBeVisible();
  expect(screen.getByRole("status")).toHaveTextContent(/re-evaluation is required/);
  expect(screen.queryByRole("heading", { name: /Mission evaluation:/ })).not.toBeInTheDocument();
});

test.each(["in_progress", "cancelled"] as const)("retains %s mission history without a current result", async (status) => {
  const first = render(<ImpactScreen context={context} initialMission={missionId} />);
  fireEvent.click(await screen.findByRole("button", { name: "Evaluate selected windows" }));
  await waitFor(() => expect(localStorage.getItem(impactStorageKey)).not.toBeNull());
  first.unmount();
  saveMissions([updateMission(mission, { ...input, status }, missionContext, "2026-10-13T00:00:00.000Z")]);
  render(<ImpactScreen context={context} initialMission={missionId} />);
  fireEvent.click(await screen.findByText(/Evaluation history for reopened or cancelled missions/));
  expect(await screen.findByText(new RegExp(`current status ${status.replace("_", " ")}`))).toBeVisible();
  expect(screen.getByText(/previous evaluation retained as history and no longer current/)).toBeVisible();
  expect(screen.queryByRole("heading", { name: /Mission evaluation:/ })).not.toBeInTheDocument();
});

test("malformed or unsupported history disables evaluation and preserves bytes", async () => {
  const unsupported = JSON.stringify({ version: 2, evaluations: [] });
  localStorage.setItem(impactStorageKey, unsupported);
  render(<ImpactScreen context={context} initialMission={missionId} />);
  expect(await screen.findByText(/Unsupported evaluation storage version/)).toBeVisible();
  expect(screen.getByRole("button", { name: "Evaluate selected windows" })).toBeDisabled();
  expect(localStorage.getItem(impactStorageKey)).toBe(unsupported);
});

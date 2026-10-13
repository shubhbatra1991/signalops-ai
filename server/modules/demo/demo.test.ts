import { describe, expect, test, vi } from "vitest";

// Only these Node tests replace Next's marker; production server isolation remains.
vi.mock("server-only", () => ({}));

import { aggregateEvents, timestampMs } from "@/domain/analytics/events";
import { calculateFunnel } from "@/domain/analytics/funnel";
import { createDemoDataset } from "./dataset";
import { demoRepository, getDemoMetadata } from "./repository";
import { readDemoAnalytics } from "./read-demo-analytics";

const scope = { workspaceId: "demo-workspace", projectId: "demo-project-flowpilot" };

describe("fictional dataset integrity", () => {
  const dataset = createDemoDataset();

  test("stable dataset has explicit demo provenance and documented UTC coverage", () => {
    expect(createDemoDataset()).toEqual(dataset);
    expect(dataset.metadata.label).toContain("fictional, not live");
    expect(dataset.metadata.range).toEqual({ start: "2026-06-01T00:00:00.000Z", end: "2026-06-16T00:00:00.000Z" });
    expect(dataset.projects).toHaveLength(1);
    expect(dataset.customers).toHaveLength(32);
    expect(dataset.events).toHaveLength(204);
    expect(dataset.feedback).toHaveLength(24);
    const records = [...dataset.projects, ...dataset.customers, ...dataset.events, ...dataset.funnels, ...dataset.feedback];
    expect(records.every((record) => record.dataOrigin === "demonstration")).toBe(true);
    expect(new Set(records.map((record) => record.id)).size).toBe(records.length);
    expect(dataset.customers.every((customer) => /^Demo customer \d{2}$/.test(customer.displayName))).toBe(true);
    expect(JSON.stringify(dataset)).not.toMatch(/[\w.+-]+@[\w.-]+\.[a-z]{2,}/i);
  });

  test("events, customers and funnels reference the same project and workspace", () => {
    const project = dataset.projects[0];
    for (const record of [...dataset.customers, ...dataset.events, ...dataset.funnels, ...dataset.feedback]) {
      expect(record.workspaceId).toBe(project.workspaceId);
      expect(record.projectId).toBe(project.id);
    }
    const customers = new Map(dataset.customers.map((customer) => [customer.id, customer]));
    for (const event of dataset.events) {
      const customer = customers.get(event.customerId);
      expect(customer).toBeDefined();
      expect(timestampMs(event.occurredAt)).toBeGreaterThanOrEqual(timestampMs(customer?.createdAt ?? ""));
      expect(timestampMs(event.receivedAt)).toBeGreaterThanOrEqual(timestampMs(event.occurredAt));
      expect(timestampMs(event.occurredAt)).toBeGreaterThanOrEqual(timestampMs(dataset.metadata.range.start));
      expect(timestampMs(event.occurredAt)).toBeLessThan(timestampMs(dataset.metadata.range.end));
    }
    const eventNames = new Set(dataset.events.map((event) => event.name));
    for (const step of dataset.funnels[0].steps) expect(eventNames.has(step.eventName)).toBe(true);
    expect(new Set(dataset.funnels[0].steps.map((step) => step.id)).size).toBe(4);
  });

  test("authored feedback links to actual activity for its own customer", () => {
    for (const feedback of dataset.feedback) {
      expect(feedback.relatedEventIds.length).toBeGreaterThan(0);
      for (const id of feedback.relatedEventIds) {
        const event = dataset.events.find((event) => event.id === id);
        expect(event?.customerId).toBe(feedback.customerId);
        expect(timestampMs(feedback.submittedAt)).toBeGreaterThanOrEqual(timestampMs(event?.occurredAt ?? ""));
        expect(timestampMs(feedback.submittedAt)).toBeLessThan(timestampMs(dataset.metadata.range.end));
      }
    }
  });

  test("fixture aggregates and funnel form a known reproducible reference", () => {
    const aggregate = aggregateEvents(dataset.events, { ...scope, range: dataset.metadata.range });
    expect(aggregate).toEqual({
      totalEvents: 204,
      uniqueCustomers: 32,
      countsByEvent: [
        { eventName: "account_created", count: 32 },
        { eventName: "help_article_viewed", count: 8 },
        { eventName: "integration_connected", count: 20 },
        { eventName: "integration_failed", count: 16 },
        { eventName: "integration_started", count: 36 },
        { eventName: "report_viewed", count: 32 },
        { eventName: "session_started", count: 32 },
        { eventName: "workspace_created", count: 28 },
      ],
    });
    const result = calculateFunnel(dataset.events, dataset.funnels[0], dataset.metadata.range);
    expect(result.steps.map((step) => step.customers)).toEqual([32, 28, 20, 16]);
    expect(result.conversionRate).toBe(50);
    expect(result.steps.map((step) => step.dropOffCount)).toEqual([0, 4, 8, 4]);
  });
});

describe("read-only demo application access", () => {
  test("exposes all six storage-independent reads with demo identity", async () => {
    expect(demoRepository.context).toEqual({ kind: "demo", workspaceId: "demo-workspace", dataOrigin: "demonstration" });
    expect(await demoRepository.listProjects(scope.workspaceId)).toHaveLength(1);
    expect((await demoRepository.getProject(scope))?.dataOrigin).toBe("demonstration");
    expect(await demoRepository.listCustomers(scope)).toHaveLength(32);
    expect(await demoRepository.listEvents(scope)).toHaveLength(204);
    expect(await demoRepository.listFunnels(scope)).toHaveLength(1);
    expect(await demoRepository.listFeedback(scope)).toHaveLength(24);
  });

  test.each([
    { ...scope, workspaceId: "unknown-workspace" },
    { ...scope, projectId: "unknown-project" },
  ])("unknown scope cannot expose another project's fixture", async (unknownScope) => {
    expect(await demoRepository.getProject(unknownScope)).toBeUndefined();
    expect(await demoRepository.listCustomers(unknownScope)).toEqual([]);
    expect(await demoRepository.listEvents(unknownScope)).toEqual([]);
    expect(await demoRepository.listFunnels(unknownScope)).toEqual([]);
    expect(await demoRepository.listFeedback(unknownScope)).toEqual([]);
    expect(await readDemoAnalytics(unknownScope)).toBeUndefined();
  });

  test("copies nested records so callers cannot corrupt later reads", async () => {
    const events = await demoRepository.listEvents(scope);
    const metadata = getDemoMetadata();
    const funnels = await demoRepository.listFunnels(scope);
    Reflect.set(events[0].properties, "channel", "mutated");
    Reflect.set(events[0], "name", "mutated");
    Reflect.set(funnels[0].steps[0], "eventName", "mutated");
    Reflect.set(metadata.range, "start", "mutated");
    expect((await demoRepository.listEvents(scope))[0].name).toBe("account_created");
    expect((await demoRepository.listEvents(scope))[0].properties.channel).not.toBe("mutated");
    expect((await demoRepository.listFunnels(scope))[0].steps[0].eventName).toBe("account_created");
    expect(getDemoMetadata().range.start).toBe("2026-06-01T00:00:00.000Z");
  });

  test("analytics query is deterministic, labelled, and responds to selected range", async () => {
    const result = await readDemoAnalytics(scope);
    expect(await readDemoAnalytics(scope)).toEqual(result);
    expect(result?.metadata.dataOrigin).toBe("demonstration");
    expect(result?.eventSummary.totalEvents).toBe(204);
    expect(result?.funnels[0].conversionRate).toBe(50);
    const emptyRange = { start: "2026-07-01T00:00:00.000Z", end: "2026-07-02T00:00:00.000Z" };
    const empty = await readDemoAnalytics(scope, emptyRange);
    expect(empty?.range).toEqual(emptyRange);
    expect(empty?.eventSummary.totalEvents).toBe(0);
    expect(empty?.funnels[0].conversionRate).toBe(0);
    const early = await readDemoAnalytics(scope, {
      start: "2026-06-01T10:00:00.000Z", end: "2026-06-01T10:01:00.000Z",
    });
    expect(early?.eventSummary.totalEvents).toBe(1);
    expect(early?.funnels[0].entrants).toBe(1);
    expect(early?.funnels[0].completed).toBe(0);
  });

  test("invalid range fails clearly rather than reporting a misleading zero", async () => {
    await expect(readDemoAnalytics(scope, { start: "invalid", end: getDemoMetadata().range.end })).rejects.toThrow(RangeError);
  });
});

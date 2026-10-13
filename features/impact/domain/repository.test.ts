import { expect, test } from "vitest";
import { browserEvaluationRepository, impactStorageKey, toEvaluationRecord } from "./repository";

const evaluation = { missionId: "6a8f69fb-538a-4f2a-8ad7-3c17ff68381a", evaluatedAt: "2026-10-12T10:00:00.000Z", status: "insufficient_data" as const, limitations: ["No post-completion evidence"] };
const record = toEvaluationRecord(evaluation, "mission-snapshot", "metric", "7b9ff825-8a86-473c-aa4f-4b4ef9a14a13");
function storageFixture(initial: string | null = null) {
  let value = initial;
  return { storage: { getItem: () => value, setItem: (_key: string, next: string) => { value = next; } }, read: () => value };
}

test("persists and restores validated evaluation history across repository instances", () => {
  const fixture = storageFixture();
  const repository = browserEvaluationRepository(() => fixture.storage);
  expect(repository.load().writable).toBe(true);
  repository.save([record]);
  const reloaded = browserEvaluationRepository(() => fixture.storage).load();
  expect(reloaded).toMatchObject({ writable: true, evaluations: [record] });
  expect(JSON.parse(fixture.read()!).version).toBe(1);
});

test.each([
  ["malformed JSON", "{"],
  ["invalid record", JSON.stringify({ version: 1, evaluations: [{ ...record, status: "successful" }] })],
  ["unsupported schema", JSON.stringify({ version: 2, evaluations: [] })],
])("preserves and blocks %s", (_name, initial) => {
  const fixture = storageFixture(initial);
  const repository = browserEvaluationRepository(() => fixture.storage);
  expect(repository.load()).toMatchObject({ writable: false, evaluations: [] });
  expect(() => repository.save([record])).toThrow();
  expect(fixture.read()).toBe(initial);
});

test("rejects duplicate IDs and storage conflicts without replacing history", () => {
  const fixture = storageFixture();
  const repository = browserEvaluationRepository(() => fixture.storage);
  repository.load();
  expect(() => repository.save([record, record])).toThrow();
  expect(fixture.read()).toBeNull();
  const other = JSON.stringify({ version: 1, evaluations: [] });
  fixture.storage.setItem(impactStorageKey, other);
  expect(() => repository.save([record])).toThrow(/changed in another tab/);
  expect(fixture.read()).toBe(other);
});

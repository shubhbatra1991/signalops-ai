import { z } from "zod";
import type { MissionEvaluation } from "./impact";

export const impactStorageKey = "signalops.impact-evaluations.v1";
const maxBytes = 131072;
const statusSchema = z.enum(["not_completed", "insufficient_data", "invalid_evidence", "incompatible", "observed_change", "no_change"]);
export const evaluationRecordSchema = z.strictObject({ id: z.uuid(), missionId: z.uuid(), missionFingerprint: z.string().min(1).max(6000),
  optionId: z.string().min(1).max(200), evaluatedAt: z.iso.datetime(), status: statusSchema });
export type EvaluationRecord = z.infer<typeof evaluationRecordSchema>;
const envelopeSchema = z.strictObject({ version: z.literal(1), evaluations: z.array(evaluationRecordSchema).max(200) })
  .refine((value) => new Set(value.evaluations.map((item) => item.id)).size === value.evaluations.length);
export interface EvaluationSnapshot { evaluations: EvaluationRecord[]; writable: boolean; message: string }
export interface EvaluationRepository { load(): EvaluationSnapshot; save(evaluations: EvaluationRecord[]): EvaluationSnapshot }
type StoragePort = Pick<Storage, "getItem" | "setItem">;
const blocked = (message: string): EvaluationSnapshot => ({ evaluations: [], writable: false, message });

export function toEvaluationRecord(evaluation: MissionEvaluation, missionFingerprint: string, optionId: string, id: string): EvaluationRecord {
  return evaluationRecordSchema.parse({ id, missionId: evaluation.missionId, missionFingerprint, optionId, evaluatedAt: evaluation.evaluatedAt, status: evaluation.status });
}

/** Evaluation history is append-only from this UI; invalid or unknown data is preserved and blocks writes. */
export function browserEvaluationRepository(storage: () => StoragePort): EvaluationRepository {
  let original: string | null | undefined;
  let writable = false;
  return {
    load() {
      writable = false;
      try {
        original = storage().getItem(impactStorageKey);
        if (original === null) { writable = true; return { evaluations: [], writable: true, message: "" }; }
        if (new TextEncoder().encode(original).length > maxBytes) return blocked("Local evaluation history exceeds the supported size. It has been preserved.");
        const raw: unknown = JSON.parse(original);
        if (raw && typeof raw === "object" && "version" in raw && raw.version !== 1) return blocked("Unsupported evaluation storage version. History was preserved; new evaluations are disabled.");
        const parsed = envelopeSchema.safeParse(raw);
        if (!parsed.success) return blocked("Local evaluation history is invalid. It was preserved; new evaluations are disabled.");
        writable = true;
        return { evaluations: parsed.data.evaluations, writable: true, message: "" };
      } catch { return blocked("Local evaluation history could not be read. Nothing was overwritten."); }
    },
    save(evaluations) {
      const parsed = envelopeSchema.safeParse({ version: 1, evaluations });
      if (!parsed.success) throw new Error("Evaluation history failed validation or exceeds the supported limit.");
      const serialized = JSON.stringify(parsed.data);
      if (new TextEncoder().encode(serialized).length > maxBytes) throw new Error("Evaluation storage limit reached. Existing history was preserved.");
      try {
        if (!writable || original === undefined || storage().getItem(impactStorageKey) !== original) throw new Error();
        if (original !== null && !envelopeSchema.safeParse(JSON.parse(original)).success) throw new Error();
        storage().setItem(impactStorageKey, serialized);
        original = serialized;
        return { evaluations: parsed.data.evaluations, writable: true, message: "Evaluation history saved on this browser/device." };
      } catch { throw new Error("Evaluation save failed: storage is unavailable, full or changed in another tab. Existing history was preserved."); }
    },
  };
}

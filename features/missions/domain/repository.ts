import { z } from "zod";
import { missionSchema, type Mission } from "./missions";

export const missionStorageKey = "signalops.missions.v1";
const maxBytes = 262144;
const envelopeSchema = z.strictObject({ version: z.literal(1), missions: z.array(missionSchema).max(200) })
  .refine((value) => new Set(value.missions.map((mission) => mission.id)).size === value.missions.length);
export interface MissionSnapshot { missions: Mission[]; writable: boolean; message: string }
/** Guest-only browser persistence. Future authenticated missions require a server-authorized repository. */
export interface GuestMissionRepository { load(): MissionSnapshot; save(missions: Mission[]): MissionSnapshot; reset(): MissionSnapshot }
type StoragePort = Pick<Storage, "getItem" | "setItem" | "removeItem">;
const blocked = (message: string): MissionSnapshot => ({ missions: [], writable: false, message });
/** No automatic writes/migration. Unknown or malformed storage stays intact until confirmed reset. */
export function browserMissionRepository(storage: () => StoragePort): GuestMissionRepository {
  let original: string | null | undefined;
  let writable = false;
  return {
    load() {
      writable = false;
      try {
        original = storage().getItem(missionStorageKey);
        if (original === null) { writable = true; return { missions: [], writable: true, message: "" }; }
        if (new TextEncoder().encode(original).length > maxBytes) return blocked("Local mission data exceeds the supported size. It has been preserved.");
        const raw: unknown = JSON.parse(original);
        if (raw && typeof raw === "object" && "version" in raw && raw.version !== 1) return blocked("Unsupported mission storage version. Your data has been preserved; saving is disabled.");
        const parsed = envelopeSchema.safeParse(raw);
        if (!parsed.success) return blocked("Local mission data is invalid. It has been preserved; saving is disabled.");
        writable = true; return { missions: parsed.data.missions, writable: true, message: "" };
      } catch { return blocked("Local mission storage could not be read. Nothing was overwritten."); }
    },
    save(missions) {
      const parsed = envelopeSchema.safeParse({ version: 1, missions });
      if (!parsed.success) throw new Error("Mission records failed validation or exceed the supported limit.");
      const serialized = JSON.stringify(parsed.data);
      if (new TextEncoder().encode(serialized).length > maxBytes) throw new Error("Mission storage limit reached. Nothing was saved.");
      try {
        if (!writable || original === undefined || storage().getItem(missionStorageKey) !== original) throw new Error();
        // Revalidate original state; a blocked/unknown version may never be overwritten.
        if (original !== null && !envelopeSchema.safeParse(JSON.parse(original)).success) throw new Error();
        storage().setItem(missionStorageKey, serialized); original = serialized;
        return { missions: parsed.data.missions, writable: true, message: "Saved on this browser/device." };
      } catch { throw new Error("Save failed: storage is unavailable, full or changed in another tab. Reload before retrying; your previous data is preserved."); }
    },
    reset() {
      try { storage().removeItem(missionStorageKey); original = null; writable = true; return { missions: [], writable: true, message: "Local missions reset." }; }
      catch { throw new Error("Reset failed. Local mission data was not changed."); }
    },
  };
}

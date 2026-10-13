import { readMissionContext } from "@/server/modules/demo/read-mission-context";
import type { SearchInput } from "@/features/customer-intelligence/domain/explorer";
import { MissionsScreen } from "./missions-screen";

export async function MissionsRoute({ searchParams }: { searchParams: Promise<SearchInput> }) {
  const params = await searchParams;
  const seed: Record<string, string> = {};
  for (const key of ["source", "project", "range", "evidence", "insight"]) {
    const value = params[key]; if (typeof value === "string" && value.length <= 100) seed[key] = value;
  }
  return <MissionsScreen context={await readMissionContext()} seed={seed} />;
}

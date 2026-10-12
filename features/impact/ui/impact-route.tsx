import { connection } from "next/server";
import { readImpact } from "@/server/modules/demo/read-impact";
import type { SearchInput } from "@/features/customer-intelligence/domain/explorer";
import { ImpactScreen } from "./impact-screen";

export async function ImpactRoute({ searchParams }: { searchParams: Promise<SearchInput> }) {
  const params = await searchParams;
  await connection();
  const mission = typeof params.mission === "string" && /^[0-9a-f-]{36}$/i.test(params.mission) ? params.mission : "";
  return <ImpactScreen context={await readImpact(new Date().toISOString())} initialMission={mission} />;
}

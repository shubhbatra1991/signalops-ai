import "server-only";
import { readInsightOptions, reconstructEvidence } from "@/server/ai/insight-evidence";
import type { MissionContext } from "@/features/missions/domain/missions";

/** Reuse trusted selections/calculations, never send fixture rows or customer histories. */
export async function readMissionContext(): Promise<MissionContext> {
  const options = await readInsightOptions();
  const evidence = await Promise.all(options.options.map(async (option) => {
    const resolved = await reconstructEvidence(option.selection);
    return resolved.facts.map((fact) => ({ reference: { ...option.selection, id: fact.id }, label: option.label,
      href: fact.href, eventsHref: `/demo/events?${new URLSearchParams({ project: option.selection.project, range: option.selection.range })}`, baseline: fact.observation }));
  }));
  return { projects: options.projects, evidence: evidence.flat() };
}

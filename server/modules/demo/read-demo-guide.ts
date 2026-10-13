import "server-only";
import { buildDemoGuide, GUIDE_FEEDBACK_THEME } from "@/features/demo-guide/domain/guide";
import { readInsightOptions } from "@/server/ai/insight-evidence";
import { demoRepository } from "./repository";
import { DEMO_WORKSPACE_ID } from "@/features/workspaces/domain/context";

/** Builds guide links only from currently available demonstration identifiers. */
export async function readDemoGuide() {
  const projects = await demoRepository.listProjects(DEMO_WORKSPACE_ID);
  const project = projects[0];
  const funnels = project ? await demoRepository.listFunnels({ workspaceId: project.workspaceId, projectId: project.id }) : [];
  const options = await readInsightOptions();
  const feedback = options.options.find((item) => item.selection.project === project?.id && item.selection.range === "all" && item.selection.kind === "feedback" && item.selection.evidenceId === GUIDE_FEEDBACK_THEME);
  return buildDemoGuide({ projectId: project?.id, funnelId: funnels[0]?.id, feedbackThemeId: feedback?.selection.evidenceId });
}

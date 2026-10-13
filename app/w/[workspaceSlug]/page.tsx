import { notFound } from "next/navigation";
import { readWorkspaceRouteIntent } from "@/features/workspaces/domain/context";

export const metadata = { title: "Workspace unavailable" };

/** Fails closed until Stage 4.2 can resolve a real server session and membership. */
export default async function WorkspacePage({ params }: PageProps<"/w/[workspaceSlug]">) {
  const { workspaceSlug } = await params;
  const intent = readWorkspaceRouteIntent(workspaceSlug);
  if (!intent) notFound();
  notFound();
}

import type { ReactNode } from "react";
import { AiSessionProvider } from "@/features/ai/ui/ai-session";
import { ApplicationShell } from "@/features/shell/ui/application-shell";
import { readDemoGuide } from "@/server/modules/demo/read-demo-guide";

export default async function ProductLayout({ children }: { children: ReactNode }) {
  const demoGuide = await readDemoGuide();
  return <AiSessionProvider><ApplicationShell demoGuide={demoGuide}>{children}</ApplicationShell></AiSessionProvider>;
}

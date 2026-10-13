import type { ReactNode } from "react";
import { AiSessionProvider } from "@/features/ai/ui/ai-session";
import { ApplicationShell } from "@/features/shell/ui/application-shell";
import { readDemoGuide } from "@/server/modules/demo/read-demo-guide";

/** Canonical public guest boundary. Its state is fictional and browser-local only. */
export default async function DemoLayout({ children }: { children: ReactNode }) {
  const demoGuide = await readDemoGuide();
  return <AiSessionProvider><ApplicationShell demoGuide={demoGuide}>{children}</ApplicationShell></AiSessionProvider>;
}

import type { ReactNode } from "react";
import { ShellHeader, Sidebar } from "./shell-navigation";
import { DemoGuide } from "@/features/demo-guide/ui/demo-guide";
import type { DemoGuideDescriptor } from "@/features/demo-guide/domain/guide";

export function ApplicationShell({ children, demoGuide }: { children: ReactNode; demoGuide?: DemoGuideDescriptor }) {
  return <div className="app-shell">
    <a className="skip-link" href="#main-content">Skip to main content</a>
    <Sidebar />
    <div className="workspace"><ShellHeader />
      {demoGuide && <DemoGuide guide={demoGuide} />}
      <main id="main-content" tabIndex={-1} className="page-content">{children}</main>
      <footer className="workspace-footer"><span>SignalOps-AI</span><span>From evidence to better decisions.</span></footer>
    </div>
  </div>;
}

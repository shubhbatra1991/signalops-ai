import type { ReactNode } from "react";
import { ShellHeader, Sidebar } from "./shell-navigation";

export function ApplicationShell({ children }: { children: ReactNode }) {
  return <div className="app-shell">
    <a className="skip-link" href="#main-content">Skip to main content</a>
    <Sidebar />
    <div className="workspace"><ShellHeader />
      <main id="main-content" tabIndex={-1} className="page-content">{children}</main>
      <footer className="workspace-footer"><span>SignalOps-AI</span><span>From evidence to better decisions.</span></footer>
    </div>
  </div>;
}

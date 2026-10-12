"use client";
import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { Suspense, useRef } from "react";
import { navigation } from "../navigation";
import { ThemeControl } from "@/features/theme/ui/theme-control";

function NavLinks({ onNavigate, query = "" }: { onNavigate?: () => void; query?: string }) {
  const pathname = usePathname();
  return navigation.map((item) => <Link key={item.href} href={item.href + (["/", "/events", "/funnels", "/feedback"].includes(item.href) && query ? `?${query}` : "")} className="nav-link" aria-current={pathname === item.href ? "page" : undefined} onClick={onNavigate}>
    <span className="nav-symbol" aria-hidden="true">{item.symbol}</span>{item.title}
  </Link>);
}
function ContextNavLinks({ onNavigate }: { onNavigate?: () => void }) {
  const search = useSearchParams();
  const query = new URLSearchParams();
  for (const key of ["project", "range", "customer", "funnel"]) {
    const value = search.get(key);
    if (value && value.length <= 100) query.set(key, value);
  }
  return <NavLinks onNavigate={onNavigate} query={query.toString()} />;
}
function Navigation({ onNavigate }: { onNavigate?: () => void }) {
  return <Suspense fallback={<NavLinks onNavigate={onNavigate} />}><ContextNavLinks onNavigate={onNavigate} /></Suspense>;
}
export function Sidebar() {
  return <aside className="sidebar">
    <Link href="/" className="brand"><span className="brand-mark" aria-hidden="true">S</span>SignalOps<span className="brand-ai">AI</span></Link>
    <div className="sidebar-caption">PRODUCT INTELLIGENCE</div>
    <nav aria-label="Primary navigation"><Navigation /></nav>
    <div className="sidebar-footer"><span className="status-dot" aria-hidden="true" />Application preview<p>Your space for evidence-led decisions.</p></div>
  </aside>;
}
export function ShellHeader() {
  const pathname = usePathname();
  const title = navigation.find((item) => item.href === pathname)?.title ?? "SignalOps-AI";
  const mobileMenu = useRef<HTMLDetailsElement>(null);
  return <header className="shell-header">
    <div className="header-location"><span className="header-product">SignalOps-AI</span><span aria-hidden="true">/</span><span>{title}</span></div>
    <div className="header-controls"><ThemeControl />
      <details className="mobile-menu" ref={mobileMenu} onKeyDown={(event) => {
        if (event.key === "Escape" && mobileMenu.current?.open) {
          mobileMenu.current.open = false;
          mobileMenu.current.querySelector("summary")?.focus();
        }
      }}>
        <summary aria-label="Toggle navigation">Menu<span aria-hidden="true"> ☰</span></summary>
        <nav aria-label="Mobile navigation"><Navigation onNavigate={() => { if (mobileMenu.current) mobileMenu.current.open = false; }} /></nav>
      </details>
    </div>
  </header>;
}

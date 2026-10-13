import type { ReactNode } from "react";

/** Compatibility-only segment. Canonical guest state lives under /demo. */
export default function LegacyAppLayout({ children }: { children: ReactNode }) {
  return children;
}

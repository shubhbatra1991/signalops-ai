import Link from "next/link";

export function BrandLink({ variant = "application" }: { variant?: "application" | "marketing" }) {
  const marketing = variant === "marketing";
  return <Link href="/" className={marketing ? "marketing-brand" : "brand"} aria-label="SignalOps-AI home">
    <span className={marketing ? undefined : "brand-mark"} aria-hidden="true">S</span>
    <strong className={marketing ? undefined : "brand-name"}>SignalOps</strong>
    <small className={marketing ? undefined : "brand-ai"}>AI</small>
  </Link>;
}

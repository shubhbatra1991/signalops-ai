import Image from "next/image";
import Link from "next/link";

export function BrandLink({ variant = "application" }: { variant?: "application" | "marketing" }) {
  const marketing = variant === "marketing";
  return <Link href="/" className={marketing ? "marketing-brand" : "brand"} aria-label="SignalOps-AI home">
    <Image
      className="brand-logo"
      src="/brand/android-chrome-192x192.png"
      width={192}
      height={192}
      alt=""
      aria-hidden="true"
    />
  </Link>;
}

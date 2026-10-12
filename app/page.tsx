import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import { LandingPage } from "@/features/marketing/ui/landing-page";
import { readDemoScreen } from "@/server/modules/demo/read-demo-screen";

export const metadata: Metadata = {
  title: "SignalOps-AI · From customer signals to product impact",
  description: "Explore deterministic analytics, evidence-grounded AI research, product missions and impact measurement in a source-available, self-hostable application.",
};

const legacyFilterKeys = new Set(["project", "range", "customer", "funnel", "type", "q", "sort", "page"]);

export default function Home({ searchParams = Promise.resolve({}) }: Partial<Pick<PageProps<"/">, "searchParams">>) {
  return <Suspense fallback={<LandingFallback />}><LandingContent searchParams={searchParams} /></Suspense>;
}

async function LandingContent({ searchParams }: Pick<PageProps<"/">, "searchParams">) {
  const query = await searchParams;
  if (Object.keys(query).some((key) => legacyFilterKeys.has(key))) {
    const params = new URLSearchParams();
    for (const [key, value] of Object.entries(query)) {
      for (const item of Array.isArray(value) ? value : value === undefined ? [] : [value]) params.append(key, item);
    }
    redirect(`/app?${params}`);
  }
  return <LandingPage preview={await readDemoScreen({})} />;
}

function LandingFallback() {
  return <main className="landing-fallback" aria-busy="true" aria-label="Loading SignalOps-AI"><span className="marketing-brand"><span aria-hidden="true">S</span><strong>SignalOps</strong><small>AI</small></span></main>;
}

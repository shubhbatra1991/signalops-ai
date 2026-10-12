import { notFound } from "next/navigation";
import { navigation } from "@/features/shell/navigation";
import { SectionPage } from "@/features/shell/ui/section-page";
import { AnalyticsRoute } from "@/features/customer-intelligence/ui/analytics-route";
import { FeedbackRoute } from "@/features/feedback/ui/feedback-route";
import { ProviderSettings } from "@/features/ai/ui/provider-settings";
import { InsightsRoute } from "@/features/ai/ui/insights-route";
import { MissionsRoute } from "@/features/missions/ui/missions-route";
import { ImpactRoute } from "@/features/impact/ui/impact-route";

export function generateStaticParams() {
  return navigation.filter((item) => item.href !== "/").map((item) => ({ section: item.href.slice(1) }));
}
export async function generateMetadata({ params }: PageProps<"/app/[section]">) {
  const { section } = await params;
  const item = navigation.find((candidate) => candidate.href === `/${section}`);
  return { title: item?.title ?? "Page not found" };
}
export default async function ProductSection({ params, searchParams }: PageProps<"/app/[section]">) {
  const { section } = await params;
  const item = navigation.find((candidate) => candidate.href === `/${section}`);
  if (!item) notFound();
  if (section === "events" || section === "funnels") return <AnalyticsRoute page={section} searchParams={searchParams} />;
  if (section === "feedback") return <FeedbackRoute searchParams={searchParams} />;
  if (section === "insights") return <InsightsRoute />;
  if (section === "missions") return <MissionsRoute searchParams={searchParams} />;
  if (section === "impact") return <ImpactRoute searchParams={searchParams} />;
  if (section === "settings") return <><div className="page-heading"><div><p className="eyebrow">Self-hosted configuration</p><h1>Settings</h1><p className="page-description">Configure your AI session and explicit synthetic connection tests.</p></div></div><ProviderSettings /></>;
  return <SectionPage section={item} />;
}

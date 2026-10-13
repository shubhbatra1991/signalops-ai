import type { Metadata } from "next";
import { Suspense } from "react";
import { AnalyticsRoute } from "@/features/customer-intelligence/ui/analytics-route";
import Loading from "./[section]/loading";

export const metadata: Metadata = { title: "Overview" };

export default function DemoOverview({ searchParams = Promise.resolve({}) }: Partial<Pick<PageProps<"/demo">, "searchParams">>) {
  return <Suspense fallback={<Loading />}><AnalyticsRoute page="overview" searchParams={searchParams} /></Suspense>;
}

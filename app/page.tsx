import { Suspense } from "react";
import { AnalyticsRoute } from "@/features/customer-intelligence/ui/analytics-route";
import Loading from "./[section]/loading";

export default function Home({ searchParams = Promise.resolve({}) }: Partial<Pick<PageProps<"/">, "searchParams">>) {
  return <Suspense fallback={<Loading />}><AnalyticsRoute page="overview" searchParams={searchParams} /></Suspense>;
}

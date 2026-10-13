import { readDemoScreen } from "@/server/modules/demo/read-demo-screen";
import type { AnalyticsPage, SearchInput } from "../domain/explorer";
import { AnalyticsScreen } from "./analytics-screen";

export async function AnalyticsRoute({ page, searchParams }: { page: AnalyticsPage; searchParams: Promise<SearchInput> }) {
  const model = await readDemoScreen(await searchParams);
  return <AnalyticsScreen page={page} model={model} />;
}

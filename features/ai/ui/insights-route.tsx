import { readInsightOptions } from "@/server/ai/insight-evidence";
import { InsightsScreen } from "./insights-screen";

export async function InsightsRoute() {
  return <InsightsScreen options={await readInsightOptions()} />;
}

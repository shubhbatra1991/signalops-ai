import { readFeedbackScreen } from "@/server/modules/demo/read-feedback-screen";
import type { SearchInput } from "@/features/customer-intelligence/domain/explorer";
import { FeedbackScreen } from "./feedback-screen";

export async function FeedbackRoute({ searchParams }: { searchParams: Promise<SearchInput> }) {
  return <FeedbackScreen model={await readFeedbackScreen(await searchParams)} />;
}

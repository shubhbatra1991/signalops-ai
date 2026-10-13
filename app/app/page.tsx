import { redirect } from "next/navigation";
import { withQuery } from "@/features/shell/product-routes";

export default async function LegacyApp({ searchParams }: PageProps<"/app">) {
  redirect(withQuery("/demo", await searchParams));
}

import { notFound, redirect } from "next/navigation";
import { navigation } from "@/features/shell/navigation";
import { legacyProductHref } from "@/features/shell/product-routes";

export default async function LegacyProductRoute({ params, searchParams }: PageProps<"/[section]">) {
  const { section } = await params;
  if (!navigation.some((item) => item.href === `/${section}`)) notFound();
  redirect(legacyProductHref(section, await searchParams));
}

import { notFound, redirect } from "next/navigation";
import { navigation } from "@/features/shell/navigation";
import { legacyProductHref } from "@/features/shell/product-routes";

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
  redirect(legacyProductHref(section, await searchParams));
}

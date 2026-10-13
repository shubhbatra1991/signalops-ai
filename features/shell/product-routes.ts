export type QueryRecord = Record<string, string | string[] | undefined>;

export function productHref(path: string) {
  if (path === "/") return "/app";
  return path.startsWith("/app") ? path : `/app${path.startsWith("/") ? path : `/${path}`}`;
}

export function legacyProductHref(section: string, query: QueryRecord) {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(query)) {
    for (const item of Array.isArray(value) ? value : value === undefined ? [] : [value]) params.append(key, item);
  }
  const suffix = params.toString();
  return `/app/${encodeURIComponent(section)}${suffix ? `?${suffix}` : ""}`;
}

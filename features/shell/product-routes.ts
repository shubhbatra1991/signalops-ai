export type QueryRecord = Record<string, string | string[] | undefined>;
export const GUEST_APP_ROOT = "/demo";

export function productHref(path: string) {
  if (path === "/" || path === "/app" || path === GUEST_APP_ROOT) return GUEST_APP_ROOT;
  const section = path.replace(/^\/(?:app|demo)\/?/, "").replace(/^\//, "");
  return `${GUEST_APP_ROOT}/${section}`;
}

export function withQuery(path: string, query: QueryRecord) {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(query)) {
    for (const item of Array.isArray(value) ? value : value === undefined ? [] : [value]) params.append(key, item);
  }
  const suffix = params.toString();
  return `${path}${suffix ? `?${suffix}` : ""}`;
}

export function legacyProductHref(section: string, query: QueryRecord) {
  return withQuery(`${GUEST_APP_ROOT}/${encodeURIComponent(section)}`, query);
}

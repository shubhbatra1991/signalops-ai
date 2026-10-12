export const accents = ["teal", "blue", "violet", "rose", "amber", "slate"] as const;
export type Accent = typeof accents[number];
// Self-contained so the trusted before-paint bootstrap can reuse it.
export function parseAccent(value: unknown): Accent {
  return value === "blue" || value === "violet" || value === "rose" || value === "amber" || value === "slate" ? value : "teal";
}

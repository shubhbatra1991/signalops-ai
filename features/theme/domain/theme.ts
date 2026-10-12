export type ThemeMode = "light" | "dark" | "auto";
export type Appearance = "light" | "dark";

export function parseThemeMode(value: unknown): ThemeMode {
  return value === "dark" || value === "auto" ? value : "light";
}

export function resolveAppearance(mode: ThemeMode, hour: number): Appearance {
  return mode === "auto" ? (hour >= 6 && hour < 18 ? "light" : "dark") : mode;
}

export function nextThemeBoundary(now: Date): number {
  const next = new Date(now);
  if (now.getHours() < 6) next.setHours(6, 0, 0, 0);
  else if (now.getHours() < 18) next.setHours(18, 0, 0, 0);
  else { next.setDate(next.getDate() + 1); next.setHours(6, 0, 0, 0); }
  return next.getTime() - now.getTime();
}

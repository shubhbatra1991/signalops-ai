import { describe, expect, test } from "vitest";
import { nextThemeBoundary, parseThemeMode, resolveAppearance } from "./theme";

describe("theme rules", () => {
  test.each([undefined, null, "", "system", "DARK", '{"mode":"dark"}', 7, {}])("defaults malformed setting %j to light", (value) => {
    expect(parseThemeMode(value)).toBe("light");
  });
  test.each([0, 5, 6, 12, 17, 18, 23])("manual modes ignore hour %i", (hour) => {
    expect(resolveAppearance("light", hour)).toBe("light");
    expect(resolveAppearance("dark", hour)).toBe("dark");
  });
  test.each([[0, "dark"], [5, "dark"], [6, "light"], [12, "light"], [17, "light"], [18, "dark"], [23, "dark"]] as const)("auto at local hour %i is %s", (hour, result) => {
    expect(resolveAppearance("auto", hour)).toBe(result);
  });
  test.each([[5, 59, 59, 1000], [17, 59, 59, 1000], [18, 0, 0, 12 * 60 * 60 * 1000]] as const)("schedules next boundary from %i:%i:%i", (hour, minute, second, expected) => {
    expect(nextThemeBoundary(new Date(2026, 9, 10, hour, minute, second))).toBe(expected);
  });
});

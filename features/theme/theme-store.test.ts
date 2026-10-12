// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";
import { createThemeStore, THEME_STORAGE_KEY, themeBootstrap } from "./theme-store";

let stop: (() => void) | undefined;
beforeEach(() => {
  localStorage.clear();
  document.documentElement.dataset.theme = "light";
  vi.useFakeTimers();
  vi.setSystemTime(new Date(2026, 9, 10, 22));
});
afterEach(() => { stop?.(); stop = undefined; vi.useRealTimers(); });

function start(value?: string) {
  if (value !== undefined) localStorage.setItem(THEME_STORAGE_KEY, value);
  const store = createThemeStore();
  stop = store.subscribe(() => {});
  return store;
}

describe("theme controller", () => {
  test("new visitors default to light at night without consulting the OS", () => {
    const store = start();
    expect(store.getSnapshot()).toBe("light");
    expect(document.documentElement.dataset.theme).toBe("light");
  });
  test("manual modes persist and survive time boundaries and focus", () => {
    const store = start();
    store.select("dark");
    vi.setSystemTime(new Date(2026, 9, 11, 12));
    window.dispatchEvent(new Event("focus"));
    expect(document.documentElement.dataset.theme).toBe("dark");
    store.select("light");
    vi.setSystemTime(new Date(2026, 9, 11, 23));
    window.dispatchEvent(new Event("focus"));
    expect(document.documentElement.dataset.theme).toBe("light");
    expect(localStorage.getItem(THEME_STORAGE_KEY)).toBe("light");
  });
  test.each(["light", "dark", "auto"])("restores saved mode %s", (mode) => {
    expect(start(mode).getSnapshot()).toBe(mode);
    expect(document.documentElement.dataset.theme).toBe(mode === "auto" ? "dark" : mode);
  });
  test.each([[5, "dark", "light"], [17, "light", "dark"]])("Auto crosses the boundary after hour %i", (hour, before, after) => {
    vi.setSystemTime(new Date(2026, 9, 10, Number(hour), 59, 59));
    start("auto");
    expect(document.documentElement.dataset.theme).toBe(before);
    vi.advanceTimersByTime(1000);
    expect(document.documentElement.dataset.theme).toBe(after);
  });
  test("rechecks local time when an inactive tab becomes visible", () => {
    start("auto");
    vi.setSystemTime(new Date(2026, 9, 11, 10));
    vi.spyOn(document, "visibilityState", "get").mockReturnValue("visible");
    document.dispatchEvent(new Event("visibilitychange"));
    expect(document.documentElement.dataset.theme).toBe("light");
  });
  test("picks up cross-tab selection and cleared storage", () => {
    const store = start("dark");
    localStorage.setItem(THEME_STORAGE_KEY, "auto");
    window.dispatchEvent(new StorageEvent("storage", { key: THEME_STORAGE_KEY }));
    expect(store.getSnapshot()).toBe("auto");
    localStorage.clear();
    window.dispatchEvent(new StorageEvent("storage", { key: null }));
    expect(store.getSnapshot()).toBe("light");
  });
  test("malformed persisted settings safely use light", () => {
    expect(start("not-a-mode").getSnapshot()).toBe("light");
    expect(document.documentElement.dataset.theme).toBe("light");
  });
  test("storage read failures safely use light", () => {
    vi.spyOn(Storage.prototype, "getItem").mockImplementation(() => { throw new Error("blocked"); });
    expect(start().getSnapshot()).toBe("light");
  });
  test("storage write failures safely revert to light", () => {
    const store = start();
    vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => { throw new Error("quota"); });
    store.select("dark");
    expect(store.getSnapshot()).toBe("light");
    expect(document.documentElement.dataset.theme).toBe("light");
  });
  test("unsubscribing clears the Auto timer and event listeners", () => {
    start("auto");
    stop?.();
    expect(vi.getTimerCount()).toBe(0);
    localStorage.setItem(THEME_STORAGE_KEY, "light");
    window.dispatchEvent(new Event("focus"));
    expect(document.documentElement.dataset.theme).toBe("dark");
  });
});

describe("pre-paint bootstrap", () => {
  test.each([[undefined, "light"], ["dark", "dark"], ["auto", "dark"], ["invalid", "light"]])("applies saved %s before hydration", (saved, expected) => {
    if (saved !== undefined) localStorage.setItem(THEME_STORAGE_KEY, saved);
    new Function(themeBootstrap)();
    expect(document.documentElement.dataset.theme).toBe(expected);
  });
  test("bootstrap also falls back if storage is inaccessible", () => {
    vi.spyOn(Storage.prototype, "getItem").mockImplementation(() => { throw new Error("blocked"); });
    new Function(themeBootstrap)();
    expect(document.documentElement.dataset.theme).toBe("light");
  });
});

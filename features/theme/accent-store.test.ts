// @vitest-environment jsdom
import { afterEach, expect, test, vi } from "vitest";
import { accents, parseAccent } from "./domain/accent";
import { ACCENT_STORAGE_KEY, createAccentStore } from "./accent-store";
afterEach(() => { vi.restoreAllMocks(); localStorage.clear(); });
test.each(accents)("accent %s persists and restores without changing appearance", (accent) => {
  document.documentElement.dataset.theme = "dark";
  const store = createAccentStore();
  const unsubscribe = store.subscribe(() => {});
  store.select(accent);
  expect(localStorage.getItem(ACCENT_STORAGE_KEY)).toBe(accent);
  expect(document.documentElement.dataset.accent).toBe(accent);
  expect(document.documentElement.dataset.theme).toBe("dark");
  unsubscribe();
  const restored = createAccentStore();
  const stop = restored.subscribe(() => {});
  expect(restored.getSnapshot()).toBe(accent);
  expect(restored.getServerSnapshot()).toBe("teal");
  stop();
});
test("invalid and unavailable storage fall back to teal", () => {
  expect(parseAccent("invalid")).toBe("teal");
  vi.spyOn(Storage.prototype, "getItem").mockImplementation(() => { throw new Error("blocked"); });
  vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => { throw new Error("blocked"); });
  const store = createAccentStore();
  const stop = store.subscribe(() => {});
  store.select("rose");
  expect(store.getSnapshot()).toBe("teal");
  stop();
});

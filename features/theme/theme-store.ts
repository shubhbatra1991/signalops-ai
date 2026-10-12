import { nextThemeBoundary, parseThemeMode, resolveAppearance, type ThemeMode } from "./domain/theme";
import { parseAccent } from "./domain/accent";
import { ACCENT_STORAGE_KEY } from "./accent-store";

export const THEME_STORAGE_KEY = "signalops.theme-mode";
// Only trusted, self-contained functions are serialized, never saved user content.
export const themeBootstrap = `(()=>{const parse=${parseThemeMode.toString()};const resolve=${resolveAppearance.toString()};const parseAccent=${parseAccent.toString()};let mode="light",accent="teal";try{mode=parse(localStorage.getItem(${JSON.stringify(THEME_STORAGE_KEY)}))}catch{}try{accent=parseAccent(localStorage.getItem(${JSON.stringify(ACCENT_STORAGE_KEY)}))}catch{}document.documentElement.dataset.theme=resolve(mode,new Date().getHours());document.documentElement.dataset.themeMode=mode;document.documentElement.dataset.accent=accent;})();`;

export function createThemeStore() {
  let mode: ThemeMode = "light";
  let timer: ReturnType<typeof setTimeout> | undefined;
  const listeners = new Set<() => void>();
  function readMode() {
    try { return parseThemeMode(window.localStorage.getItem(THEME_STORAGE_KEY)); }
    catch { return "light" as const; }
  }
  function apply() {
    clearTimeout(timer);
    const now = new Date();
    document.documentElement.dataset.theme = resolveAppearance(mode, now.getHours());
    document.documentElement.dataset.themeMode = mode;
    // Exact boundaries, capped to catch device clock/timezone changes while active.
    if (mode === "auto") timer = setTimeout(apply, Math.min(nextThemeBoundary(now), 60_000));
  }
  function notify() { apply(); listeners.forEach((listener) => listener()); }
  function restore() { mode = readMode(); notify(); }
  function onVisibility() { if (document.visibilityState === "visible") restore(); }
  function onStorage(event: StorageEvent) { if (event.key === THEME_STORAGE_KEY || event.key === null) restore(); }
  return {
    getSnapshot: () => mode,
    getServerSnapshot: (): ThemeMode => "light",
    subscribe(listener: () => void) {
      listeners.add(listener);
      if (listeners.size === 1) {
        restore();
        window.addEventListener("focus", restore);
        window.addEventListener("pageshow", restore);
        window.addEventListener("storage", onStorage);
        document.addEventListener("visibilitychange", onVisibility);
      }
      return () => {
        listeners.delete(listener);
        if (listeners.size === 0) {
          clearTimeout(timer);
          window.removeEventListener("focus", restore);
          window.removeEventListener("pageshow", restore);
          window.removeEventListener("storage", onStorage);
          document.removeEventListener("visibilitychange", onVisibility);
        }
      };
    },
    select(value: unknown) {
      mode = parseThemeMode(value);
      try { window.localStorage.setItem(THEME_STORAGE_KEY, mode); }
      catch { mode = "light"; }
      notify();
    },
  };
}
export const themeStore = createThemeStore();

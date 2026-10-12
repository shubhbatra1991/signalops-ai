import { parseAccent, type Accent } from "./domain/accent";

export const ACCENT_STORAGE_KEY = "signalops.accent";
export function createAccentStore() {
  let accent: Accent = "teal";
  const listeners = new Set<() => void>();
  function notify() {
    document.documentElement.dataset.accent = accent;
    listeners.forEach((listener) => listener());
  }
  function restore() {
    try { accent = parseAccent(window.localStorage.getItem(ACCENT_STORAGE_KEY)); }
    catch { accent = "teal"; }
    notify();
  }
  function onStorage(event: StorageEvent) {
    if (event.key === ACCENT_STORAGE_KEY || event.key === null) restore();
  }
  return {
    getSnapshot: () => accent,
    getServerSnapshot: (): Accent => "teal",
    subscribe(listener: () => void) {
      listeners.add(listener);
      if (listeners.size === 1) { restore(); window.addEventListener("storage", onStorage); }
      return () => { listeners.delete(listener); if (!listeners.size) window.removeEventListener("storage", onStorage); };
    },
    select(value: unknown) {
      accent = parseAccent(value);
      try { window.localStorage.setItem(ACCENT_STORAGE_KEY, accent); }
      catch { accent = "teal"; }
      notify();
    },
  };
}
export const accentStore = createAccentStore();

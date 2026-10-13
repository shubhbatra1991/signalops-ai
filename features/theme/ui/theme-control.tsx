"use client";
import { useSyncExternalStore } from "react";
import { themeStore } from "../theme-store";
import { accentStore } from "../accent-store";
import { accents } from "../domain/accent";

export function ThemeControl() {
  const mode = useSyncExternalStore(themeStore.subscribe, themeStore.getSnapshot, themeStore.getServerSnapshot);
  const accent = useSyncExternalStore(accentStore.subscribe, accentStore.getSnapshot, accentStore.getServerSnapshot);
  return <><div className="theme-control">
    <label htmlFor="theme-mode">Appearance</label>
    <select id="theme-mode" value={mode} onChange={(event) => themeStore.select(event.target.value)} aria-describedby="theme-help">
      <option value="light">Light</option><option value="dark">Dark</option><option value="auto">Auto</option>
    </select>
    <span id="theme-help" className="sr-only">Auto uses your device time: light from 6 AM to 6 PM, dark otherwise.</span>
  </div><div className="theme-control"><label htmlFor="theme-accent">Accent</label><select id="theme-accent" value={accent} onChange={(event) => accentStore.select(event.target.value)}>{accents.map((value) => <option key={value} value={value}>{value[0].toUpperCase() + value.slice(1)}</option>)}</select></div></>;
}

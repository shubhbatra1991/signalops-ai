// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import { act, cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import { afterEach, expect, test, vi } from "vitest";
import { renderToString } from "react-dom/server";
import { hydrateRoot } from "react-dom/client";
import { ThemeControl } from "./theme-control";
import { THEME_STORAGE_KEY, themeBootstrap } from "../theme-store";

afterEach(() => { cleanup(); localStorage.clear(); });

test("labels the native keyboard-accessible selector and persists selection", () => {
  render(<ThemeControl />);
  const select = screen.getByRole("combobox", { name: "Appearance" });
  expect(select).toHaveValue("light");
  expect(within(select).getAllByRole("option")).toHaveLength(3);
  expect(within(screen.getByRole("combobox", { name: "Accent" })).getAllByRole("option")).toHaveLength(6);
  fireEvent.change(select, { target: { value: "dark" } });
  expect(select).toHaveValue("dark");
  expect(localStorage.getItem(THEME_STORAGE_KEY)).toBe("dark");
  expect(document.documentElement.dataset.theme).toBe("dark");
});

test("restores dark mode after server rendering without hydration errors", async () => {
  localStorage.setItem(THEME_STORAGE_KEY, "dark");
  const html = renderToString(<ThemeControl />);
  const container = document.createElement("div");
  container.innerHTML = html;
  document.body.append(container);
  new Function(themeBootstrap)();
  expect(document.documentElement.dataset.theme).toBe("dark");
  const recoverable = vi.fn();
  const errors = vi.spyOn(console, "error");
  let root: ReturnType<typeof hydrateRoot> | undefined;
  try {
    await act(async () => { root = hydrateRoot(container, <ThemeControl />, { onRecoverableError: recoverable }); });
    expect(container.querySelector("select")).toHaveValue("dark");
    expect(recoverable).not.toHaveBeenCalled();
    expect(errors).not.toHaveBeenCalled();
  } finally {
    await act(async () => root?.unmount());
    container.remove();
  }
});

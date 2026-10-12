// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import { act, cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, expect, test, vi } from "vitest";
import { ProviderSettings as Settings } from "./provider-settings";
import { AiSessionProvider } from "./ai-session";
import { Activity } from "react";
import { providers } from "../domain/providers";

const syntheticKey = "unit-test-value-not-a-credential";
function ProviderSettings() { return <AiSessionProvider><Settings /></AiSessionProvider>; }
afterEach(() => { cleanup(); vi.unstubAllGlobals(); vi.restoreAllMocks(); });
function setup(configuration = { status: "unconfigured", serverTestsEnabled: false }) {
  const fetchMock = vi.fn().mockResolvedValueOnce(Response.json(configuration)).mockResolvedValue(Response.json({ ok: true, provider: "openai", model: providers.openai.model, requestId: "test-request" }));
  vi.stubGlobal("fetch", fetchMock); render(<ProviderSettings />); return fetchMock;
}
async function chooseOpenai() {
  await screen.findByText("Server configuration: unconfigured.");
  fireEvent.change(screen.getByRole("combobox", { name: "Provider" }), { target: { value: "openai" } });
  fireEvent.change(screen.getByLabelText("API key", { exact: true }), { target: { value: syntheticKey } });
}
test("first visit has no selected provider or credential, and named accessible controls", async () => {
  const mock = setup(); await screen.findByText("Server configuration: unconfigured.");
  expect(screen.getByRole("combobox", { name: "Provider" })).toHaveValue("");
  expect(screen.getByLabelText("API key", { exact: true })).toHaveAttribute("type", "password");
  expect(screen.getByLabelText("API key", { exact: true })).not.toHaveAttribute("name");
  expect(screen.getByRole("button", { name: "Test connection" })).toBeDisabled();
  expect(mock).toHaveBeenCalledTimes(1); expect(mock.mock.calls[0][1].method).toBeUndefined();
});
test.each(Object.entries(providers))("selecting %s supplies only its supported model and clears an earlier key", async (id, provider) => {
  setup(); await chooseOpenai();
  fireEvent.change(screen.getByRole("combobox", { name: "Provider" }), { target: { value: id } });
  expect(screen.getByRole("combobox", { name: "Model" })).toHaveValue(provider.model);
  expect(screen.getByLabelText("API key", { exact: true })).toHaveValue("");
});
test("typing never transmits or persists keys; explicit test posts only a bounded selection and key", async () => {
  const storage = vi.spyOn(Storage.prototype, "setItem");
  const consoleLog = vi.spyOn(console, "log"); const consoleWarn = vi.spyOn(console, "warn");
  const mock = setup(); await chooseOpenai(); expect(mock).toHaveBeenCalledTimes(1); expect(storage).not.toHaveBeenCalled();
  expect(document.cookie).toBe(""); expect(window.location.search).toBe("");
  fireEvent.click(screen.getByRole("button", { name: "Test connection" }));
  await screen.findByText(/Connection verified with a synthetic request/);
  expect(JSON.parse(mock.mock.calls[1][1].body)).toEqual({ mode: "browser", provider: "openai", model: providers.openai.model, apiKey: syntheticKey });
  expect(mock.mock.calls[1][0]).toBe("/api/ai/connection"); expect(mock.mock.calls[1][1].cache).toBe("no-store");
  expect(document.body.textContent).not.toContain(syntheticKey);
  expect(consoleLog).not.toHaveBeenCalled(); expect(consoleWarn).not.toHaveBeenCalled(); expect(storage).not.toHaveBeenCalled();
});

test("Groq Settings displays and submits the exact prefixed replacement model", async () => {
  const mock = setup(); await screen.findByText("Server configuration: unconfigured.");
  mock.mockResolvedValue(Response.json({ ok: true, provider: "groq", model: "openai/gpt-oss-20b", requestId: "test-request" }));
  fireEvent.change(screen.getByRole("combobox", { name: "Provider" }), { target: { value: "groq" } });
  expect(screen.getByRole("combobox", { name: "Model" })).toHaveValue("openai/gpt-oss-20b");
  expect(screen.queryByRole("option", { name: "llama-3.1-8b-instant" })).toBeNull();
  fireEvent.change(screen.getByLabelText("API key", { exact: true }), { target: { value: syntheticKey } });
  fireEvent.click(screen.getByRole("button", { name: "Test connection" }));
  await screen.findByText(/Connection verified with a synthetic request/);
  expect(JSON.parse(mock.mock.calls[1][1].body)).toMatchObject({ provider: "groq", model: "openai/gpt-oss-20b" });
});
test("disconnect clears key and provider; remount does not restore credentials", async () => {
  setup(); await chooseOpenai();
  fireEvent.click(screen.getByRole("button", { name: "Disconnect / Clear" }));
  expect(screen.getByLabelText("API key", { exact: true })).toHaveValue(""); expect(screen.getByRole("combobox", { name: "Provider" })).toHaveValue("");
  cleanup(); setup(); await screen.findByText("Server configuration: unconfigured."); expect(screen.getByLabelText("API key", { exact: true })).toHaveValue("");
});
test("server mode submits no browser key and Clear does not alter instance configuration", async () => {
  const mock = vi.fn().mockResolvedValueOnce(Response.json({ status: "configured", selection: { provider: "openai", model: providers.openai.model }, serverTestsEnabled: true })).mockResolvedValue(Response.json({ ok: true, provider: "openai", model: providers.openai.model, requestId: "test-request" }));
  vi.stubGlobal("fetch", mock); render(<ProviderSettings />); await screen.findByText(/configured · connection tests enabled/);
  fireEvent.change(screen.getByRole("combobox", { name: "Configuration mode" }), { target: { value: "environment" } });
  expect(screen.queryByLabelText("API key", { exact: true })).toBeNull();
  fireEvent.click(screen.getByRole("button", { name: "Test connection" })); await screen.findByText(/Connection verified/);
  expect(JSON.parse(mock.mock.calls[1][1].body)).toEqual({ mode: "environment", provider: "openai", model: providers.openai.model });
  fireEvent.click(screen.getByRole("button", { name: "Disconnect / Clear" })); expect(mock).toHaveBeenCalledTimes(2);
});
test("safe failure code is displayed; arbitrary response messages are never rendered", async () => {
  const mock = setup(); await chooseOpenai(); mock.mockResolvedValueOnce(Response.json({ ok: false, code: "invalid_key", requestId: "test-request" }));
  fireEvent.click(screen.getByRole("button", { name: "Test connection" })); expect(await screen.findByRole("alert")).toHaveTextContent("provider rejected the API key");
  mock.mockResolvedValueOnce(Response.json({ ok: false, code: "invalid_key", requestId: "test-request", message: syntheticKey }));
  fireEvent.click(screen.getByRole("button", { name: "Test connection" })); await screen.findByText(/could not complete/); expect(document.body.textContent).not.toContain(syntheticKey);
});
test("clear aborts pending request and ignores late success without uncontrolled repeat calls", async () => {
  let resolve: ((response: Response) => void) | undefined;
  const mock = setup(); await chooseOpenai(); mock.mockReturnValueOnce(new Promise<Response>((done) => { resolve = done; }));
  fireEvent.click(screen.getByRole("button", { name: "Test connection" })); expect(screen.getByRole("button", { name: "Testing…" })).toBeDisabled();
  fireEvent.click(screen.getByRole("button", { name: "Disconnect / Clear" }));
  await act(async () => resolve?.(Response.json({ ok: true, provider: "openai", model: providers.openai.model, requestId: "test-request" })));
  await waitFor(() => expect(screen.getByRole("status")).toHaveTextContent("Disconnected")); expect(mock).toHaveBeenCalledTimes(2);
});
test("cached React Activity preserves memory credentials across client navigation at the layout boundary", async () => {
  const mock = vi.fn().mockImplementation(async () => Response.json({ status: "unconfigured", serverTestsEnabled: false }));
  vi.stubGlobal("fetch", mock);
  const view = render(<AiSessionProvider><Activity mode="visible"><Settings /></Activity></AiSessionProvider>);
  await chooseOpenai(); expect(screen.getByRole("button", { name: "Test connection" })).toBeEnabled();
  view.rerender(<AiSessionProvider><Activity mode="hidden"><Settings /></Activity></AiSessionProvider>);
  view.rerender(<AiSessionProvider><Activity mode="visible"><Settings /></Activity></AiSessionProvider>);
  await waitFor(() => expect(screen.getByRole("button", { name: "Test connection" })).toBeEnabled());
  expect(screen.getByLabelText("API key", { exact: true })).toHaveValue(syntheticKey);
  expect(mock).toHaveBeenCalledTimes(1);
});

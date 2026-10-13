// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import { act, cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, expect, test, vi } from "vitest";
import { renderToString } from "react-dom/server";
import { Activity, useState } from "react";
import { AiSessionProvider, useAiSession } from "./ai-session";
import { ProviderSettings } from "./provider-settings";
import { InsightsScreen } from "./insights-screen";
import { providers } from "../domain/providers";
import type { Insight, InsightOptions, InsightReview } from "../domain/insights";

const key = "synthetic-test-value-not-a-credential";
const selection = { project: "demo-project-flowpilot", range: "all", kind: "feedback", evidenceId: "integration-permissions" } as const;
const options: InsightOptions = { projects: [{ id: selection.project, name: "FlowPilot Demo" }], options: [
  { selection, label: "Feedback · Calendar permissions" },
  { selection: { ...selection, range: "first-week" }, label: "Feedback · Calendar permissions" },
] };
const review: InsightReview = { ticket: "6a8f69fb-538a-4f2a-8ad7-3c17ff68381a", expiresAt: "2050-01-01T00:00:00.000Z",
  mode: "browser", provider: "openai", model: providers.openai.model, destination: providers.openai.destination, selection,
  category: "fictional-demonstration-aggregates-and-reference-metadata", prompt: '{"evidence":"fictional aggregates only"}',
  outputSchema: { type: "object" }, maxOutputTokens: 1200, format: "json-schema", digest: "a".repeat(64) };
const insight: Insight = { schemaVersion: "insight-v1", id: "7a8f69fb-538a-4f2a-8ad7-3c17ff68381a", title: "Explore permission guidance",
  observation: "Deterministically calculated fixture counts.", evidenceReferenceIds: ["theme:integration-permissions"],
  sources: [{ id: "theme:integration-permissions", observation: "Deterministically calculated fixture counts.", href: "/feedback?theme=integration-permissions" }],
  hypotheses: ["Could guidance be confusing?"], limitations: ["No causal conclusion."], recommendedAction: "Review guidance with volunteers.",
  provenance: { provider: "openai", model: providers.openai.model, promptVersion: "insight-prompt-v1", datasetVersion: "flowpilot-v2" },
  generatedAt: "2026-10-12T00:00:00.000Z", selection };
beforeEach(() => {
  Object.defineProperty(HTMLDialogElement.prototype, "showModal", { configurable: true, value: function (this: HTMLDialogElement) { this.setAttribute("open", ""); } });
  Object.defineProperty(HTMLDialogElement.prototype, "close", { configurable: true, value: function (this: HTMLDialogElement) { this.removeAttribute("open"); } });
  Object.defineProperty(Element.prototype, "scrollIntoView", { configurable: true, value: () => {} });
});
afterEach(() => { cleanup(); vi.restoreAllMocks(); vi.unstubAllGlobals(); });
function Controls() {
  const { configure, disconnect } = useAiSession();
  return <><button onClick={() => configure({ provider: "openai", model: providers.openai.model, apiKey: key })}>Configure test session</button>
    <button onClick={() => configure({ provider: "groq", model: providers.groq.model, apiKey: key })}>Change provider</button>
    <button onClick={disconnect}>Disconnect test session</button></>;
}
function setup() {
  const fetchMock = vi.fn().mockImplementation(async (_url: string, init: RequestInit) => {
    if (!init.method) return Response.json({ status: "unconfigured", serverTestsEnabled: false, deployment: { mode: "self-hosted", providerRequestsEnabled: true, configurationValid: true } });
    const body = JSON.parse(String(init.body));
    return Response.json(body.action === "preview" ? { ok: true, review } : { ok: true, insight });
  });
  vi.stubGlobal("fetch", fetchMock);
  render(<AiSessionProvider><Controls /><InsightsScreen options={options} /></AiSessionProvider>);
  return fetchMock;
}
async function inspect() {
  fireEvent.click(screen.getByRole("button", { name: "Configure test session" }));
  await waitFor(() => expect(screen.getByRole("button", { name: "Review evidence before sending" })).toBeEnabled());
  fireEvent.click(screen.getByRole("button", { name: "Review evidence before sending" }));
  return await screen.findByRole("dialog", { name: "Review this exact transmission" });
}
async function approve() {
  await inspect(); fireEvent.click(screen.getByRole("checkbox"));
  fireEvent.click(screen.getByRole("button", { name: "Approve and generate" }));
}

test("unconfigured insights are truthful and never invoke a provider automatically", async () => {
  const mock = setup(); await waitFor(() => expect(mock).toHaveBeenCalledTimes(1));
  expect(screen.getByRole("button", { name: "Review evidence before sending" })).toBeDisabled();
  expect(screen.getByText(/No provider is ready/)).toBeVisible(); expect(screen.getByText(/No AI-generated insights yet/)).toBeVisible();
  expect(screen.getByRole("link", { name: /Configure an AI provider/ })).toHaveAttribute("href", "/demo/settings");
});
test("review displays exact prompt and destination but never submits credentials or generates before approval", async () => {
  const storage = vi.spyOn(Storage.prototype, "setItem"); const mock = setup(); await inspect();
  expect(screen.getByLabelText("Exact provider prompt")).toHaveTextContent(review.prompt);
  expect(screen.getByRole("dialog")).toHaveTextContent(review.destination);
  expect(screen.getByRole("button", { name: "Approve and generate" })).toBeDisabled();
  expect(JSON.parse(mock.mock.calls[1][1].body)).toEqual({ action: "preview", mode: "browser", selection, provider: "openai", model: providers.openai.model });
  expect(document.body.textContent).not.toContain(key); expect(storage).not.toHaveBeenCalled(); expect(document.cookie).toBe("");
});
test.each(["scope", "provider", "disconnect"])("changing %s invalidates the open review and consent", async (change) => {
  const mock = setup(); await inspect(); fireEvent.click(screen.getByRole("checkbox"));
  if (change === "scope") fireEvent.change(screen.getByRole("combobox", { name: "UTC date range" }), { target: { value: "first-week" } });
  else fireEvent.click(screen.getByRole("button", { name: change === "provider" ? "Change provider" : "Disconnect test session" }));
  expect(screen.queryByRole("dialog")).toBeNull(); expect(mock).toHaveBeenCalledTimes(2);
});
test("explicit generation creates cited session draft; regenerating requires new review", async () => {
  const mock = setup(); await approve(); await screen.findByRole("heading", { name: insight.title });
  expect(screen.getByText(insight.observation)).toBeVisible();
  expect(JSON.parse(mock.mock.calls[2][1].body)).toEqual({ action: "generate", selection, ticket: review.ticket, approved: true,
    credentials: { mode: "browser", provider: "openai", model: providers.openai.model, apiKey: key } });
  expect(screen.getByRole("link", { name: "theme:integration-permissions" })).toHaveAttribute("href", insight.sources[0].href);
  expect(screen.queryByRole("dialog")).toBeNull();
  fireEvent.click(screen.getByRole("button", { name: "Select evidence to regenerate" })); expect(mock).toHaveBeenCalledTimes(3);
  fireEvent.click(screen.getByRole("button", { name: "Review evidence before sending" })); await screen.findByRole("dialog");
  expect(screen.getByRole("button", { name: "Approve and generate" })).toBeDisabled();
  fireEvent.click(screen.getByRole("button", { name: "Disconnect test session" })); expect(screen.queryByRole("heading", { name: insight.title })).toBeNull();
});
test("native Escape and Cancel review dismiss without sending and restore focus", async () => {
  const mock = setup(); const dialog = await inspect(); fireEvent(dialog, new Event("cancel", { bubbles: false, cancelable: true }));
  expect(screen.queryByRole("dialog")).toBeNull(); expect(screen.getByRole("button", { name: "Review evidence before sending" })).toHaveFocus();
  expect(mock).toHaveBeenCalledTimes(2);
});
test("cancel aborts generation and ignores late success", async () => {
  const mock = setup(); let done: ((response: Response) => void) | undefined;
  await inspect(); mock.mockImplementationOnce(() => new Promise<Response>((resolve) => { done = resolve; }));
  fireEvent.click(screen.getByRole("checkbox")); fireEvent.click(screen.getByRole("button", { name: "Approve and generate" }));
  const signal = mock.mock.calls[2][1].signal as AbortSignal;
  fireEvent.click(screen.getByRole("button", { name: "Cancel request" })); expect(signal.aborted).toBe(true);
  await act(async () => done?.(Response.json({ ok: true, insight })));
  expect(screen.queryByRole("heading", { name: insight.title })).toBeNull(); expect(screen.getByText(/Cancelled locally/)).toBeVisible();
});
test("provider failures use safe messages without response-body disclosure", async () => {
  const mock = setup(); await inspect(); mock.mockImplementationOnce(async () => Response.json({ ok: false, code: "invalid_key", requestId: "safe-id" }));
  fireEvent.click(screen.getByRole("checkbox")); fireEvent.click(screen.getByRole("button", { name: "Approve and generate" }));
  expect(await screen.findByRole("alert")).toHaveTextContent("provider rejected the API key"); expect(document.body.textContent).not.toContain(key);
});
test("navigation retains keys and drafts only while the shared application layout exists", async () => {
  const mock = vi.fn().mockImplementation(async () => Response.json({ status: "unconfigured", serverTestsEnabled: false, deployment: { mode: "self-hosted", providerRequestsEnabled: true, configurationValid: true } })); vi.stubGlobal("fetch", mock);
  function Navigation() {
    const [settings, setSettings] = useState(true);
    return <><button onClick={() => setSettings(!settings)}>Navigate</button>{settings ? <ProviderSettings /> : <InsightsScreen options={options} />}</>;
  }
  const view = render(<AiSessionProvider><Navigation /></AiSessionProvider>);
  await screen.findByText("Server configuration: unconfigured.");
  fireEvent.change(screen.getByRole("combobox", { name: "Provider" }), { target: { value: "openai" } });
  fireEvent.change(screen.getByLabelText("API key", { exact: true }), { target: { value: key } });
  fireEvent.click(screen.getByRole("button", { name: "Navigate" })); expect(screen.getByRole("button", { name: "Review evidence before sending" })).toBeEnabled();
  fireEvent.click(screen.getByRole("button", { name: "Navigate" })); expect(screen.getByLabelText("API key", { exact: true })).toHaveValue(key);
  fireEvent(window, new Event("pagehide")); expect(screen.getByLabelText("API key", { exact: true })).toHaveValue("");
  view.unmount(); render(<AiSessionProvider><ProviderSettings /></AiSessionProvider>);
  expect(screen.getByLabelText("API key", { exact: true })).toHaveValue("");
});
test("server rendering starts without credentials or generated results", () => {
  const html = renderToString(<AiSessionProvider><ProviderSettings /><InsightsScreen options={options} /></AiSessionProvider>);
  expect(html).not.toContain(key); expect(html).toContain("No AI-generated insights yet");
});
test("cached inactive routes discard approval while retaining layout credentials", async () => {
  const mock = vi.fn().mockImplementation(async (_url: string, init: RequestInit) => Response.json(init.method ? { ok: true, review } : { status: "unconfigured", serverTestsEnabled: false, deployment: { mode: "self-hosted", providerRequestsEnabled: true, configurationValid: true } }));
  vi.stubGlobal("fetch", mock);
  const view = render(<AiSessionProvider><Controls /><Activity mode="visible"><InsightsScreen options={options} /></Activity></AiSessionProvider>);
  await inspect(); fireEvent.click(screen.getByRole("checkbox"));
  view.rerender(<AiSessionProvider><Controls /><Activity mode="hidden"><InsightsScreen options={options} /></Activity></AiSessionProvider>);
  view.rerender(<AiSessionProvider><Controls /><Activity mode="visible"><InsightsScreen options={options} /></Activity></AiSessionProvider>);
  expect(screen.queryByRole("dialog")).toBeNull(); expect(screen.getByRole("button", { name: "Review evidence before sending" })).toBeEnabled();
  expect(mock).toHaveBeenCalledTimes(2);
});

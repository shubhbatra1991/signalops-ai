// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, expect, test, vi } from "vitest";
import { buildDemoGuide, DEMO_GUIDE_DISMISSAL_KEY, GUIDE_FEEDBACK_THEME } from "../domain/guide";
import { DemoGuide } from "./demo-guide";
import { AiSessionProvider, useAiSession } from "@/features/ai/ui/ai-session";

const navigation = vi.hoisted(() => ({ push: vi.fn(), pathname: "/app" }));
vi.mock("next/navigation", () => ({ useRouter: () => ({ push: navigation.push }), usePathname: () => navigation.pathname }));
const guide = buildDemoGuide({ projectId: "demo-project-flowpilot", funnelId: "demo-funnel-onboarding", feedbackThemeId: GUIDE_FEEDBACK_THEME });
afterEach(() => { cleanup(); localStorage.clear(); navigation.push.mockReset(); navigation.pathname = "/app"; vi.restoreAllMocks(); });

test("first run offers an optional guide and starts at Overview", async () => {
  render(<DemoGuide guide={guide} />);
  expect(await screen.findByRole("heading", { name: "See the evidence trail in six steps" })).toBeVisible();
  fireEvent.click(screen.getByRole("button", { name: "Start guided demo" }));
  expect(navigation.push).toHaveBeenCalledWith("/app");
  expect(screen.getByRole("heading", { name: "Start with the Overview" })).toBeVisible();
  expect(screen.getByText(/Calculated activity/)).toHaveTextContent("Step 1 of 6");
});

test("Next and Back follow the verified URL sequence without invoking AI", async () => {
  const request = vi.spyOn(globalThis, "fetch");
  render(<DemoGuide guide={guide} />); fireEvent.click(await screen.findByRole("button", { name: "Start guided demo" }));
  fireEvent.click(screen.getByRole("button", { name: "Next →" }));
  expect(screen.getByRole("heading", { name: "Inspect the onboarding funnel" })).toBeVisible();
  fireEvent.click(screen.getByRole("button", { name: "Next →" }));
  expect(navigation.push).toHaveBeenLastCalledWith(expect.stringContaining("theme=integration-permissions"));
  fireEvent.click(screen.getByRole("button", { name: "← Back" }));
  fireEvent.click(screen.getByRole("button", { name: "← Back" }));
  expect(screen.getByRole("heading", { name: "Start with the Overview" })).toBeVisible();
  expect(request).not.toHaveBeenCalled();
});

test("Skip stores only dismissal and the visible control restarts the guide", async () => {
  render(<DemoGuide guide={guide} />); fireEvent.click(await screen.findByRole("button", { name: "Start guided demo" }));
  fireEvent.click(screen.getByRole("button", { name: "Skip guide" }));
  expect(localStorage).toHaveLength(1);
  expect(localStorage.getItem(DEMO_GUIDE_DISMISSAL_KEY)).toBe("1");
  fireEvent.click(screen.getByRole("button", { name: "Demo guide" }));
  expect(screen.getByRole("heading", { name: "Start with the Overview" })).toBeVisible();
});

test("dismissal restores without affecting existing storage or application state", async () => {
  localStorage.setItem(DEMO_GUIDE_DISMISSAL_KEY, "1"); localStorage.setItem("signalops.missions", "preserved"); localStorage.setItem("signalops.theme-mode", "dark");
  render(<DemoGuide guide={guide} />);
  await waitFor(() => expect(screen.getByRole("button", { name: "Demo guide" })).toBeVisible());
  expect(localStorage.getItem("signalops.missions")).toBe("preserved");
  expect(localStorage.getItem("signalops.theme-mode")).toBe("dark");
  expect(navigation.push).not.toHaveBeenCalled();
});

test("missing evidence remains navigable with an explicit limitation", async () => {
  const missing = buildDemoGuide({});
  render(<DemoGuide guide={missing} />); fireEvent.click(await screen.findByRole("button", { name: "Start guided demo" }));
  fireEvent.click(screen.getByRole("button", { name: "Next →" }));
  fireEvent.click(screen.getByRole("button", { name: "Next →" }));
  expect(screen.getByRole("status")).toHaveTextContent("expected feedback theme is unavailable");
  fireEvent.click(screen.getByRole("button", { name: "Next →" }));
  expect(navigation.push).toHaveBeenLastCalledWith("/app/insights");
});

function SessionProbe() {
  const { session, configure, credentials } = useAiSession();
  return <><button onClick={() => configure({ provider: "groq", model: "openai/gpt-oss-20b", apiKey: "test-memory-only" })}>Configure test session</button><output>{session.provider}:{credentials()?.model ?? "none"}</output></>;
}

test("guide navigation leaves the existing memory-only BYOK session untouched", async () => {
  vi.spyOn(globalThis, "fetch").mockRejectedValue(new Error("configuration unavailable in unit test"));
  render(<AiSessionProvider><SessionProbe /><DemoGuide guide={guide} /></AiSessionProvider>);
  fireEvent.click(screen.getByRole("button", { name: "Configure test session" }));
  expect(screen.getByRole("status")).toHaveTextContent("groq:openai/gpt-oss-20b");
  fireEvent.click(await screen.findByRole("button", { name: "Start guided demo" }));
  fireEvent.click(screen.getByRole("button", { name: "Next →" }));
  expect(screen.getByRole("status")).toHaveTextContent("groq:openai/gpt-oss-20b");
  expect(localStorage.getItem("signalops.theme-mode")).toBeNull();
  expect(localStorage.getItem("signalops.missions")).toBeNull();
});

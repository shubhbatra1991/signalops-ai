"use client";
import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from "react";
import { configurationSchema, type ConnectionRequest, type PublicConfiguration } from "../domain/contracts";
import type { Insight } from "../domain/insights";
import type { ProviderId } from "../domain/providers";

interface Session {
  mode: "browser" | "environment"; provider: ProviderId | ""; model: string; apiKey: string; revision: number;
}
const emptySession: Session = { mode: "browser", provider: "", model: "", apiKey: "", revision: 0 };
interface SessionContext {
  session: Session; configure: (value: Partial<Omit<Session, "revision">>) => void; disconnect: () => void;
  credentials: () => ConnectionRequest | undefined;
  configuration: PublicConfiguration | undefined; configurationFailed: boolean;
  insights: Insight[]; addInsight: (insight: Insight) => void;
}
const Context = createContext<SessionContext | null>(null);

/** Layout-scoped, memory only. Never initialize from server props or browser storage. */
export function AiSessionProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState(emptySession);
  const [configuration, setConfiguration] = useState<PublicConfiguration>();
  const [configurationFailed, setConfigurationFailed] = useState(false);
  const [insights, setInsights] = useState<Insight[]>([]);
  const configure = useCallback((value: Partial<Omit<Session, "revision">>) => {
    setSession((previous) => ({ ...previous, ...value, revision: previous.revision + 1 }));
  }, []);
  const disconnect = useCallback(() => {
    setSession((previous) => ({ ...emptySession, revision: previous.revision + 1 }));
    setInsights([]);
  }, []);
  useEffect(() => {
    const controller = new AbortController();
    fetch("/api/ai/connection", { cache: "no-store", credentials: "omit", headers: { "X-SignalOps-Action": "configuration" },
      signal: AbortSignal.any([controller.signal, AbortSignal.timeout(5000)]) })
      .then(async (response) => {
        if (!response.ok) throw new Error();
        const parsed = configurationSchema.safeParse(await response.json());
        if (!parsed.success) throw new Error();
        if (!controller.signal.aborted) setConfiguration(parsed.data);
      }).catch(() => { if (!controller.signal.aborted) setConfigurationFailed(true); });
    window.addEventListener("pagehide", disconnect);
    return () => { controller.abort(); window.removeEventListener("pagehide", disconnect); };
  }, [disconnect]);
  function credentials(): ConnectionRequest | undefined {
    if (!session.provider) return;
    if (session.mode === "browser") return session.apiKey ? { mode: "browser", provider: session.provider, model: session.model, apiKey: session.apiKey } : undefined;
    return { mode: "environment", provider: session.provider, model: session.model };
  }
  return <Context.Provider value={{ session, configure, disconnect, credentials, configuration, configurationFailed, insights,
    addInsight: (insight) => setInsights((previous) => [insight, ...previous].slice(0, 5)) }}>{children}</Context.Provider>;
}
export function useAiSession() {
  const value = useContext(Context);
  if (!value) throw new Error("AI session requires its layout provider.");
  return value;
}

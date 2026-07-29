import { createContext, useContext, useEffect, type ReactNode } from "react";
import { createRuntimeBridge } from "@/platform/bridge/createBridge";
import type { PlatformBridge } from "@/platform/bridge/types";
import type { ShellMode } from "@/contracts";
import { restoreDesktopWindowPrefs } from "@/platform/desktop/restoreWindowPrefs";
import { bindCapacitorDeepLinks } from "@/platform/deeplinks/capacitor";
import { createBrowserNetworkProvider } from "@/platform/network";
import { createSyncOrchestrator, setGlobalSyncOrchestrator } from "@/platform/sync";
import { applyCreditsMutation, getCreditsMutationQueue } from "@/features/credits/service";

const PlatformContext = createContext<PlatformBridge | null>(null);

export function PlatformProvider({
  bridge,
  children,
}: {
  bridge?: PlatformBridge;
  children: ReactNode;
}) {
  const value = bridge ?? createRuntimeBridge();

  useEffect(() => {
    if (value.kind === "desktop") {
      void restoreDesktopWindowPrefs();
    }
  }, [value.kind]);

  useEffect(() => {
    if (value.kind !== "android") return;
    let unbind: (() => void) | undefined;
    void bindCapacitorDeepLinks((path) => {
      if (typeof window !== "undefined") {
        window.history.pushState({}, "", path);
        window.dispatchEvent(new PopStateEvent("popstate"));
      }
    }).then((fn) => {
      unbind = fn;
    });
    return () => unbind?.();
  }, [value.kind]);

  useEffect(() => {
    const orch = createSyncOrchestrator({
      queue: getCreditsMutationQueue(),
      apply: async (m) => {
        const status = await applyCreditsMutation(m);
        return status === "applied" ? { status: "applied" } : { status: "skipped" };
      },
    });
    setGlobalSyncOrchestrator(orch);
    const network = createBrowserNetworkProvider();
    const unbindNet = orch.bindNetwork(network);
    if (network.getState() === "online") void orch.flush();
    return () => {
      unbindNet();
      setGlobalSyncOrchestrator(null);
    };
  }, []);

  return <PlatformContext.Provider value={value}>{children}</PlatformContext.Provider>;
}

export function usePlatform(): PlatformBridge {
  const ctx = useContext(PlatformContext);
  if (!ctx) {
    throw new Error("usePlatform must be used within PlatformProvider");
  }
  return ctx;
}

export function useShellMode(): ShellMode {
  return usePlatform().kind;
}

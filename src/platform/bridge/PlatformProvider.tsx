import { createContext, useContext, type ReactNode } from "react";
import { createRuntimeBridge } from "@/platform/bridge/createBridge";
import type { PlatformBridge } from "@/platform/bridge/types";
import type { ShellMode } from "@/contracts";

const PlatformContext = createContext<PlatformBridge | null>(null);

export function PlatformProvider({
  bridge,
  children,
}: {
  bridge?: PlatformBridge;
  children: ReactNode;
}) {
  const value = bridge ?? createRuntimeBridge();
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

import type { ReactNode } from "react";
import { useEffect, useSyncExternalStore } from "react";

/** Page-level overrides for the sticky ContextualAppBar (3B). */
export interface AppBarBridgeState {
  title?: string | null;
  subtitle?: string | null;
  /** Trailing controls (left of YouChip). */
  actions?: ReactNode | null;
  /** Replace default back button when set. */
  leading?: ReactNode | null;
  /** Hide YouChip on dense nested screens (optional). */
  hideYouChip?: boolean;
}

let bridge: AppBarBridgeState = {};
let snapshot: AppBarBridgeState = {};
const listeners = new Set<() => void>();

function emit() {
  snapshot = bridge;
  listeners.forEach((l) => l());
}

export function setAppBarBridge(patch: AppBarBridgeState) {
  bridge = { ...bridge, ...patch };
  emit();
}

export function clearAppBarBridge() {
  bridge = {};
  emit();
}

export function getAppBarBridge(): AppBarBridgeState {
  return snapshot;
}

export function subscribeAppBarBridge(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function useAppBarBridge(): AppBarBridgeState {
  return useSyncExternalStore(subscribeAppBarBridge, getAppBarBridge, getAppBarBridge);
}

/** Register page chrome for the sticky app bar; clears on unmount. */
export function useRegisterAppBar(config: AppBarBridgeState, deps: unknown[]) {
  useEffect(() => {
    setAppBarBridge(config);
    return () => clearAppBarBridge();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);
}

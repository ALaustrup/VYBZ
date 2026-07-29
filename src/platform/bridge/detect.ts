import { Capacitor } from "@capacitor/core";
import type { PlatformKind } from "@/contracts";

declare global {
  interface Window {
    __TAURI_INTERNALS__?: unknown;
    __VYBZ_PLATFORM__?: PlatformKind;
  }
}

/**
 * Resolve runtime shell kind. Bootstrap-only — features use PlatformBridge.kind.
 * Override via `window.__VYBZ_PLATFORM__` for QA.
 */
export function detectPlatformKind(): PlatformKind {
  if (typeof window !== "undefined" && window.__VYBZ_PLATFORM__) {
    return window.__VYBZ_PLATFORM__;
  }
  if (typeof window !== "undefined" && window.__TAURI_INTERNALS__) {
    return "desktop";
  }
  if (Capacitor.isNativePlatform() && Capacitor.getPlatform() === "android") {
    return "android";
  }
  return "web";
}

import type { PlatformBridge } from "@/platform/bridge/types";

export type { PlatformBridge } from "@/platform/bridge/types";
export { PlatformError, unsupported, cancelled, permissionDenied, normalizeUnknown } from "@/platform/bridge/errors";
export { CAPABILITY_REGISTRY, capabilitiesFor } from "@/platform/bridge/capabilities";
export { createWebBridge } from "@/platform/bridge/web";
export { createMockBridge } from "@/platform/bridge/mock";
export { createDesktopBridge } from "@/platform/bridge/desktop";
export { createAndroidBridge } from "@/platform/bridge/android";
export { createBridgeForKind, createRuntimeBridge, createTestBridge } from "@/platform/bridge/createBridge";
export { detectPlatformKind } from "@/platform/bridge/detect";
export { invokePing } from "@/platform/bridge/tauriInvoke";

/** @deprecated Prefer createRuntimeBridge — kept for explicit typing at call sites. */
export type BridgeFactory = () => PlatformBridge;

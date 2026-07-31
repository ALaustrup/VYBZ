import type { PlatformKind } from "@/contracts";
import { createAndroidBridge } from "@/platform/bridge/android";
import { createDesktopBridge } from "@/platform/bridge/desktop";
import { createIosBridge } from "@/platform/bridge/ios";
import { detectPlatformKind } from "@/platform/bridge/detect";
import { createMockBridge } from "@/platform/bridge/mock";
import type { PlatformBridge } from "@/platform/bridge/types";
import { createWebBridge } from "@/platform/bridge/web";

export function createBridgeForKind(kind: PlatformKind): PlatformBridge {
  switch (kind) {
    case "desktop":
      return createDesktopBridge();
    case "android":
      return createAndroidBridge();
    case "ios":
      return createIosBridge();
    case "web":
    default:
      return createWebBridge();
  }
}

export function createRuntimeBridge(): PlatformBridge {
  return createBridgeForKind(detectPlatformKind());
}

export function createTestBridge(): PlatformBridge {
  return createMockBridge();
}

/**
 * Google Play In-App Updates — flexible mode for beta track (Phase 13).
 * Uses native VybzAppUpdate plugin when available; otherwise reports unavailable.
 */

import { Capacitor, registerPlugin } from "@capacitor/core";

export type UpdateAvailabilityCode = 0 | 1 | 2 | 3; // UNKNOWN | NOT | AVAILABLE | IN_PROGRESS

export type InAppUpdateInfo = {
  updateAvailability: UpdateAvailabilityCode | number;
  availableVersionCode: number;
  isFlexibleAllowed: boolean;
  track: "beta" | "production" | "internal";
  error?: string;
};

export type FlexibleStartResult = {
  started: boolean;
  mode?: "flexible";
  reason?: string;
};

type AppUpdatePlugin = {
  getUpdateAvailability(): Promise<InAppUpdateInfo>;
  startFlexibleUpdate(): Promise<FlexibleStartResult>;
  completeFlexibleUpdate(): Promise<void>;
};

const NativeAppUpdate = registerPlugin<AppUpdatePlugin>("VybzAppUpdate");

/** UPDATE_AVAILABLE constant from Play Core */
export const UPDATE_AVAILABLE = 2;

export async function checkInAppUpdate(): Promise<InAppUpdateInfo> {
  if (!Capacitor.isNativePlatform() || Capacitor.getPlatform() !== "android") {
    return {
      updateAvailability: 0,
      availableVersionCode: 0,
      isFlexibleAllowed: false,
      track: "beta",
      error: "not_android",
    };
  }
  try {
    return await NativeAppUpdate.getUpdateAvailability();
  } catch (err) {
    return {
      updateAvailability: 0,
      availableVersionCode: 0,
      isFlexibleAllowed: false,
      track: "beta",
      error: err instanceof Error ? err.message : "check_failed",
    };
  }
}

export function shouldPromptFlexibleUpdate(info: InAppUpdateInfo): boolean {
  return (
    info.track === "beta" &&
    info.updateAvailability === UPDATE_AVAILABLE &&
    info.isFlexibleAllowed
  );
}

export async function startFlexibleInAppUpdate(): Promise<FlexibleStartResult> {
  if (!Capacitor.isNativePlatform()) {
    return { started: false, reason: "not_native" };
  }
  try {
    return await NativeAppUpdate.startFlexibleUpdate();
  } catch (err) {
    return {
      started: false,
      reason: err instanceof Error ? err.message : "start_failed",
    };
  }
}

export async function completeFlexibleInAppUpdate(): Promise<void> {
  if (!Capacitor.isNativePlatform()) return;
  await NativeAppUpdate.completeFlexibleUpdate();
}

/**
 * FCM / push device-token registration — Phase 6 foundation.
 * Registers and stores the token locally. Does **not** send to server yet.
 */

import type { PreferenceKv } from "@/platform/cache/securePreferences";
import { createSecurePreferences, memoryPreferenceKv } from "@/platform/cache/securePreferences";

export type DeviceTokenRecord = {
  token: string;
  platform: "android" | "ios" | "web" | "unknown";
  registeredAt: string;
  permission: "granted" | "denied" | "prompt" | "unavailable";
};

const TOKEN_KEY = "fcm-device-token";

export type PushPluginLike = {
  requestPermissions(): Promise<{ receive: "granted" | "denied" | "prompt" }>;
  register(): Promise<void>;
  addListener(
    event: "registration",
    cb: (token: { value: string }) => void
  ): Promise<{ remove: () => Promise<void> }>;
};

export async function registerDeviceToken(opts?: {
  kv?: PreferenceKv;
  plugin?: PushPluginLike | null;
  platform?: DeviceTokenRecord["platform"];
}): Promise<DeviceTokenRecord | null> {
  const prefs = createSecurePreferences(opts?.kv ?? memoryPreferenceKv());
  const platform = opts?.platform ?? "android";

  if (!opts?.plugin) {
    // No Cap Push plugin / google-services — record unavailable stub for tests.
    const record: DeviceTokenRecord = {
      token: "",
      platform,
      registeredAt: new Date().toISOString(),
      permission: "unavailable",
    };
    await prefs.setJson(TOKEN_KEY, record);
    return record;
  }

  const perm = await opts.plugin.requestPermissions();
  if (perm.receive !== "granted") {
    const record: DeviceTokenRecord = {
      token: "",
      platform,
      registeredAt: new Date().toISOString(),
      permission: perm.receive,
    };
    await prefs.setJson(TOKEN_KEY, record);
    return record;
  }

  const token = await new Promise<string>((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error("FCM registration timeout")), 8_000);
    void opts.plugin!.addListener("registration", (t) => {
      clearTimeout(timer);
      resolve(t.value);
    }).then(() => opts.plugin!.register());
  }).catch(() => "");

  const record: DeviceTokenRecord = {
    token,
    platform,
    registeredAt: new Date().toISOString(),
    permission: "granted",
  };
  await prefs.setJson(TOKEN_KEY, record);
  // Intentionally no server POST — Phase 6 local registration only.
  return record;
}

export async function loadStoredDeviceToken(kv?: PreferenceKv): Promise<DeviceTokenRecord | null> {
  const prefs = createSecurePreferences(kv ?? memoryPreferenceKv());
  return prefs.getJson<DeviceTokenRecord>(TOKEN_KEY);
}

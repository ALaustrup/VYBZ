/**
 * FCM / push device-token registration — Phase 13 Android Beta.
 * Registers + stores token locally; optional `onRegistered` for server POST.
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

export type RegisterDeviceTokenOpts = {
  kv?: PreferenceKv;
  plugin?: PushPluginLike | null;
  platform?: DeviceTokenRecord["platform"];
  /** Optional server registration hook (Phase 13 — owner wires Edge Fn later). */
  onRegistered?: (record: DeviceTokenRecord) => Promise<void> | void;
};

export async function registerDeviceToken(
  opts?: RegisterDeviceTokenOpts
): Promise<DeviceTokenRecord | null> {
  const prefs = createSecurePreferences(opts?.kv ?? memoryPreferenceKv());
  const platform = opts?.platform ?? "android";

  if (!opts?.plugin) {
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
  if (record.token && opts?.onRegistered) {
    await opts.onRegistered(record);
  }
  return record;
}

export async function loadStoredDeviceToken(kv?: PreferenceKv): Promise<DeviceTokenRecord | null> {
  const prefs = createSecurePreferences(kv ?? memoryPreferenceKv());
  return prefs.getJson<DeviceTokenRecord>(TOKEN_KEY);
}

/**
 * Best-effort Cap Push plugin loader. Returns null when
 * `@capacitor/push-notifications` is not installed / not native.
 */
export async function loadCapacitorPushPlugin(): Promise<PushPluginLike | null> {
  try {
    const mod = await import("@capacitor/push-notifications");
    return mod.PushNotifications as unknown as PushPluginLike;
  } catch {
    return null;
  }
}

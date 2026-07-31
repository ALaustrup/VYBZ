/**
 * Capacitor VybzSecureStore — AES-GCM prefs via iOS Keychain.
 * Falls back to memory/localStorage when the native plugin is absent (web / tests).
 */

import { Capacitor, registerPlugin } from "@capacitor/core";
import {
  createSecurePreferences,
  memoryPreferenceKv,
  type PreferenceKv,
  type SecurePreferences,
} from "@/platform/cache/securePreferences";

type SecureStorePlugin = {
  getItem(options: { key: string }): Promise<{ value: string | null }>;
  setItem(options: { key: string; value: string }): Promise<void>;
  removeItem(options: { key: string }): Promise<void>;
  clear(): Promise<void>;
  stats(): Promise<{ count: number; backend: string }>;
};

const NativeSecureStore = registerPlugin<SecureStorePlugin>("VybzSecureStore");

export function createKeychainPreferenceKv(): PreferenceKv {
  return {
    async getItem(key) {
      if (!Capacitor.isNativePlatform() || Capacitor.getPlatform() !== "ios") {
        return typeof localStorage !== "undefined" ? localStorage.getItem(key) : null;
      }
      try {
        const res = await NativeSecureStore.getItem({ key });
        return res.value ?? null;
      } catch {
        return typeof localStorage !== "undefined" ? localStorage.getItem(key) : null;
      }
    },
    async setItem(key, value) {
      if (!Capacitor.isNativePlatform() || Capacitor.getPlatform() !== "ios") {
        if (typeof localStorage !== "undefined") localStorage.setItem(key, value);
        return;
      }
      try {
        await NativeSecureStore.setItem({ key, value });
      } catch {
        if (typeof localStorage !== "undefined") localStorage.setItem(key, value);
      }
    },
    async removeItem(key) {
      if (!Capacitor.isNativePlatform() || Capacitor.getPlatform() !== "ios") {
        if (typeof localStorage !== "undefined") localStorage.removeItem(key);
        return;
      }
      try {
        await NativeSecureStore.removeItem({ key });
      } catch {
        if (typeof localStorage !== "undefined") localStorage.removeItem(key);
      }
    },
  };
}

/** iOS Alpha sealed prefs — Keychain-backed Kv + AES-GCM app seal layer. */
export function createIosSecurePreferences(
  kv?: PreferenceKv,
  namespace = "vybz.ios.keychain.v1"
): SecurePreferences {
  return createSecurePreferences(kv ?? createKeychainPreferenceKv(), namespace);
}

export function createIosSecurePreferencesForTests(): SecurePreferences {
  return createSecurePreferences(memoryPreferenceKv(), "vybz.ios.keychain.v1");
}

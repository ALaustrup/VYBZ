/**
 * Capacitor VybzSecureStore — AES-GCM prefs via Android KeyStore (EncryptedSharedPreferences).
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

export function createKeystorePreferenceKv(): PreferenceKv {
  return {
    async getItem(key) {
      if (!Capacitor.isNativePlatform()) {
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
      if (!Capacitor.isNativePlatform()) {
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
      if (!Capacitor.isNativePlatform()) {
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

/** Android Beta sealed prefs — KeyStore-backed Kv + AES-GCM app seal layer. */
export function createAndroidSecurePreferences(
  kv?: PreferenceKv,
  namespace = "vybz.android.keystore.v1"
): SecurePreferences {
  return createSecurePreferences(kv ?? createKeystorePreferenceKv(), namespace);
}

export function createAndroidSecurePreferencesForTests(): SecurePreferences {
  return createSecurePreferences(memoryPreferenceKv(), "vybz.android.keystore.v1");
}

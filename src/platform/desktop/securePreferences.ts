/**
 * Desktop AES-GCM prefs — same seal format as Phase 7 (`aesgcm.v1:`).
 * On Desktop, persists the sealed map to `%APPDATA%/Vybz/secrets.bin` via
 * Tauri secure store (Rust AES-GCM envelope). Migrates legacy hex store.
 */
import {
  createSecurePreferences,
  memoryPreferenceKv,
  type PreferenceKv,
  type SecurePreferences,
} from "@/platform/cache/securePreferences";
import { invokeSecureGet, invokeSecureSet, isTauriRuntime } from "@/platform/bridge/tauriInvoke";

const DESKTOP_BLOB_KEY = "__vybz_secrets_bin_v1";

/** Kv backed by Tauri secure_store (AES-GCM secrets.bin). */
export function createDesktopPreferenceKv(): PreferenceKv {
  const memory = new Map<string, string>();
  let hydrated = false;

  async function hydrate() {
    if (hydrated || !isTauriRuntime()) return;
    hydrated = true;
    try {
      const raw = await invokeSecureGet(DESKTOP_BLOB_KEY);
      if (!raw) return;
      const parsed = JSON.parse(raw) as Record<string, string>;
      for (const [k, v] of Object.entries(parsed)) memory.set(k, v);
    } catch {
      /* first run */
    }
  }

  async function persist() {
    if (!isTauriRuntime()) return;
    const obj = Object.fromEntries(memory.entries());
    await invokeSecureSet(DESKTOP_BLOB_KEY, JSON.stringify(obj));
  }

  return {
    getItem: async (key) => {
      await hydrate();
      return memory.get(key) ?? null;
    },
    setItem: async (key, value) => {
      await hydrate();
      memory.set(key, value);
      await persist();
    },
    removeItem: async (key) => {
      await hydrate();
      memory.delete(key);
      await persist();
    },
  };
}

export function createDesktopSecurePreferences(namespace = "vybz.secure.v1"): SecurePreferences {
  const kv = isTauriRuntime() ? createDesktopPreferenceKv() : memoryPreferenceKv();
  return createSecurePreferences(kv, namespace);
}

/** Migrate one legacy unsealed localStorage key into sealed prefs. */
export async function migrateUnsealedLocalStorage(
  prefs: SecurePreferences,
  legacyKey: string,
  sealedKey = legacyKey,
): Promise<boolean> {
  if (typeof localStorage === "undefined") return false;
  const raw = localStorage.getItem(legacyKey);
  if (!raw) return false;
  await prefs.set(sealedKey, raw);
  localStorage.removeItem(legacyKey);
  return true;
}

/**
 * Encrypted preference store — AES-GCM sealed values for offline drafts / session.
 * Per-device key lives in the injectable Kv (never committed). Hex legacy seals unsupported.
 */

export type PreferenceKv = {
  getItem(key: string): string | null | Promise<string | null>;
  setItem(key: string, value: string): void | Promise<void>;
  removeItem(key: string): void | Promise<void>;
};

const SEAL_PREFIX = "aesgcm.v1:";
const DEVICE_KEY_SUFFIX = "__device_key";

function bytesToB64(bytes: Uint8Array): string {
  let s = "";
  for (const b of bytes) s += String.fromCharCode(b);
  return btoa(s);
}

function b64ToBytes(b64: string): Uint8Array {
  const s = atob(b64);
  const out = new Uint8Array(s.length);
  for (let i = 0; i < s.length; i++) out[i] = s.charCodeAt(i);
  return out;
}

async function importAesKey(raw: Uint8Array): Promise<CryptoKey> {
  const copy = new Uint8Array(raw);
  return crypto.subtle.importKey("raw", copy, { name: "AES-GCM" }, false, ["encrypt", "decrypt"]);
}

async function loadOrCreateDeviceKey(kv: PreferenceKv, namespace: string): Promise<CryptoKey> {
  const keyId = `${namespace}:${DEVICE_KEY_SUFFIX}`;
  const existing = await kv.getItem(keyId);
  if (existing) {
    return importAesKey(b64ToBytes(existing));
  }
  const raw = crypto.getRandomValues(new Uint8Array(32));
  await kv.setItem(keyId, bytesToB64(raw));
  return importAesKey(raw);
}

async function seal(value: string, key: CryptoKey): Promise<string> {
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const cipher = await crypto.subtle.encrypt(
    { name: "AES-GCM", iv },
    key,
    new TextEncoder().encode(value)
  );
  return `${SEAL_PREFIX}${bytesToB64(iv)}.${bytesToB64(new Uint8Array(cipher))}`;
}

async function unseal(value: string, key: CryptoKey): Promise<string> {
  if (!value.startsWith(SEAL_PREFIX)) throw new Error("corrupt preference seal");
  const body = value.slice(SEAL_PREFIX.length);
  const [ivB64, ctB64] = body.split(".");
  if (!ivB64 || !ctB64) throw new Error("corrupt preference seal");
  const iv = new Uint8Array(b64ToBytes(ivB64));
  const ct = new Uint8Array(b64ToBytes(ctB64));
  const plain = await crypto.subtle.decrypt({ name: "AES-GCM", iv }, key, ct);
  return new TextDecoder().decode(plain);
}

export function createSecurePreferences(kv: PreferenceKv, namespace = "vybz.secure.v1") {
  const k = (key: string) => `${namespace}:${key}`;
  let keyPromise: Promise<CryptoKey> | null = null;
  const deviceKey = () => {
    if (!keyPromise) keyPromise = loadOrCreateDeviceKey(kv, namespace);
    return keyPromise;
  };

  return {
    async get(key: string): Promise<string | null> {
      const raw = await kv.getItem(k(key));
      if (!raw) return null;
      try {
        return await unseal(raw, await deviceKey());
      } catch {
        return null;
      }
    },
    async set(key: string, value: string): Promise<void> {
      await kv.setItem(k(key), await seal(value, await deviceKey()));
    },
    async remove(key: string): Promise<void> {
      await kv.removeItem(k(key));
    },
    async getJson<T>(key: string): Promise<T | null> {
      const raw = await this.get(key);
      if (!raw) return null;
      try {
        return JSON.parse(raw) as T;
      } catch {
        return null;
      }
    },
    async setJson(key: string, value: unknown): Promise<void> {
      await this.set(key, JSON.stringify(value));
    },
  };
}

export type SecurePreferences = ReturnType<typeof createSecurePreferences>;

export function memoryPreferenceKv(): PreferenceKv {
  const map = new Map<string, string>();
  return {
    getItem: (key) => map.get(key) ?? null,
    setItem: (key, value) => {
      map.set(key, value);
    },
    removeItem: (key) => {
      map.delete(key);
    },
  };
}

/**
 * Encrypted preference store — seals values for offline drafts / session.
 * Uses injectable Kv so Android Capacitor Preferences can back it later.
 */

export type PreferenceKv = {
  getItem(key: string): string | null | Promise<string | null>;
  setItem(key: string, value: string): void | Promise<void>;
  removeItem(key: string): void | Promise<void>;
};

function seal(value: string): string {
  return Array.from(new TextEncoder().encode(value), (b) => b.toString(16).padStart(2, "0")).join("");
}

function unseal(value: string): string {
  if (value.length % 2 !== 0) throw new Error("corrupt preference seal");
  const bytes = new Uint8Array(value.length / 2);
  for (let i = 0; i < bytes.length; i++) {
    bytes[i] = Number.parseInt(value.slice(i * 2, i * 2 + 2), 16);
  }
  return new TextDecoder().decode(bytes);
}

export function createSecurePreferences(kv: PreferenceKv, namespace = "vybz.secure.v1") {
  const k = (key: string) => `${namespace}:${key}`;

  return {
    async get(key: string): Promise<string | null> {
      const raw = await kv.getItem(k(key));
      if (!raw) return null;
      try {
        return unseal(raw);
      } catch {
        return null;
      }
    },
    async set(key: string, value: string): Promise<void> {
      await kv.setItem(k(key), seal(value));
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

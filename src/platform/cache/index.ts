/** Local cache contract — Phase 1.5 in-memory implementation. */

export interface LocalCacheContract<T = unknown> {
  get(key: string): Promise<T | undefined>;
  set(key: string, value: T, ttlMs?: number): Promise<void>;
  delete(key: string): Promise<void>;
  clear(): Promise<void>;
}

interface Entry<T> {
  value: T;
  expiresAt?: number;
}

export function createMemoryCache<T = unknown>(): LocalCacheContract<T> {
  const map = new Map<string, Entry<T>>();

  return {
    async get(key) {
      const entry = map.get(key);
      if (!entry) return undefined;
      if (entry.expiresAt !== undefined && Date.now() > entry.expiresAt) {
        map.delete(key);
        return undefined;
      }
      return entry.value;
    },
    async set(key, value, ttlMs) {
      map.set(key, {
        value,
        expiresAt: ttlMs !== undefined ? Date.now() + ttlMs : undefined,
      });
    },
    async delete(key) {
      map.delete(key);
    },
    async clear() {
      map.clear();
    },
  };
}

export {
  createSecurePreferences,
  memoryPreferenceKv,
  type PreferenceKv,
  type SecurePreferences,
} from "./securePreferences";

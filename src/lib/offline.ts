import { useSyncExternalStore } from "react";

// User-controlled offline media storage.
//
// The PWA service worker already caches media (Supabase Storage objects) with a
// CacheFirst strategy in the "veiled-media" Cache Storage bucket. This module
// lets the user choose HOW MUCH to keep for offline enjoyment, enforces that
// budget by evicting the oldest cached media, and can proactively warm the cache
// with the media currently on screen. Setting the limit to 0 turns offline media
// off and clears what's stored.

const LS_KEY = "veiled.offline";
/** Must match the Workbox runtimeCaching cacheName in vite.config.ts. */
export const MEDIA_CACHE = "veiled-media";

export interface OfflineSettings {
  /** Soft cap on cached media, in megabytes. 0 = don't keep media offline. */
  limitMB: number;
}

/** Preset sizes offered in the UI (MB). 0 = Off. */
export const OFFLINE_PRESETS_MB = [0, 250, 500, 1000, 2000] as const;

const DEFAULTS: OfflineSettings = { limitMB: 500 };

let settings: OfflineSettings = loadSettings();
const listeners = new Set<() => void>();

function loadSettings(): OfflineSettings {
  try {
    const raw = JSON.parse(localStorage.getItem(LS_KEY) ?? "null");
    if (raw && typeof raw === "object" && typeof raw.limitMB === "number") {
      return { limitMB: Math.max(0, raw.limitMB) };
    }
  } catch {
    /* fall through to defaults */
  }
  return { ...DEFAULTS };
}

function persist() {
  try {
    localStorage.setItem(LS_KEY, JSON.stringify(settings));
  } catch {
    /* ignore quota */
  }
  listeners.forEach((l) => l());
}

export function getOfflineSettings(): OfflineSettings {
  return settings;
}

export function setOfflineLimitMB(limitMB: number): void {
  settings = { limitMB: Math.max(0, Math.round(limitMB)) };
  persist();
  // Apply immediately: clears everything when set to 0, trims when lowered.
  void enforceOfflineBudget();
}

function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

/** Reactive hook for the settings UI. */
export function useOfflineSettings(): OfflineSettings {
  return useSyncExternalStore(subscribe, getOfflineSettings, getOfflineSettings);
}

function cacheAvailable(): boolean {
  return typeof window !== "undefined" && "caches" in window;
}

async function responseBytes(res: Response): Promise<number> {
  const len = res.headers.get("content-length");
  if (len) {
    const n = parseInt(len, 10);
    if (!Number.isNaN(n)) return n;
  }
  try {
    return (await res.clone().blob()).size;
  } catch {
    return 0;
  }
}

/** Current bytes held in the offline media cache (best-effort). */
export async function cacheUsageBytes(): Promise<number> {
  if (!cacheAvailable()) return 0;
  try {
    const cache = await caches.open(MEDIA_CACHE);
    const keys = await cache.keys();
    let total = 0;
    for (const req of keys) {
      const res = await cache.match(req);
      if (res) total += await responseBytes(res);
    }
    return total;
  } catch {
    return 0;
  }
}

/**
 * Keep the offline media cache within the user's chosen budget by evicting the
 * oldest entries first (Cache Storage preserves insertion order). When the limit
 * is 0, clears the cache entirely.
 */
export async function enforceOfflineBudget(): Promise<void> {
  if (!cacheAvailable()) return;
  try {
    const cache = await caches.open(MEDIA_CACHE);
    const keys = await cache.keys();
    const limit = settings.limitMB * 1024 * 1024;
    if (limit <= 0) {
      await Promise.all(keys.map((k) => cache.delete(k)));
      return;
    }
    const sized: { req: Request; size: number }[] = [];
    let total = 0;
    for (const req of keys) {
      const res = await cache.match(req);
      const size = res ? await responseBytes(res) : 0;
      sized.push({ req, size });
      total += size;
    }
    let i = 0;
    while (total > limit && i < sized.length) {
      await cache.delete(sized[i].req);
      total -= sized[i].size;
      i++;
    }
  } catch {
    /* best-effort */
  }
}

/** Empty the offline media cache. */
export async function clearOfflineCache(): Promise<void> {
  if (!cacheAvailable()) return;
  try {
    await caches.delete(MEDIA_CACHE);
  } catch {
    /* ignore */
  }
}

let warming = false;

/**
 * Proactively store the given media URLs for offline viewing (within budget).
 * Skips anything already cached. No-ops when offline media is turned off.
 */
export async function prefetchForOffline(urls: (string | undefined)[]): Promise<void> {
  if (!cacheAvailable() || settings.limitMB <= 0 || warming) return;
  if (!navigator.onLine) return;
  warming = true;
  try {
    const cache = await caches.open(MEDIA_CACHE);
    for (const url of urls) {
      if (!url || !/^https?:\/\//.test(url)) continue;
      try {
        const hit = await cache.match(url);
        if (hit) continue;
        const res = await fetch(url, { mode: "cors", credentials: "omit" });
        if (res.ok) await cache.put(url, res.clone());
      } catch {
        /* skip this one */
      }
    }
  } finally {
    warming = false;
    await enforceOfflineBudget();
  }
}

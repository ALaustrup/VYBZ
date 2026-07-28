import * as api from "@/lib/api";

const FAV_TITLE = "Favorites";
const CACHE_KEY = "vybz.favorites.dropIds";

let cachedListId: string | null = null;
let cachedIds = new Set<string>();
const listeners = new Set<() => void>();

function emit() {
  listeners.forEach((l) => l());
}

function persistCache() {
  try {
    localStorage.setItem(CACHE_KEY, JSON.stringify([...cachedIds]));
  } catch { /* ignore */ }
}

function hydrateCache() {
  try {
    const raw = localStorage.getItem(CACHE_KEY);
    if (!raw) return;
    const arr = JSON.parse(raw) as string[];
    if (Array.isArray(arr)) cachedIds = new Set(arr.filter((x) => typeof x === "string"));
  } catch { /* ignore */ }
}

hydrateCache();

export function subscribeFavorites(cb: () => void): () => void {
  listeners.add(cb);
  return () => { listeners.delete(cb); };
}

export function isFavoriteCached(dropId: string | undefined | null): boolean {
  if (!dropId) return false;
  return cachedIds.has(dropId);
}

export function getFavoriteIds(): string[] {
  return [...cachedIds];
}

/** Ensure the user has a private Favorites list; sync track ids. */
export async function syncFavorites(): Promise<string | null> {
  const lists = await api.listMyVybzLists(80);
  let fav = lists.find((l) => l.title.toLowerCase() === FAV_TITLE.toLowerCase());
  if (!fav) {
    const id = await api.createVybzList(FAV_TITLE, "Tracks you heart from VDock");
    if (!id) return null;
    cachedListId = id;
    cachedIds = new Set();
    persistCache();
    emit();
    return id;
  }
  cachedListId = fav.id;
  const ids = await api.vybzListDropIds(fav.id);
  cachedIds = new Set(ids);
  persistCache();
  emit();
  return fav.id;
}

export async function ensureFavoritesListId(): Promise<string | null> {
  if (cachedListId) return cachedListId;
  return syncFavorites();
}

/** Heart toggle — returns whether the track is now favorited. */
export async function toggleFavorite(dropId: string): Promise<{ ok: boolean; favorited: boolean; error?: string }> {
  if (!dropId) return { ok: false, favorited: false, error: "No track" };
  const listId = await ensureFavoritesListId();
  if (!listId) return { ok: false, favorited: false, error: "Couldn't open Favorites" };

  if (cachedIds.has(dropId)) {
    const ok = await api.removeFromVybzList(listId, dropId);
    if (!ok) return { ok: false, favorited: true, error: "Couldn't unfavorite" };
    cachedIds.delete(dropId);
    persistCache();
    emit();
    return { ok: true, favorited: false };
  }

  const ok = await api.addToVybzList(listId, dropId);
  if (!ok) return { ok: false, favorited: false, error: "Couldn't favorite" };
  cachedIds.add(dropId);
  persistCache();
  emit();
  return { ok: true, favorited: true };
}

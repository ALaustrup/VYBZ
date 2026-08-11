/**
 * OR-039 — client-side Market browse helpers (filter over measured published packs only).
 * Never invent catalog rows, play counts, or trending shelves.
 */

import type { StorefrontPackPublic } from "@/features/storefront/types";

export function genresFromPacks(packs: StorefrontPackPublic[]): string[] {
  const set = new Set<string>();
  for (const p of packs) {
    const g = p.genre?.trim();
    if (g) set.add(g);
  }
  return [...set].sort((a, b) => a.localeCompare(b));
}

export function filterMarketPacks(
  packs: StorefrontPackPublic[],
  opts: { query?: string; genre?: string | null },
): StorefrontPackPublic[] {
  const q = (opts.query ?? "").trim().toLowerCase();
  const genre = opts.genre?.trim() || null;
  return packs.filter((p) => {
    if (genre && (p.genre?.trim() || "") !== genre) return false;
    if (!q) return true;
    const hay = `${p.title} ${p.genre} ${p.description}`.toLowerCase();
    return hay.includes(q);
  });
}

export function packHasPreview(pack: StorefrontPackPublic): boolean {
  return !!(pack.preview_path && pack.preview_path.trim());
}

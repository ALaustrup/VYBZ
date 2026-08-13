import * as api from "@/lib/api";
import type { Drop } from "@/types";

const PAGE = 100;

/** Page the owner's whole catalog. Total comes from countDropsBy (Law 1). */
export async function loadOwnerCatalog(userId: string): Promise<Drop[]> {
  const total = await api.countDropsBy(userId);
  const all: Drop[] = [];
  const seen = new Set<string>();
  for (let offset = 0; offset < total; offset += PAGE) {
    const page = await api.dropsBy(userId, PAGE, offset);
    if (!page.length) break;
    for (const d of page) {
      if (seen.has(d.id)) continue;
      seen.add(d.id);
      all.push(d);
    }
  }
  return all;
}

export async function loadListCatalog(listId: string): Promise<Drop[]> {
  const ids = await api.vybzListDropIds(listId);
  return api.dropsByIds(ids);
}

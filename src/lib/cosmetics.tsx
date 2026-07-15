import { useEffect, useState } from "react";
import * as api from "@/lib/api";
import type { Cosmetic, CosmeticData } from "@/types";

export interface ResolvedCosmetics { accent?: CosmeticData; flair?: CosmeticData }

/** Resolve a profile's equipped {category: id} map to renderable cosmetic data. */
export function resolveCosmetics(equipped: Record<string, string> | undefined, catalog: Cosmetic[]): ResolvedCosmetics {
  const byId = new Map(catalog.map((c) => [c.id, c]));
  const out: ResolvedCosmetics = {};
  for (const [cat, id] of Object.entries(equipped ?? {})) {
    const c = byId.get(id);
    if (c) (out as Record<string, CosmeticData>)[cat] = c.data;
  }
  return out;
}

/** Hook: loads the (cached) catalog and resolves an equipped map for rendering. */
export function useResolvedCosmetics(equipped?: Record<string, string>): ResolvedCosmetics {
  const [catalog, setCatalog] = useState<Cosmetic[]>([]);
  useEffect(() => { api.cosmeticCatalog().then(setCatalog); }, []);
  return resolveCosmetics(equipped, catalog);
}

/** Equipped accent → [c0, c1], falling back to the provided default gradient. */
export function accentGradient(accent: CosmeticData | undefined, fallback: [string, string]): [string, string] {
  if (accent?.c0 && accent?.c1) return [accent.c0, accent.c1];
  return fallback;
}

/** A small equipped-flair badge shown beside a username. */
export function Flair({ data, className = "" }: { data?: CosmeticData; className?: string }) {
  if (!data?.label) return null;
  const color = data.color || "#a87cf8";
  return (
    <span className={`inline-flex shrink-0 items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-semibold ${className}`}
      style={{ color, background: `${color}22`, boxShadow: `inset 0 0 0 1px ${color}55` }}>
      {data.icon && <span aria-hidden>{data.icon}</span>}{data.label}
    </span>
  );
}

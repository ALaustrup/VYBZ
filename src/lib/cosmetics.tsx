import { useEffect, useState, type CSSProperties, type ReactNode } from "react";
import * as api from "@/lib/api";
import { cx } from "@/lib/utils";
import type { Cosmetic, CosmeticData } from "@/types";

export interface ResolvedCosmetics {
  accent?: CosmeticData;
  flair?: CosmeticData;
  frame?: CosmeticData;
  backdrop?: CosmeticData;
}

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

/** Optional frame ring + accent wash around an avatar (visual only). */
export function CosmeticAvatarShell({
  accent,
  frame,
  className,
  children,
}: {
  accent?: CosmeticData;
  frame?: CosmeticData;
  className?: string;
  children: ReactNode;
}) {
  const ring = frame?.ring;
  const ringW = frame?.ringW ?? 2;
  const [c0, c1] = accentGradient(accent, ["transparent", "transparent"]);
  const hasAccent = !!(accent?.c0 && accent?.c1);
  return (
    <span
      className={cx("relative inline-flex shrink-0", className)}
      style={ring ? { boxShadow: `0 0 0 ${ringW}px ${ring}` , borderRadius: "1rem" } : undefined}
    >
      {hasAccent && (
        <span
          aria-hidden
          className="pointer-events-none absolute -inset-1 -z-10 rounded-[1.15rem] opacity-70 blur-[6px]"
          style={{ background: `linear-gradient(135deg, ${c0}, ${c1})` }}
        />
      )}
      {children}
    </span>
  );
}

/** Soft page wash from equipped accent (profile / hub chrome). */
export function accentWashStyle(accent?: CosmeticData): CSSProperties | undefined {
  if (!accent?.c0 || !accent?.c1) return undefined;
  return {
    backgroundImage: [
      `radial-gradient(ellipse 110% 55% at 20% -5%, ${accent.c0}2e, transparent 55%)`,
      `radial-gradient(ellipse 90% 45% at 100% 0%, ${accent.c1}24, transparent 50%)`,
    ].join(", "),
  };
}

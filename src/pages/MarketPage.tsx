import { useEffect, useState } from "react";
import { Link, Navigate } from "react-router-dom";
import { Loader2, Package, Plus, Store } from "lucide-react";
import { ToolWorkbench } from "@/components/ToolWorkbench";
import { useRegisterAppBar } from "@/lib/appBarBridge";
import { FLAGS } from "@/lib/flags";
import * as api from "@/lib/api";
import {
  defaultCoverUrl,
  formatPackPrice,
  previewPublicUrl,
  type StorefrontPackPublic,
} from "@/features/storefront/types";

const SUPABASE_URL = (import.meta.env.VITE_SUPABASE_URL as string | undefined) ?? "";

/**
 * M10 Store commerce wedge 1 — Market browse home.
 * Lists measured published packs only. No invented inventory / listener counts.
 * Checkout and publish remain on existing `/pack/:slug` and `/tools/packs`.
 */
export function MarketPage({ publicShell = false }: { publicShell?: boolean }) {
  const [packs, setPacks] = useState<StorefrontPackPublic[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useRegisterAppBar({ title: "Market", subtitle: "Sample packs" }, []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const list = await api.listPublishedStorefrontPacks(48);
        if (!cancelled) {
          setPacks(list);
          setError(null);
        }
      } catch (e) {
        if (!cancelled) {
          setPacks([]);
          setError((e as Error).message || "Could not load Market");
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  if (!FLAGS.storefront) return <Navigate to="/" replace />;

  return (
    <ToolWorkbench
      wide
      eyebrow="Market"
      title="Sample pack Market"
      subtitle="Browse published packs on VYBZ. Prices and listings come from live storefront rows — empty means zero published packs, not a placeholder catalog."
      testId="market-browse"
      className={publicShell ? "!pb-10" : undefined}
    >
      <div className="flex flex-wrap gap-2" data-testid="market-seller-ctas">
        {!publicShell && (
          <>
            <Link to="/tools/packs" className="forge-cta inline-flex items-center gap-1.5 !min-h-9 !px-3 !text-xs">
              <Store className="h-3.5 w-3.5" /> Seller dashboard
            </Link>
            <Link to="/tools/packs/new" className="forge-cta-ghost inline-flex items-center gap-1.5 !min-h-9 !px-3 !text-xs">
              <Plus className="h-3.5 w-3.5" /> New pack
            </Link>
            <Link to="/tools/pack-maker" className="forge-cta-ghost inline-flex items-center gap-1.5 !min-h-9 !px-3 !text-xs">
              <Package className="h-3.5 w-3.5" /> Pack Maker
            </Link>
          </>
        )}
        {publicShell && (
          <Link to="/enter" className="forge-cta-ghost inline-flex items-center gap-1.5 !min-h-9 !px-3 !text-xs">
            Sign in to sell packs
          </Link>
        )}
      </div>

      {packs === null ? (
        <div className="flex justify-center py-16">
          <Loader2 className="h-6 w-6 animate-spin text-[rgb(var(--app-accent-rgb))]" />
        </div>
      ) : error ? (
        <p className="forge-glass relative !rounded-2xl p-4 text-sm text-rose-300" role="alert" data-testid="market-browse-error">
          <span className="forge-glass-edge pointer-events-none" aria-hidden />
          <span className="relative z-[1]">{error}</span>
        </p>
      ) : packs.length === 0 ? (
        <div
          className="forge-glass forge-plasma relative flex flex-col items-center gap-2 !rounded-2xl px-6 py-12 text-center"
          data-testid="market-browse-empty"
        >
          <span className="forge-glass-edge pointer-events-none" aria-hidden />
          <Package className="relative z-[1] h-8 w-8 text-[rgb(var(--app-accent-rgb))]" />
          <p className="relative z-[1] font-display text-base font-semibold text-white/85">No published packs yet</p>
          <p className="relative z-[1] max-w-sm text-sm text-white/45">
            When creators publish a sample pack, it appears here. VYBZ does not invent listings or claim DSP distribution.
          </p>
        </div>
      ) : (
        <ul
          className="grid gap-3 sm:grid-cols-2"
          data-testid="market-browse-grid"
          aria-label={`${packs.length} published packs`}
        >
          {packs.map((pack) => {
            const cover = previewPublicUrl(pack.cover_path, SUPABASE_URL) ?? defaultCoverUrl();
            return (
              <li key={pack.id}>
                <Link
                  to={`/pack/${pack.slug}`}
                  className="forge-glass relative flex gap-3 !rounded-2xl p-3 transition hover:border-white/20"
                  data-testid={`market-pack-${pack.slug}`}
                >
                  <span className="forge-glass-edge pointer-events-none" aria-hidden />
                  <img
                    src={cover}
                    alt=""
                    className="relative z-[1] h-20 w-20 shrink-0 rounded-xl object-cover bg-black/40"
                    loading="lazy"
                  />
                  <div className="relative z-[1] min-w-0 flex-1">
                    <p className="truncate font-medium text-white/90">{pack.title || "Untitled pack"}</p>
                    {pack.genre ? (
                      <p className="mt-0.5 truncate text-[11px] uppercase tracking-wider text-white/35">{pack.genre}</p>
                    ) : null}
                    <p className="mt-1 text-sm tabular-nums text-[rgb(var(--app-accent-rgb))]">
                      {formatPackPrice(pack.price_cents, pack.currency)}
                    </p>
                  </div>
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </ToolWorkbench>
  );
}

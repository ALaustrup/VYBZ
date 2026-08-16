import { useEffect, useMemo, useState, type MouseEvent } from "react";
import { Link, Navigate } from "react-router-dom";
import { Loader2, Package, Pause, Play, Plus, Search, Store } from "lucide-react";
import { ToolWorkbench } from "@/components/ToolWorkbench";
import { useRegisterAppBar } from "@/lib/appBarBridge";
import { FLAGS } from "@/lib/flags";
import * as api from "@/lib/api";
import { pause, playTrack, usePlayer } from "@/lib/audioBus";
import {
  defaultCoverUrl,
  formatPackPrice,
  previewPublicUrl,
  type StorefrontPackPublic,
} from "@/features/storefront/types";
import {
  filterMarketPacks,
  genresFromPacks,
  packHasPreview,
} from "@/features/storefront/marketBrowse";

const SUPABASE_URL = (import.meta.env.VITE_SUPABASE_URL as string | undefined) ?? "";

/**
 * OR-039 — Market discovery (iTunes-style browse/listen over measured packs).
 * Catalog = storefront_packs_public only. Preview play only when preview_path exists.
 * Music uploads remain on Discover — soft-linked, not merged into fake inventory.
 */
export function MarketPage({ publicShell = false }: { publicShell?: boolean }) {
  const [packs, setPacks] = useState<StorefrontPackPublic[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [genre, setGenre] = useState<string | null>(null);
  const player = usePlayer();

  useRegisterAppBar({ title: "Shop" }, []);

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
          setError((e as Error).message || "Couldn't load shop");
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const genres = useMemo(() => (packs ? genresFromPacks(packs) : []), [packs]);
  const filtered = useMemo(
    () => (packs ? filterMarketPacks(packs, { query, genre }) : []),
    [packs, query, genre],
  );

  if (!FLAGS.storefront) return <Navigate to="/" replace />;

  function playPreview(pack: StorefrontPackPublic, e: MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    const url = previewPublicUrl(pack.preview_path, SUPABASE_URL);
    if (!url) return;
    const trackId = `market-preview:${pack.id}`;
    if (player.track?.id === trackId && player.playing) {
      pause();
      return;
    }
    playTrack(
      {
        id: trackId,
        url,
        title: pack.title || "Pack preview",
        artist: "Market preview",
      },
      filtered
        .filter(packHasPreview)
        .map((p) => {
          const u = previewPublicUrl(p.preview_path, SUPABASE_URL);
          return {
            id: `market-preview:${p.id}`,
            url: u!,
            title: p.title || "Pack preview",
            artist: "Market preview",
          };
        })
        .filter((t) => !!t.url),
    );
  }

  return (
    <ToolWorkbench
      wide
      eyebrow="Shop"
      title="Packs for sale"
      subtitle="Real listings only. Empty means nothing is up."
      testId="market-browse"
      className={publicShell ? "!pb-10" : undefined}
    >
      <div className="flex flex-wrap gap-2" data-testid="market-seller-ctas">
        {!publicShell && (
          <>
            <Link to="/tools/packs" className="forge-cta inline-flex items-center gap-1.5 !min-h-9 !px-3 !text-xs">
              <Store className="h-3.5 w-3.5" /> Your packs
            </Link>
            <Link to="/tools/packs/new" className="forge-cta-ghost inline-flex items-center gap-1.5 !min-h-9 !px-3 !text-xs">
              <Plus className="h-3.5 w-3.5" /> New pack
            </Link>
            <Link to="/tools/pack-maker" className="forge-cta-ghost inline-flex items-center gap-1.5 !min-h-9 !px-3 !text-xs">
              <Package className="h-3.5 w-3.5" /> Build ZIP
            </Link>
          </>
        )}
        {publicShell && (
          <Link to="/enter" className="forge-cta-ghost inline-flex items-center gap-1.5 !min-h-9 !px-3 !text-xs">
            Sign in
          </Link>
        )}
        <Link
          to="/discover"
          className="forge-cta-ghost inline-flex items-center gap-1.5 !min-h-9 !px-3 !text-xs"
          data-testid="market-discover-link"
        >
          Songs
        </Link>
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
          <p className="relative z-[1] font-display text-base font-semibold text-white/85">Nothing for sale</p>
          <p className="relative z-[1] max-w-sm text-sm text-white/45">
            Packs show up here when someone publishes one. VYBZ does not invent listings.
          </p>
        </div>
      ) : (
        <>
          <div className="flex flex-col gap-3" data-testid="market-browse-controls">
            <label className="forge-field max-w-md">
              <Search className="forge-field-icon h-4 w-4" />
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search packs…"
                aria-label="Search published packs"
                data-testid="market-search"
              />
            </label>
            {genres.length > 0 ? (
              <div
                className="flex flex-wrap gap-1.5"
                role="group"
                aria-label="Genre filter"
                data-testid="market-genre-chips"
              >
                <button
                  type="button"
                  data-testid="market-genre-all"
                  onClick={() => setGenre(null)}
                  className={`rounded-full border px-3 py-1 text-[12px] transition ${
                    genre == null
                      ? "border-[rgb(var(--app-accent-rgb)/0.55)] bg-[rgb(var(--app-accent-rgb)/0.15)] text-white"
                      : "border-white/12 bg-black/25 text-white/70 hover:border-white/25"
                  }`}
                >
                  All
                </button>
                {genres.map((g) => (
                  <button
                    key={g}
                    type="button"
                    data-testid={`market-genre-${g}`}
                    onClick={() => setGenre(g)}
                    className={`rounded-full border px-3 py-1 text-[12px] transition ${
                      genre === g
                        ? "border-[rgb(var(--app-accent-rgb)/0.55)] bg-[rgb(var(--app-accent-rgb)/0.15)] text-white"
                        : "border-white/12 bg-black/25 text-white/70 hover:border-white/25"
                    }`}
                  >
                    {g}
                  </button>
                ))}
              </div>
            ) : null}
          </div>

          {filtered.length === 0 ? (
            <p className="text-sm text-white/45" data-testid="market-browse-filtered-empty">
              No published packs match this search. Filters never invent listings.
            </p>
          ) : (
            <ul
              className="grid gap-3 sm:grid-cols-2"
              data-testid="market-browse-grid"
              aria-label={`${filtered.length} published packs`}
            >
              {filtered.map((pack) => {
                const cover = previewPublicUrl(pack.cover_path, SUPABASE_URL) ?? defaultCoverUrl();
                const previewUrl = previewPublicUrl(pack.preview_path, SUPABASE_URL);
                const trackId = `market-preview:${pack.id}`;
                const isPlaying = player.track?.id === trackId && player.playing;
                return (
                  <li key={pack.id} className="relative">
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
                      <div className="relative z-[1] min-w-0 flex-1 pr-10">
                        <p className="truncate font-medium text-white/90">{pack.title || "Untitled pack"}</p>
                        {pack.genre ? (
                          <p className="mt-0.5 truncate text-[11px] uppercase tracking-wider text-white/35">
                            {pack.genre}
                          </p>
                        ) : null}
                        <p className="mt-1 text-sm tabular-nums text-[rgb(var(--app-accent-rgb))]">
                          {formatPackPrice(pack.price_cents, pack.currency)}
                        </p>
                        {!previewUrl ? (
                          <p className="mt-1 text-[11px] text-white/30">No preview audio</p>
                        ) : null}
                      </div>
                    </Link>
                    {previewUrl ? (
                      <button
                        type="button"
                        data-testid={`market-preview-${pack.slug}`}
                        aria-label={isPlaying ? `Pause preview ${pack.title}` : `Play preview ${pack.title}`}
                        onClick={(e) => playPreview(pack, e)}
                        className="absolute bottom-3 right-3 z-[2] flex h-9 w-9 items-center justify-center rounded-full border border-white/15 bg-black/55 text-white hover:border-white/30"
                      >
                        {isPlaying ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
                      </button>
                    ) : null}
                  </li>
                );
              })}
            </ul>
          )}
        </>
      )}
    </ToolWorkbench>
  );
}

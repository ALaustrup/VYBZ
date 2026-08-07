import { useRef, useState } from "react";
import { MoreVertical, Pause, Play, X } from "lucide-react";
import { TrackActionMenu } from "@/components/TrackActionMenu";
import { TrackVisualizer } from "@/components/TrackVisualizer";
import type { MenuAnchor } from "@/components/menu/ContextMenu";
import { OverlayPortal } from "@/lib/overlayPortal";
import { playTrack, toggle, usePlayer } from "@/lib/audioBus";
import { toPlayerTrack } from "@/lib/toPlayerTrack";
import type { DropGroup } from "@/lib/libraryQuery";
import { paletteFor, cx } from "@/lib/utils";
import type { Drop } from "@/types";

function coverOf(drops: Drop[]): string | null {
  for (const d of drops) {
    if (d.playbackCustomization?.backdropUrl) return d.playbackCustomization.backdropUrl;
  }
  return null;
}

function fmtDur(s?: number | null): string {
  if (!s || !Number.isFinite(s) || s <= 0) return "—";
  return `${Math.floor(s / 60)}:${Math.floor(s % 60).toString().padStart(2, "0")}`;
}

/**
 * High-fidelity album window — artwork fused with reactive viz + editable track list.
 */
export function AlbumLightbox({
  group,
  onClose,
  onChanged,
}: {
  group: DropGroup;
  onClose: () => void;
  onChanged?: () => void;
}) {
  const player = usePlayer();
  const cover = coverOf(group.drops);
  const seed = group.drops[0]?.seed ?? 1;
  const accent = paletteFor(seed)[0];
  const [menuAnchor, setMenuAnchor] = useState<MenuAnchor | null>(null);
  const [menuDrop, setMenuDrop] = useState<Drop | null>(null);
  const moreRefs = useRef<Map<string, HTMLButtonElement>>(new Map());

  const activeId = player.track?.id;
  const hero = group.drops.find((d) => d.id === activeId) ?? group.drops[0];

  function playDrop(d: Drop) {
    playTrack(toPlayerTrack(d), group.drops.map(toPlayerTrack));
  }

  return (
    <OverlayPortal>
      <div className="fixed inset-0 z-[80] flex items-end justify-center sm:items-center" role="dialog" aria-modal aria-label={group.label}>
        <button type="button" className="absolute inset-0 bg-black/75 backdrop-blur-sm" aria-label="Close" onClick={onClose} />
        <div className="forge-glass relative z-10 flex max-h-[min(92dvh,880px)] w-full max-w-3xl flex-col overflow-hidden !rounded-t-3xl sm:!rounded-3xl">
          <span className="forge-glass-edge pointer-events-none" aria-hidden />
          <div className="relative z-[2] flex shrink-0 items-start justify-between gap-3 border-b border-white/[0.06] px-4 py-3 sm:px-5">
            <div className="min-w-0">
              <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-white/35">Release</p>
              <h2 className="truncate font-display text-xl font-semibold text-white">{group.label}</h2>
              <p className="text-[12px] text-white/45">{group.drops.length} tracks</p>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="flex h-9 w-9 items-center justify-center rounded-full border border-white/10 bg-white/[0.04] text-white/70 transition hover:bg-white/[0.08]"
              aria-label="Close"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          <div className="relative z-[2] grid min-h-0 flex-1 gap-0 overflow-y-auto lg:grid-cols-[1.05fr_1fr]">
            <div className="relative aspect-square w-full overflow-hidden border-b border-white/[0.06] lg:aspect-auto lg:min-h-[320px] lg:border-b-0 lg:border-r">
              {cover ? (
                <img src={cover} alt="" className="absolute inset-0 h-full w-full object-cover opacity-70" />
              ) : (
                <div
                  className="absolute inset-0"
                  style={{ background: `radial-gradient(circle at 40% 30%, ${accent}66, #030508 70%)` }}
                />
              )}
              <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-black/20" />
              {hero ? (
                <div className="absolute inset-0 opacity-90">
                  <TrackVisualizer
                    seed={hero.seed}
                    accent={accent}
                    active={player.playing && player.track?.id === hero.id}
                    backdropUrl={cover ?? undefined}
                    className="h-full w-full"
                  />
                </div>
              ) : null}
              <button
                type="button"
                onClick={() => {
                  if (!hero) return;
                  if (player.track?.id === hero.id) void toggle();
                  else playDrop(hero);
                }}
                className="absolute bottom-4 left-4 flex h-12 w-12 items-center justify-center rounded-full border border-white/20 bg-black/50 text-white backdrop-blur-md transition hover:scale-105"
                aria-label={player.playing && player.track?.id === hero?.id ? "Pause" : "Play"}
              >
                {player.playing && player.track?.id === hero?.id ? (
                  <Pause className="h-5 w-5" fill="currentColor" />
                ) : (
                  <Play className="ml-0.5 h-5 w-5" fill="currentColor" />
                )}
              </button>
            </div>

            <ul className="flex flex-col px-2 py-2 sm:px-3">
              {group.drops.map((d, i) => {
                const active = player.track?.id === d.id;
                return (
                  <li key={d.id}>
                    <div
                      className={cx(
                        "group flex items-center gap-2 rounded-xl px-2 py-2.5 transition",
                        active ? "bg-white/[0.08]" : "hover:bg-white/[0.04]",
                      )}
                    >
                      <button
                        type="button"
                        onClick={() => {
                          if (active) void toggle();
                          else playDrop(d);
                        }}
                        className="flex min-w-0 flex-1 items-center gap-3 text-left"
                      >
                        <span className="w-5 shrink-0 text-center font-mono text-[11px] text-white/35">
                          {active && player.playing ? (
                            <Pause className="mx-auto h-3.5 w-3.5 text-cyan-300" />
                          ) : (
                            i + 1
                          )}
                        </span>
                        <span className="min-w-0 flex-1">
                          <span className="block truncate text-[13px] font-medium text-white">{d.title || "Untitled"}</span>
                          <span className="block truncate text-[11px] text-white/40">
                            {d.creditedArtist || d.authorUsername || "—"}
                          </span>
                        </span>
                        <span className="shrink-0 font-mono text-[11px] text-white/35">{fmtDur(d.durationSec)}</span>
                      </button>
                      <button
                        type="button"
                        ref={(el) => {
                          if (el) moreRefs.current.set(d.id, el);
                          else moreRefs.current.delete(d.id);
                        }}
                        onClick={(e) => {
                          e.stopPropagation();
                          const btn = moreRefs.current.get(d.id);
                          if (!btn) return;
                          const r = btn.getBoundingClientRect();
                          setMenuDrop(d);
                          setMenuAnchor({ x: r.right, y: r.bottom + 4 });
                        }}
                        className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-white/40 opacity-0 transition hover:bg-white/10 hover:text-white group-hover:opacity-100 focus:opacity-100"
                        aria-label="Track actions"
                      >
                        <MoreVertical className="h-4 w-4" />
                      </button>
                    </div>
                  </li>
                );
              })}
            </ul>
          </div>
        </div>

        {menuDrop && menuAnchor ? (
          <TrackActionMenu
            drop={menuDrop}
            open
            anchor={menuAnchor}
            onClose={() => {
              setMenuAnchor(null);
              setMenuDrop(null);
            }}
            onChanged={() => onChanged?.()}
            onPlay={() => playDrop(menuDrop)}
          />
        ) : null}
      </div>
    </OverlayPortal>
  );
}

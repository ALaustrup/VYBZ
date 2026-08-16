import { useEffect, useState } from "react";
import { Loader2, Pause, Play, SkipBack, SkipForward, PanelRightClose, PanelRightOpen } from "lucide-react";
import { next, prev, toggle, usePlayerShell } from "@/lib/audioBus";
import { cx } from "@/lib/utils";

/**
 * @deprecated Unused — right rail is SuiteAppRail (suite apps).
 * Kept in tree for recovery; imported by nothing. Playback remains on VDock.
 */
export function NowPlayingRail() {
  const p = usePlayerShell();
  const hasTrack = !!p.track;
  const [open, setOpen] = useState(hasTrack);

  useEffect(() => {
    if (hasTrack) setOpen(true);
  }, [hasTrack, p.track?.id]);

  const accent = p.track?.accent ?? "#00C2FF";
  const art = p.track?.playback?.backdropUrl;

  return (
    <aside
      className={cx(
        "suite-inspector glass-vibrant hidden shrink-0 border-l border-[var(--hairline)] transition-[width] duration-suite-base ease-suite lg:flex lg:flex-col",
        open ? "w-56" : "w-10",
      )}
      aria-label="Now playing"
    >
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        aria-label={open ? "Collapse now playing" : "Expand now playing"}
        className="flex h-10 items-center justify-center text-white/45 transition duration-suite-fast ease-suite hover:bg-white/[0.06] hover:text-white/80"
      >
        {open ? <PanelRightClose className="h-4 w-4" /> : <PanelRightOpen className="h-4 w-4" />}
      </button>

      {open ? (
        <div className="flex min-h-0 flex-1 flex-col gap-3 px-3 pb-4">
          <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-white/35">
            Now playing
          </p>

          {hasTrack ? (
            <>
              <div
                className="relative aspect-square w-full overflow-hidden rounded-xl border border-white/10"
                style={{
                  background: `radial-gradient(circle at 35% 30%, ${accent}55, transparent 65%), rgba(0,0,0,0.35)`,
                }}
              >
                {art ? (
                  <img src={art} alt="" className="absolute inset-0 h-full w-full object-cover opacity-80" />
                ) : null}
              </div>
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold text-white">{p.track!.title}</p>
                <p className="truncate text-[12px] text-white/45">{p.track!.artist || "Unknown artist"}</p>
                {p.queueLength > 1 ? (
                  <p className="mt-1 text-[10px] uppercase tracking-wider text-white/30">
                    Queue · {p.queueLength}
                  </p>
                ) : null}
              </div>
              <div className="mt-auto flex items-center justify-center gap-1">
                <button
                  type="button"
                  onClick={() => prev()}
                  disabled={p.queueLength <= 1}
                  aria-label="Previous"
                  className="flex h-9 w-9 items-center justify-center rounded-xl text-white/80 transition hover:bg-white/10 disabled:opacity-30"
                >
                  <SkipBack className="h-4 w-4" />
                </button>
                <button
                  type="button"
                  onClick={() => void toggle()}
                  aria-label={p.playing ? "Pause" : "Play"}
                  className="flex h-11 w-11 items-center justify-center rounded-full text-white transition active:scale-95"
                  style={{
                    background: `radial-gradient(circle at 40% 35%, ${accent}, color-mix(in srgb, ${accent} 35%, #05070a) 70%)`,
                    boxShadow: `0 0 14px -2px ${accent}`,
                  }}
                >
                  {p.loading ? (
                    <Loader2 className="h-5 w-5 animate-spin" />
                  ) : p.playing ? (
                    <Pause className="h-5 w-5" fill="currentColor" />
                  ) : (
                    <Play className="ml-0.5 h-5 w-5" fill="currentColor" />
                  )}
                </button>
                <button
                  type="button"
                  onClick={() => next()}
                  disabled={p.queueLength <= 1}
                  aria-label="Next"
                  className="flex h-9 w-9 items-center justify-center rounded-xl text-white/80 transition hover:bg-white/10 disabled:opacity-30"
                >
                  <SkipForward className="h-4 w-4" />
                </button>
              </div>
            </>
          ) : (
            <p className="text-[12px] leading-relaxed text-white/40">
              Nothing playing. Pick a track.
            </p>
          )}
        </div>
      ) : null}
    </aside>
  );
}

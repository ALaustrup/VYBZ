import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import { useNavigate } from "react-router-dom";
import { AnimatePresence, motion } from "framer-motion";
import {
  ChevronDown,
  Heart,
  MessageSquare,
  Pause,
  Play,
  SkipBack,
  SkipForward,
  Volume2,
  VolumeX,
  Loader2,
  Coins,
} from "lucide-react";
import {
  usePlayer,
  usePlayerShell,
  getPlaybackProgress,
  toggle,
  next,
  prev,
  seekFraction,
  setVolume,
  toggleMute,
  readBands,
} from "@/lib/audioBus";
import { COLOR_V2 } from "@/design/tokens";
import { Waveform } from "@/components/Waveform";
import { TrackVisualizer } from "@/components/TrackVisualizer";
import { ExtractMidiButton } from "@/components/ExtractMidiButton";
import { TrackCommentsSheet } from "@/components/TrackCommentsSheet";
import { VcTipSheet } from "@/components/VcTipSheet";
import { VizModeCycleButton, VizModeSelector } from "@/components/vdock/VizModePicker";
import {
  isFavoriteCached,
  subscribeFavorites,
  syncFavorites,
  toggleFavorite,
} from "@/lib/favorites";
import { useReduceFx } from "@/lib/display";
import { OverlayPortal } from "@/lib/overlayPortal";
import { useSession } from "@/store/session";
import { cx } from "@/lib/utils";

/** Suite cyan — typed fallback when a track has no accent. */
const DEFAULT_ACCENT = COLOR_V2.cyan;

function fmt(s: number): string {
  if (!Number.isFinite(s) || s < 0) return "0:00";
  const m = Math.floor(s / 60);
  const sec = Math.floor(s % 60);
  return `${m}:${sec.toString().padStart(2, "0")}`;
}

function hueShift(hex: string, bass: number, mid: number, high: number): string {
  const h = hex.replace("#", "");
  const n = parseInt(h.length === 3 ? h.split("").map((c) => c + c).join("") : h, 16);
  let r = (n >> 16) & 255;
  let g = (n >> 8) & 255;
  let b = n & 255;
  r = Math.min(255, Math.round(r + high * 40 + mid * 10));
  g = Math.min(255, Math.round(g + mid * 50 + bass * 15));
  b = Math.min(255, Math.round(b + bass * 55 + high * 20));
  return `rgb(${r},${g},${b})`;
}

/**
 * Compact now-playing **widget** (legacy compact chip).
 * Prefer MusicDockPlayer in the music dock.
 */
export function NowPlayingWidget({
  className,
  dimmed = false,
}: {
  className?: string;
  dimmed?: boolean;
}) {
  const p = usePlayer();
  const [expanded, setExpanded] = useState(false);
  if (!p.track) return null;

  const accent = p.track.accent ?? DEFAULT_ACCENT;
  const dur = p.duration || p.track.durationSec || 0;
  const progress = dur > 0 ? p.currentTime / dur : 0;

  return (
    <>
      <div
        className={cx(
          "relative flex h-full min-w-0 items-center gap-0.5",
          dimmed && "pointer-events-none opacity-40",
          className,
        )}
        data-taskbar-widget="now-playing"
      >
        <button
          type="button"
          onClick={() => void toggle()}
          data-tip={p.playing ? "Pause" : "Play"}
          aria-label={p.playing ? "Pause" : "Play"}
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-white/10 text-white ring-1 ring-white/15 transition active:scale-90"
          style={{ boxShadow: `0 0 16px -6px ${accent}` }}
        >
          {p.loading ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : p.playing ? (
            <Pause className="h-4 w-4" />
          ) : (
            <Play className="ml-0.5 h-4 w-4" />
          )}
        </button>

        <button
          type="button"
          onClick={() => setExpanded(true)}
          data-tip={p.track.title}
          aria-label={`Now playing: ${p.track.title}`}
          className="relative flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-white/10 text-white ring-1 ring-white/15 transition active:scale-90"
        >
          <span
            className="absolute inset-x-1.5 bottom-1 h-0.5 overflow-hidden rounded-full bg-white/15"
            aria-hidden
          >
            <span
              className="block h-full origin-left rounded-full"
              style={{
                background: accent,
                transform: `scaleX(${Math.max(0, Math.min(1, progress))})`,
              }}
            />
          </span>
          <span className="text-[10px] font-bold tracking-tight" style={{ color: accent }}>NP</span>
        </button>

        {p.queueLength > 1 && (
          <button
            type="button"
            onClick={next}
            data-tip="Next"
            aria-label="Next"
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl text-white/45 transition hover:bg-white/10 hover:text-white active:scale-90"
          >
            <SkipForward className="h-3.5 w-3.5" />
          </button>
        )}
      </div>

      <NowPlayingExpanded open={expanded} onClose={() => setExpanded(false)} />
    </>
  );
}

/**
 * Full music-dock player —
 * left meta · centered prev/play/next (beat-reactive) · right comment/heart/tip.
 */
export function MusicDockPlayer() {
  const p = usePlayerShell();
  const reduce = useReduceFx();
  const { showToast, userId } = useSession();
  const [expanded, setExpanded] = useState(false);
  const [commentsOpen, setCommentsOpen] = useState(false);
  const [tipOpen, setTipOpen] = useState(false);
  const [favBusy, setFavBusy] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const playBtnRef = useRef<HTMLButtonElement>(null);
  const metaFillRef = useRef<HTMLSpanElement>(null);

  const favorited = useSyncExternalStore(
    subscribeFavorites,
    () => isFavoriteCached(p.track?.id),
    () => false,
  );

  const accent = p.track?.accent ?? DEFAULT_ACCENT;
  const networkDrop = !!p.track?.authorId && p.track.earnEligible !== false;

  useEffect(() => {
    if (userId) void syncFavorites();
  }, [userId]);

  useEffect(() => {
    if (!p.lastError || !p.track) return;
    const hints: Record<number, string> = {
      1: "Audio aborted",
      2: "Network error loading audio",
      3: "Audio decode failed",
      4: "Audio source not playable (CDN/storage) — try re-uploading the drop",
    };
    showToast(hints[p.lastError] ?? `Audio error ${p.lastError}`);
  }, [p.lastError, p.track?.id, showToast]);

  // Beat + progress via CSS vars / transforms — no per-frame React re-renders.
  useEffect(() => {
    let raf = 0;
    let running = true;
    const baseAccent = accent;

    const applyIdle = () => {
      const btn = playBtnRef.current;
      const root = rootRef.current;
      if (root) root.style.setProperty("--vdock-accent", baseAccent);
      if (btn) {
        btn.style.setProperty("--vdock-beat-scale", "1");
        btn.style.setProperty("--vdock-beat-glow", "14px");
        btn.style.setProperty("--vdock-halo-scale", "0.92");
        btn.style.background =
          `radial-gradient(circle at 40% 35%, ${baseAccent}, color-mix(in srgb, ${baseAccent} 35%, var(--color-abyss)) 70%)`;
        btn.style.boxShadow =
          `0 0 14px -2px ${baseAccent}, 0 0 22px -8px ${baseAccent}, inset 0 1px 0 rgba(255,255,255,0.35)`;
        btn.style.border = `1px solid color-mix(in srgb, ${baseAccent} 55%, white)`;
      }
      const fill = metaFillRef.current;
      if (fill) fill.style.transform = `scaleX(${getPlaybackProgress().fraction})`;
    };

    const tick = () => {
      if (!running) return;
      const { fraction } = getPlaybackProgress();
      const fill = metaFillRef.current;
      if (fill) fill.style.transform = `scaleX(${fraction})`;

      const btn = playBtnRef.current;
      const root = rootRef.current;
      if (!reduce && p.playing && btn && root) {
        const beat = readBands();
        const color = hueShift(baseAccent, beat.bass, beat.mid, beat.high);
        const scale = 1 + beat.bass * 0.22 + beat.level * 0.08;
        const glow = 18 + beat.bass * 36 + beat.level * 20;
        root.style.setProperty("--vdock-accent", color);
        btn.style.setProperty("--vdock-beat-scale", String(scale));
        btn.style.setProperty("--vdock-beat-glow", `${glow}px`);
        btn.style.setProperty("--vdock-halo-scale", String(0.92 + beat.bass * 0.28));
        btn.style.background =
          `radial-gradient(circle at 40% 35%, ${color}, color-mix(in srgb, ${color} 35%, var(--color-abyss)) 70%)`;
        btn.style.boxShadow =
          `0 0 ${glow}px -2px ${color}, 0 0 ${glow * 1.6}px -8px ${color}, inset 0 1px 0 rgba(255,255,255,0.35)`;
        btn.style.border = `1px solid color-mix(in srgb, ${color} 55%, white)`;
      }
      raf = requestAnimationFrame(tick);
    };

    applyIdle();
    raf = requestAnimationFrame(tick);
    return () => {
      running = false;
      cancelAnimationFrame(raf);
    };
  }, [p.playing, reduce, p.track?.id, accent]);

  async function onHeart() {
    if (!p.track || !userId) {
      showToast("Sign in to favorite tracks");
      return;
    }
    if (!networkDrop) {
      showToast("Favorites are for VYBZ drops");
      return;
    }
    setFavBusy(true);
    const res = await toggleFavorite(p.track.id);
    setFavBusy(false);
    if (!res.ok) {
      showToast(res.error || "Couldn't update Favorites");
      return;
    }
    showToast(res.favorited ? "Added to Favorites" : "Removed from Favorites");
  }

  return (
    <>
      <div
        ref={rootRef}
        className="grid h-full w-full min-h-[3.25rem] grid-cols-[1fr_auto_1fr] items-center gap-1 sm:gap-2"
        data-taskbar-widget="music-dock"
        style={{ ["--vdock-accent" as string]: accent }}
      >
        {/* Left — track meta */}
        <button
          type="button"
          onClick={() => p.track && setExpanded(true)}
          disabled={!p.track}
          className="vdock-meta min-w-0 justify-self-stretch pr-1 text-left disabled:opacity-50"
          aria-label={p.track ? `Now playing: ${p.track.title}` : "No track"}
        >
          <span className="vdock-meta-title block truncate font-display text-[13px] font-semibold sm:text-[15px]">
            {p.track?.title ?? "Nothing playing"}
          </span>
          <span className="vdock-meta-artist block truncate text-[10px] sm:text-[11px]">
            {p.track?.artist ?? "Pick a track from Library or Discover"}
          </span>
          <span className="vdock-meta-rail mt-1 block max-w-[11rem] overflow-hidden sm:max-w-[16rem]" aria-hidden>
            <span
              ref={metaFillRef}
              className="vdock-meta-fill block h-full origin-left rounded-full"
              style={{ transform: "scaleX(0)" }}
            />
          </span>
        </button>

        {/* Center — transport */}
        <div className="flex shrink-0 items-center justify-center gap-0.5 sm:gap-1.5">
          <button
            type="button"
            onClick={prev}
            disabled={!p.track || p.queueLength <= 1}
            data-tip="Previous"
            aria-label="Previous"
            className={cx(
              "vdock-ctrl vdock-ctrl--side relative flex h-9 w-9 items-center justify-center rounded-xl text-white/85 transition active:scale-90 disabled:opacity-30 sm:h-10 sm:w-10",
              p.playing && !reduce ? "vdock-pulse-side" : "",
            )}
          >
            <span className="vdock-ctrl-glow" aria-hidden />
            <SkipBack className="relative z-[1] h-4 w-4 sm:h-[18px] sm:w-[18px]" strokeWidth={2.25} />
          </button>

          <button
            ref={playBtnRef}
            type="button"
            onClick={() => void toggle()}
            disabled={!p.track}
            data-tip={p.playing ? "Pause" : "Play"}
            aria-label={p.playing ? "Pause" : "Play"}
            className={cx(
              "vdock-play-center relative flex h-12 w-12 items-center justify-center rounded-full text-white transition active:scale-95 disabled:opacity-40 sm:h-14 sm:w-14",
              p.playing && !reduce ? "vdock-pulse-play" : "vdock-pulse-idle",
            )}
            style={{
              background: `radial-gradient(circle at 40% 35%, ${accent}, color-mix(in srgb, ${accent} 35%, var(--color-abyss)) 70%)`,
              boxShadow: `0 0 14px -2px ${accent}, 0 0 22px -8px ${accent}, inset 0 1px 0 rgba(255,255,255,0.35)`,
              border: `1px solid color-mix(in srgb, ${accent} 55%, white)`,
            }}
          >
            <span
              className="vdock-play-halo pointer-events-none absolute inset-[-6px] rounded-full opacity-70"
              style={{
                background: `radial-gradient(circle, color-mix(in srgb, ${accent} 55%, transparent), transparent 68%)`,
                filter: "blur(6px)",
              }}
              aria-hidden
            />
            <span className="relative z-[1]">
              {p.loading ? (
                <Loader2 className="h-6 w-6 animate-spin sm:h-7 sm:w-7" />
              ) : p.playing ? (
                <Pause className="h-6 w-6 sm:h-7 sm:w-7" strokeWidth={2.4} fill="currentColor" />
              ) : (
                <Play className="ml-0.5 h-6 w-6 sm:h-7 sm:w-7" strokeWidth={2.4} fill="currentColor" />
              )}
            </span>
          </button>

          <button
            type="button"
            onClick={next}
            disabled={!p.track || p.queueLength <= 1}
            data-tip="Next"
            aria-label="Next"
            className={cx(
              "vdock-ctrl vdock-ctrl--side relative flex h-9 w-9 items-center justify-center rounded-xl text-white/85 transition active:scale-90 disabled:opacity-30 sm:h-10 sm:w-10",
              p.playing && !reduce ? "vdock-pulse-side" : "",
            )}
          >
            <span className="vdock-ctrl-glow" aria-hidden />
            <SkipForward className="relative z-[1] h-4 w-4 sm:h-[18px] sm:w-[18px]" strokeWidth={2.25} />
          </button>
        </div>

        {/* Right — interactions */}
        <div className="flex shrink-0 items-center justify-end gap-0.5 sm:gap-1">
          <button
            type="button"
            onClick={() => {
              if (!p.track || !networkDrop) {
                showToast(p.track ? "Comments are for VYBZ drops" : "Nothing playing");
                return;
              }
              setCommentsOpen(true);
            }}
            disabled={!p.track}
            data-tip="Comments"
            aria-label="Comments"
            className="vdock-action flex h-9 w-9 items-center justify-center rounded-xl text-white/80 transition hover:bg-white/10 hover:text-white active:scale-90 disabled:opacity-30 sm:h-10 sm:w-10"
          >
            <MessageSquare className="h-4 w-4 sm:h-[18px] sm:w-[18px]" strokeWidth={2.1} />
          </button>
          <button
            type="button"
            onClick={() => void onHeart()}
            disabled={!p.track || favBusy}
            data-tip={favorited ? "Unfavorite" : "Favorite"}
            aria-label={favorited ? "Unfavorite" : "Favorite"}
            aria-pressed={favorited}
            className={cx(
              "vdock-action flex h-9 w-9 items-center justify-center rounded-xl transition active:scale-90 disabled:opacity-30 sm:h-10 sm:w-10",
              favorited ? "text-rose-300 hover:bg-rose-400/15" : "text-white/80 hover:bg-white/10 hover:text-white",
            )}
          >
            <Heart
              className="h-4 w-4 sm:h-[18px] sm:w-[18px]"
              strokeWidth={2.1}
              fill={favorited ? "currentColor" : "none"}
            />
          </button>
          <button
            type="button"
            onClick={() => {
              if (!p.track) return;
              if (!networkDrop || !p.track.artistUsername) {
                showToast("Tips need a VYBZ artist username");
                return;
              }
              if (p.track.authorId && p.track.authorId === userId) {
                showToast("Can't tip yourself");
                return;
              }
              setTipOpen(true);
            }}
            disabled={!p.track}
            data-tip="Tip with Vc"
            aria-label="Tip artist"
            className="vdock-action flex h-9 w-9 items-center justify-center rounded-xl text-white/80 transition hover:bg-white/10 hover:text-cyan-100 active:scale-90 disabled:opacity-30 sm:h-10 sm:w-10"
          >
            <Coins className="h-4 w-4 sm:h-[18px] sm:w-[18px]" strokeWidth={2.1} />
          </button>
          <VizModeCycleButton />
        </div>
      </div>

      <NowPlayingExpanded
        open={expanded}
        onClose={() => setExpanded(false)}
      />
      <TrackCommentsSheet
        open={commentsOpen}
        onClose={() => setCommentsOpen(false)}
        dropId={p.track?.id ?? null}
        title={p.track?.title}
        artist={p.track?.artist}
      />
      <VcTipSheet
        open={tipOpen}
        onClose={() => setTipOpen(false)}
        username={p.track?.artistUsername ?? null}
        displayName={p.track?.artist}
        hostId={p.track?.authorId}
      />
    </>
  );
}

/** Soft accent progress along the top of the translucent dock. */
export function DockPlaybackProgress() {
  const p = usePlayerShell();
  const barRef = useRef<HTMLSpanElement>(null);
  const accent = p.track?.accent ?? DEFAULT_ACCENT;

  useEffect(() => {
    if (!p.track) return;
    let raf = 0;
    let running = true;
    const tick = () => {
      if (!running) return;
      const el = barRef.current;
      if (el) el.style.transform = `scaleX(${getPlaybackProgress().fraction})`;
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => {
      running = false;
      cancelAnimationFrame(raf);
    };
  }, [p.track?.id]);

  if (!p.track) return null;
  return (
    <span
      ref={barRef}
      aria-hidden
      className="pointer-events-none absolute inset-x-0 top-0 z-[2] h-[2px] origin-left"
      style={{
        background: `linear-gradient(90deg, ${accent}, rgba(0,214,143,0.85))`,
        transform: "scaleX(0)",
        boxShadow: `0 0 12px ${accent}`,
      }}
    />
  );
}

function NowPlayingExpanded({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  const p = usePlayer();
  const navigate = useNavigate();
  if (!p.track) return null;
  const accent = p.track.accent ?? DEFAULT_ACCENT;
  const dur = p.duration || p.track.durationSec || 0;
  const progress = dur > 0 ? p.currentTime / dur : 0;
  const peaks = p.track.waveform;

  function openArtist() {
    const aid = p.track?.authorId;
    if (!aid) return;
    onClose();
    navigate(`/u/${aid}`);
  }

  return (
    <AnimatePresence>
      {open && (
        <OverlayPortal>
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[92] flex flex-col bg-ink-900/92 backdrop-blur-2xl glass-vibrant"
          data-dark-stage
        >
          <div className="absolute inset-0 opacity-70">
            <TrackVisualizer
              seed={p.track.seed ?? 1}
              accent={accent}
              active={p.playing}
              backdropUrl={p.track.playback?.backdropUrl}
              backdropFit={p.track.playback?.backdropFit}
              backdropDim={p.track.playback?.backdropDim}
            />
          </div>
          <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-ink-950/60 via-transparent to-ink-950/90" />

          <div className="relative z-10 flex items-center justify-between px-5 pt-[max(1rem,env(safe-area-inset-top))]">
            <button
              type="button"
              onClick={onClose}
              aria-label="Minimize player"
              className="flex h-10 w-10 items-center justify-center rounded-full glass active:scale-90"
            >
              <ChevronDown className="h-5 w-5" />
            </button>
            <span className="font-display text-xs uppercase tracking-[0.25em] text-white/50">
              Now playing
            </span>
            <span className="w-10" />
          </div>

          <div className="relative z-10 mt-auto flex flex-col gap-4 px-6 pb-[max(2rem,calc(var(--dock-reserve,6.25rem)+1rem))]">
            <div>
              <h2 className="font-display text-2xl font-bold text-white">{p.track.title}</h2>
              <button
                type="button"
                onClick={openArtist}
                disabled={!p.track.authorId}
                className="mt-1 flex items-center gap-2 text-left text-sm text-white/60 transition hover:text-cyan-200 disabled:hover:text-white/60"
              >
                {p.track.artist}
                {p.track.quality && (
                  <span className="rounded-full border border-white/15 bg-black/30 px-2 py-0.5 font-mono text-[10px] uppercase tracking-wide text-white/70">
                    {p.track.quality}
                  </span>
                )}
              </button>
            </div>

            {peaks && (
              <Waveform
                peaks={peaks}
                progress={progress}
                accent={accent}
                height={64}
                onSeek={(f) => seekFraction(f)}
              />
            )}
            <div className="flex items-center justify-between font-mono text-[11px] text-white/50">
              <span>{fmt(p.currentTime)}</span>
              <span>{fmt(dur)}</span>
            </div>

            <div className="flex items-center justify-center gap-6">
              <button
                type="button"
                onClick={prev}
                aria-label="Previous"
                className="flex h-12 w-12 items-center justify-center rounded-full text-white/80 transition active:scale-90 disabled:opacity-30"
                disabled={p.queueLength <= 1}
              >
                <SkipBack className="h-6 w-6" />
              </button>
              <button
                type="button"
                onClick={() => void toggle()}
                aria-label={p.playing ? "Pause" : "Play"}
                className="flex h-16 w-16 items-center justify-center rounded-full bg-white text-ink-950 shadow-glow transition active:scale-95"
                style={{ boxShadow: `0 0 40px -6px ${accent}` }}
              >
                {p.loading ? (
                  <Loader2 className="h-7 w-7 animate-spin" />
                ) : p.playing ? (
                  <Pause className="h-7 w-7" />
                ) : (
                  <Play className="ml-1 h-7 w-7" />
                )}
              </button>
              <button
                type="button"
                onClick={next}
                aria-label="Next"
                className="flex h-12 w-12 items-center justify-center rounded-full text-white/80 transition active:scale-90 disabled:opacity-30"
                disabled={p.queueLength <= 1}
              >
                <SkipForward className="h-6 w-6" />
              </button>
            </div>

            <div className="flex items-center gap-3">
              <button type="button" onClick={toggleMute} aria-label="Mute" className="text-white/70 active:scale-90">
                {p.muted ? <VolumeX className="h-5 w-5" /> : <Volume2 className="h-5 w-5" />}
              </button>
              <input
                type="range"
                min={0}
                max={1}
                step={0.01}
                value={p.muted ? 0 : p.volume}
                onChange={(e) => setVolume(parseFloat(e.target.value))}
                aria-label="Volume"
                className="h-1 flex-1 cursor-pointer appearance-none rounded-full bg-white/20 accent-white"
                style={{ accentColor: accent }}
              />
            </div>

            <div className="flex flex-col gap-2">
              <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-white/40">
                Visualizer
              </p>
              <VizModeSelector />
              {p.track.url && (
                <ExtractMidiButton source={p.track.url} title={p.track.title} />
              )}
            </div>
          </div>
        </motion.div>
        </OverlayPortal>
      )}
    </AnimatePresence>
  );
}

/** @deprecated Use NowPlayingWidget — kept for any stray imports. */
export function GlobalPlayer({ className }: { className?: string }) {
  return <NowPlayingWidget className={className} />;
}

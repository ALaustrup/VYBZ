import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  ChevronDown,
  Pause,
  Play,
  SkipBack,
  SkipForward,
  Volume2,
  VolumeX,
  Loader2,
} from "lucide-react";
import {
  usePlayer,
  toggle,
  next,
  prev,
  seekFraction,
  setVolume,
  toggleMute,
} from "@/lib/audioBus";
import { Waveform } from "@/components/Waveform";
import { TrackVisualizer } from "@/components/TrackVisualizer";
import { ExtractMidiButton } from "@/components/ExtractMidiButton";
import { cx } from "@/lib/utils";

function fmt(s: number): string {
  if (!Number.isFinite(s) || s < 0) return "0:00";
  const m = Math.floor(s / 60);
  const sec = Math.floor(s % 60);
  return `${m}:${sec.toString().padStart(2, "0")}`;
}

/**
 * Compact now-playing **widget** for the unified V-Dock row (not a second bar).
 * Tap title / art area to expand; transport stays inline beside the Orb.
 */
export function NowPlayingWidget({
  className,
  dimmed = false,
}: {
  className?: string;
  /** Edit-mode: keep visible but non-interactive. */
  dimmed?: boolean;
}) {
  const p = usePlayer();
  const [expanded, setExpanded] = useState(false);
  if (!p.track) return null;

  const accent = p.track.accent ?? "#a87cf8";
  const dur = p.duration || p.track.durationSec || 0;
  const progress = dur > 0 ? p.currentTime / dur : 0;

  return (
    <>
      <div
        className={cx(
          "relative flex h-full min-w-0 max-w-[9.5rem] items-center gap-1 sm:max-w-[12rem] sm:gap-1.5",
          dimmed && "pointer-events-none opacity-40",
          className,
        )}
        data-taskbar-widget="now-playing"
      >
        <button
          type="button"
          onClick={() => void toggle()}
          aria-label={p.playing ? "Pause" : "Play"}
          className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-white/10 text-white transition active:scale-90"
          style={{ boxShadow: `0 0 18px -6px ${accent}` }}
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
          className="min-w-0 flex-1 text-left"
          aria-label="Open now playing"
        >
          <span className="block truncate text-[11px] font-semibold leading-tight text-white sm:text-[12px]">
            {p.track.title}
          </span>
          <span className="mt-0.5 block h-0.5 overflow-hidden rounded-full bg-white/10">
            <span
              className="block h-full origin-left rounded-full"
              style={{
                background: accent,
                transform: `scaleX(${Math.max(0, Math.min(1, progress))})`,
              }}
            />
          </span>
        </button>

        {p.queueLength > 1 && (
          <button
            type="button"
            onClick={next}
            aria-label="Next"
            className="hidden h-8 w-8 shrink-0 items-center justify-center rounded-full text-white/55 transition hover:text-white active:scale-90 sm:flex"
          >
            <SkipForward className="h-3.5 w-3.5" />
          </button>
        )}
      </div>

      <NowPlayingExpanded open={expanded} onClose={() => setExpanded(false)} />
    </>
  );
}

/** Thin accent progress along the top of the unified dock glass. */
export function DockPlaybackProgress() {
  const p = usePlayer();
  if (!p.track) return null;
  const accent = p.track.accent ?? "#a87cf8";
  const dur = p.duration || p.track.durationSec || 0;
  const progress = dur > 0 ? p.currentTime / dur : 0;
  return (
    <span
      aria-hidden
      className="pointer-events-none absolute inset-x-0 top-0 z-[2] h-0.5 origin-left"
      style={{ background: accent, transform: `scaleX(${Math.max(0, Math.min(1, progress))})` }}
    />
  );
}

function NowPlayingExpanded({ open, onClose }: { open: boolean; onClose: () => void }) {
  const p = usePlayer();
  if (!p.track) return null;
  const accent = p.track.accent ?? "#a87cf8";
  const dur = p.duration || p.track.durationSec || 0;
  const progress = dur > 0 ? p.currentTime / dur : 0;
  const peaks = p.track.waveform;

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[75] flex flex-col bg-ink-950/95 backdrop-blur-2xl"
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

          <div className="relative z-10 mt-auto flex flex-col gap-4 px-6 pb-[max(2rem,env(safe-area-inset-bottom))]">
            <div>
              <h2 className="font-display text-2xl font-bold text-white">{p.track.title}</h2>
              <p className="mt-1 flex items-center gap-2 text-sm text-white/60">
                {p.track.artist}
                {p.track.quality && (
                  <span className="rounded-full border border-white/15 bg-black/30 px-2 py-0.5 font-mono text-[10px] uppercase tracking-wide text-white/70">
                    {p.track.quality}
                  </span>
                )}
              </p>
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

            {p.track.url && (
              <div className="flex items-center justify-center">
                <ExtractMidiButton source={p.track.url} title={p.track.title} />
              </div>
            )}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

/** @deprecated Use NowPlayingWidget — kept for any stray imports. */
export function GlobalPlayer({ className }: { className?: string }) {
  return <NowPlayingWidget className={className} />;
}

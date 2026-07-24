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
  Music2,
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
 * Compact now-playing strip for the unified taskbar glass, plus full-screen
 * expanded surface. Renders nothing when the queue is empty.
 */
export function GlobalPlayer({ className }: { className?: string }) {
  const p = usePlayer();
  const [expanded, setExpanded] = useState(false);
  if (!p.track) return null;

  const accent = p.track.accent ?? "#a87cf8";
  const dur = p.duration || p.track.durationSec || 0;
  const progress = dur > 0 ? p.currentTime / dur : 0;
  const peaks = p.track.waveform;

  return (
    <>
      <div className={cx("relative shrink-0", className)}>
        <span
          aria-hidden
          className="absolute inset-x-0 top-0 z-[1] h-0.5 origin-left"
          style={{ background: accent, transform: `scaleX(${progress})` }}
        />
        <div className="flex items-center gap-2 px-2.5 pb-1.5 pt-2.5 sm:gap-2.5 sm:px-3">
          <button
            type="button"
            onClick={() => setExpanded(true)}
            className="flex min-w-0 flex-1 items-center gap-2.5 text-left"
            aria-label="Open now playing"
          >
            <span
              className="flex h-9 w-9 shrink-0 items-center justify-center overflow-hidden rounded-xl"
              style={{ background: `${accent}28` }}
            >
              <Music2 className="h-4 w-4" style={{ color: accent }} />
            </span>
            <span className="min-w-0">
              <span className="block truncate text-[13px] font-semibold leading-tight text-white sm:text-sm">
                {p.track.title}
              </span>
              <span className="block truncate text-[10px] text-white/50 sm:text-[11px]">
                {p.track.artist}
                {p.track.lossless && (
                  <span className="ml-1 font-mono text-[9px] uppercase text-white/40">· HD</span>
                )}
              </span>
            </span>
          </button>

          <div className="flex shrink-0 items-center gap-0.5 sm:gap-1">
            {p.queueLength > 1 && (
              <button
                type="button"
                onClick={prev}
                aria-label="Previous"
                className="hidden h-8 w-8 items-center justify-center rounded-full text-white/70 transition active:scale-90 hover:text-white sm:flex"
              >
                <SkipBack className="h-4 w-4" />
              </button>
            )}
            <button
              type="button"
              onClick={() => void toggle()}
              aria-label={p.playing ? "Pause" : "Play"}
              className="flex h-9 w-9 items-center justify-center rounded-full bg-white/10 text-white transition active:scale-90"
              style={{ boxShadow: `0 0 22px -8px ${accent}` }}
            >
              {p.loading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : p.playing ? (
                <Pause className="h-4 w-4" />
              ) : (
                <Play className="ml-0.5 h-4 w-4" />
              )}
            </button>
            {p.queueLength > 1 && (
              <button
                type="button"
                onClick={next}
                aria-label="Next"
                className="flex h-8 w-8 items-center justify-center rounded-full text-white/70 transition active:scale-90 hover:text-white"
              >
                <SkipForward className="h-4 w-4" />
              </button>
            )}
          </div>
        </div>
        <div className="mx-3 h-px bg-white/[0.07]" />
      </div>

      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[75] flex flex-col bg-ink-950/95 backdrop-blur-2xl"
          >
            <div className="absolute inset-0 opacity-60">
              <TrackVisualizer seed={p.track.seed ?? 1} accent={accent} active={p.playing} />
            </div>
            <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-ink-950/60 via-transparent to-ink-950/90" />

            <div className="relative z-10 flex items-center justify-between px-5 pt-[max(1rem,env(safe-area-inset-top))]">
              <button
                type="button"
                onClick={() => setExpanded(false)}
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
    </>
  );
}

import { useMemo } from "react";
import { Pause, Play, Star, Heart, EyeOff, MessageCircle, Music2, Loader2 } from "lucide-react";
import type { Confession } from "@/types";
import { Handle } from "@/components/Handle";
import { Waveform } from "@/components/Waveform";
import { TrackVisualizer } from "@/components/TrackVisualizer";
import { useApp } from "@/store/AppStore";
import { usePlayer, playTrack, seekFraction, type PlayerTrack } from "@/lib/audioBus";
import { qualityLabel } from "@/lib/waveform";
import { cx, paletteFor, formatCount } from "@/lib/utils";

const KIND_LABEL: Record<string, string> = {
  sample: "Sample",
  loop: "Loop",
  oneshot: "One-shot",
  stem: "Stem",
  acapella: "Acapella",
  midi: "MIDI",
  preset: "Preset",
  project: "Project",
  track: "Track",
};

function fmtTime(s: number): string {
  if (!Number.isFinite(s) || s <= 0) return "0:00";
  const m = Math.floor(s / 60);
  const sec = Math.floor(s % 60);
  return `${m}:${sec.toString().padStart(2, "0")}`;
}

/** Build a player track from a drop. */
export function toPlayerTrack(c: Confession): PlayerTrack {
  const accent = paletteFor(c.seed)[0];
  return {
    id: c.id,
    url: c.audioUrl ?? "",
    title: c.text?.trim() || KIND_LABEL[c.assetKind ?? "track"] || "Untitled",
    artist: c.username || c.alias,
    waveform: c.waveform,
    durationSec: c.durationSec,
    quality: qualityLabel(c.audioFormat, c.sampleRate, c.lossless),
    lossless: c.lossless,
    seed: c.seed,
    accent,
  };
}

interface TrackCardProps {
  confession: Confession;
  /** Full-quality deck for gapless next/prev when this card starts playback. */
  queue?: Confession[];
  compact?: boolean;
  className?: string;
}

/**
 * The track card — the feed's atomic unit for an audio drop (§6.2). A seeded,
 * audio-reactive visualizer fills the stage; a dead-center play button drives
 * the global AudioBus; a waveform scrubber lines the bottom. Beneath: the title,
 * a quiet mono tech strip (kind · BPM · key · quality), and the action row
 * (Vyb/Fail — the taste signal that feeds matchmaking — comments, star rating).
 */
export function TrackCard({ confession: c, queue, compact = false, className }: TrackCardProps) {
  const { recordSwipe, rateTrack, myTrackRating, openPost, comments } = useApp();
  const player = usePlayer();
  const accent = useMemo(() => paletteFor(c.seed)[0], [c.seed]);

  const isCurrent = player.track?.id === c.id;
  const playing = isCurrent && player.playing;
  const loading = isCurrent && player.loading;
  const dur = (isCurrent ? player.duration : 0) || c.durationSec || 0;
  const progress = isCurrent && dur > 0 ? player.currentTime / dur : 0;
  const peaks = c.waveform && c.waveform.length ? c.waveform : undefined;

  const mine = myTrackRating(c.id);
  const avg = c.rating ?? (mine || 0);
  const count = (c.ratingCount ?? 0) + (mine && !c.ratingCount ? 1 : 0);
  const quality = qualityLabel(c.audioFormat, c.sampleRate, c.lossless);
  const commentCount = comments[c.id]?.length ?? 0;

  function togglePlay(e: React.MouseEvent) {
    e.stopPropagation();
    if (!c.audioUrl) return;
    playTrack(toPlayerTrack(c), (queue ?? []).filter((x) => x.audioUrl).map(toPlayerTrack));
  }

  return (
    <div
      className={cx(
        "group relative overflow-hidden rounded-3xl border border-white/10 bg-ink-900/60 shadow-card backdrop-blur-sm",
        className
      )}
      style={{ ["--tc-accent" as string]: accent }}
    >
      {/* Stage: seeded visualizer + centered play + waveform along the bottom. */}
      <div className={cx("relative w-full", compact ? "h-28" : "h-44")}>
        <div className="absolute inset-0">
          <TrackVisualizer seed={c.seed} accent={accent} active={playing} />
        </div>
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-ink-950/70" />

        {/* Lossless / HD badge. */}
        {c.lossless && (
          <span className="absolute right-3 top-3 rounded-full border border-white/20 bg-black/40 px-2 py-0.5 font-mono text-[9px] font-bold uppercase tracking-wider text-white/90 backdrop-blur">
            Lossless
          </span>
        )}

        {/* Dead-center play/pause. */}
        <button
          onClick={togglePlay}
          aria-label={playing ? "Pause" : "Play"}
          className="absolute left-1/2 top-1/2 flex h-14 w-14 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full border border-white/25 bg-black/45 text-white shadow-glow backdrop-blur transition active:scale-90 group-hover:scale-105"
          style={{ boxShadow: `0 0 30px -6px ${accent}` }}
        >
          {loading ? (
            <Loader2 className="h-6 w-6 animate-spin" />
          ) : playing ? (
            <Pause className="h-6 w-6" />
          ) : (
            <Play className="ml-0.5 h-6 w-6" />
          )}
        </button>

        {/* Waveform scrubber along the bottom edge of the stage. */}
        {peaks && (
          <div className="absolute inset-x-3 bottom-2">
            <Waveform
              peaks={peaks}
              progress={progress}
              accent={accent}
              height={compact ? 26 : 34}
              onSeek={isCurrent ? (f) => seekFraction(f) : undefined}
            />
          </div>
        )}
      </div>

      {/* Body. */}
      <div className={cx("flex flex-col gap-2", compact ? "p-3" : "p-4")}>
        {/* Header: artist + kind badge. */}
        <div className="flex items-center justify-between gap-2">
          <div className="flex min-w-0 items-center gap-1.5 text-white/60">
            <Handle username={c.username} emoji={c.alias} size={compact ? 15 : 17} />
          </div>
          <span className="flex shrink-0 items-center gap-1 rounded-full bg-white/8 px-2 py-0.5 text-[10px] font-semibold text-white/70">
            <Music2 className="h-3 w-3" style={{ color: accent }} />
            {KIND_LABEL[c.assetKind ?? "track"]}
          </span>
        </div>

        {/* Title. */}
        <button
          onClick={() => openPost(c.id)}
          className="text-left"
        >
          <p className={cx("font-display font-semibold text-white", compact ? "line-clamp-1 text-sm" : "line-clamp-2 text-base")}>
            {c.text?.trim() || KIND_LABEL[c.assetKind ?? "track"]}
          </p>
        </button>

        {/* Tech strip — quiet mono metadata that says "made by someone serious". */}
        <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 font-mono text-[10px] uppercase tracking-wide text-white/40">
          {dur > 0 && <span>{fmtTime(dur)}</span>}
          {c.bpm ? <><Dot />{c.bpm} BPM</> : null}
          {c.musicalKey ? <><Dot />{c.musicalKey}</> : null}
          {quality ? <><Dot />{quality}</> : null}
        </div>

        {/* Action row. */}
        <div className="mt-1 flex items-center justify-between gap-2">
          <div className="flex items-center gap-1">
            <button
              onClick={(e) => { e.stopPropagation(); recordSwipe(c, "feel"); }}
              aria-label="Vyb"
              className="flex items-center gap-1 rounded-full px-2 py-1 text-xs font-semibold text-feel transition active:scale-90 hover:bg-feel/10"
            >
              <Heart className="h-4 w-4" />
              {formatCount(c.feels)}
            </button>
            <button
              onClick={(e) => { e.stopPropagation(); recordSwipe(c, "wild"); }}
              aria-label="Fail"
              className="flex items-center gap-1 rounded-full px-2 py-1 text-xs font-semibold text-shroud transition active:scale-90 hover:bg-shroud/10"
            >
              <EyeOff className="h-4 w-4" />
              {formatCount(c.wilds)}
            </button>
            <button
              onClick={() => openPost(c.id)}
              aria-label="Comments"
              className="flex items-center gap-1 rounded-full px-2 py-1 text-xs font-semibold text-white/55 transition active:scale-90 hover:bg-white/10"
            >
              <MessageCircle className="h-4 w-4" />
              {commentCount > 0 ? formatCount(commentCount) : ""}
            </button>
          </div>

          {/* Star rating — embedded, revisable, aggregate-only display (§6.3). */}
          <div className="flex items-center gap-0.5" role="group" aria-label="Rate this track">
            {[1, 2, 3, 4, 5].map((n) => {
              const filled = (mine || Math.round(avg)) >= n;
              return (
                <button
                  key={n}
                  onClick={(e) => { e.stopPropagation(); rateTrack(c.id, n); }}
                  aria-label={`Rate ${n} star${n > 1 ? "s" : ""}`}
                  className="p-0.5 transition active:scale-90"
                >
                  <Star
                    className={cx("h-3.5 w-3.5", filled ? "text-amber-300" : "text-white/25")}
                    fill={filled ? "currentColor" : "none"}
                  />
                </button>
              );
            })}
            {count > 0 && (
              <span className="ml-1 font-mono text-[10px] text-white/45">
                {avg.toFixed(1)}
              </span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function Dot() {
  return <span className="text-white/20">·</span>;
}

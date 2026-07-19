import { useMemo } from "react";
import { useState } from "react";
import { Pause, Play, Star, Heart, EyeOff, MessageCircle, Music2, Loader2, Download } from "lucide-react";
import type { Drop, Reaction } from "@/types";
import { Handle } from "@/components/Handle";
import { Waveform } from "@/components/Waveform";
import { TrackVisualizer } from "@/components/TrackVisualizer";
import { ReportButton } from "@/components/ReportButton";
import { usePlayer, playTrack, seekFraction, type PlayerTrack } from "@/lib/audioBus";
import { qualityLabel } from "@/lib/waveform";
import * as api from "@/lib/api";
import { cx, paletteFor, formatCount } from "@/lib/utils";

const LICENSE_LABEL: Record<string, string> = {
  "collab-only": "Collab", "credit-required": "Credit", free: "Free",
};

const KIND_LABEL: Record<string, string> = {
  sample: "Sample", loop: "Loop", oneshot: "One-shot", stem: "Stem",
  acapella: "Acapella", midi: "MIDI", preset: "Preset", project: "Project", track: "Track",
};

function fmtTime(s: number): string {
  if (!Number.isFinite(s) || s <= 0) return "0:00";
  return `${Math.floor(s / 60)}:${Math.floor(s % 60).toString().padStart(2, "0")}`;
}

export function toPlayerTrack(d: Drop): PlayerTrack {
  const accent = paletteFor(d.seed)[0];
  return {
    id: d.id, url: d.audioUrl ?? "",
    title: d.title?.trim() || KIND_LABEL[d.assetKind ?? "track"] || "Untitled",
    artist: d.authorUsername || "Creator",
    waveform: d.waveform, durationSec: d.durationSec,
    quality: qualityLabel(d.audioFormat ?? undefined, d.sampleRate ?? undefined, d.lossless),
    lossless: d.lossless, seed: d.seed, accent,
  };
}

interface TrackCardProps {
  drop: Drop & { myReaction?: Reaction; myRating?: number };
  queue?: Drop[];
  compact?: boolean;
  onReact?: (r: Reaction) => void;
  onRate?: (stars: number) => void;
  onOpenAuthor?: () => void;
  className?: string;
}

/** The feed's atomic unit for an audio drop — identity-forward, sound-first. */
export function TrackCard({ drop: d, queue, compact = false, onReact, onRate, onOpenAuthor, className }: TrackCardProps) {
  const player = usePlayer();
  const accent = useMemo(() => paletteFor(d.seed)[0], [d.seed]);
  const [downloading, setDownloading] = useState(false);

  async function download(e: React.MouseEvent) {
    e.stopPropagation();
    if (!d.assetId || downloading) return;
    setDownloading(true);
    const res = await api.downloadAsset(d.assetId);
    setDownloading(false);
    if (res) {
      const a = document.createElement("a");
      a.href = res.url; a.rel = "noopener";
      a.download = `${(d.title || "drop").replace(/[^\w.-]+/g, "_")}.wav`;
      document.body.appendChild(a); a.click(); a.remove();
      if (res.revoke) setTimeout(() => URL.revokeObjectURL(res.url), 10_000);
    }
  }

  const isCurrent = player.track?.id === d.id;
  const playing = isCurrent && player.playing;
  const loading = isCurrent && player.loading;
  const dur = (isCurrent ? player.duration : 0) || d.durationSec || 0;
  const progress = isCurrent && dur > 0 ? player.currentTime / dur : 0;
  const peaks = d.waveform && d.waveform.length ? d.waveform : undefined;

  const mine = d.myRating ?? 0;
  const avg = d.rating ?? (mine || 0);
  const count = d.ratingCount ?? 0;
  const quality = qualityLabel(d.audioFormat ?? undefined, d.sampleRate ?? undefined, d.lossless);

  function togglePlay(e: React.MouseEvent) {
    e.stopPropagation();
    if (!d.audioUrl) return;
    if (!isCurrent) void api.recordPlay(d.id); // count a distinct-listener play on start
    playTrack(toPlayerTrack(d), (queue ?? []).filter((x) => x.audioUrl).map(toPlayerTrack));
  }

  return (
    <div className={cx("group relative overflow-hidden rounded-3xl border border-white/10 bg-ink-900/60 shadow-card backdrop-blur-sm", className)}>
      <div className={cx("relative w-full", compact ? "h-28" : "h-44")}>
        <div className="absolute inset-0"><TrackVisualizer seed={d.seed} accent={accent} active={playing} /></div>
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-ink-950/70" />
        {d.lossless && (
          <span className="absolute right-3 top-3 rounded-full border border-white/20 bg-black/40 px-2 py-0.5 font-mono text-[9px] font-bold uppercase tracking-wider text-white/90 backdrop-blur">Lossless</span>
        )}
        <button onClick={togglePlay} aria-label={playing ? "Pause" : "Play"}
          className="absolute left-1/2 top-1/2 flex h-14 w-14 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full border border-white/25 bg-black/45 text-white backdrop-blur transition active:scale-90 group-hover:scale-105"
          style={{ boxShadow: `0 0 30px -6px ${accent}` }}>
          {loading ? <Loader2 className="h-6 w-6 animate-spin" /> : playing ? <Pause className="h-6 w-6" /> : <Play className="ml-0.5 h-6 w-6" />}
        </button>
        {peaks && (
          <div className="absolute inset-x-3 bottom-2">
            <Waveform peaks={peaks} progress={progress} accent={accent} height={compact ? 26 : 34}
              onSeek={isCurrent ? (f) => seekFraction(f) : undefined} />
          </div>
        )}
      </div>

      <div className={cx("flex flex-col gap-2", compact ? "p-3" : "p-4")}>
        <div className="flex items-center justify-between gap-2">
          <button onClick={onOpenAuthor} className="flex min-w-0 items-center gap-1.5 text-white/60">
            <Handle username={d.authorUsername} size={compact ? 15 : 17} />
          </button>
          <div className="flex shrink-0 items-center gap-1.5">
            {d.license && (
              <span className="rounded-full bg-white/8 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-white/55">
                {LICENSE_LABEL[d.license] ?? d.license}
              </span>
            )}
            <span className="flex items-center gap-1 rounded-full bg-white/8 px-2 py-0.5 text-[10px] font-semibold text-white/70">
              <Music2 className="h-3 w-3" style={{ color: accent }} />{KIND_LABEL[d.assetKind ?? "track"]}
            </span>
          </div>
        </div>

        <p className={cx("font-display font-semibold text-white", compact ? "line-clamp-1 text-sm" : "line-clamp-2 text-base")}>
          {d.title?.trim() || KIND_LABEL[d.assetKind ?? "track"]}
        </p>

        <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 font-mono text-[10px] uppercase tracking-wide text-white/40">
          {dur > 0 && <span>{fmtTime(dur)}</span>}
          {d.bpm ? <><Dot />{d.bpm} BPM</> : null}
          {d.musicalKey ? <><Dot />{d.musicalKey}</> : null}
          {quality ? <><Dot />{quality}</> : null}
        </div>

        <div className="mt-1 flex items-center justify-between gap-2">
          <div className="flex items-center gap-1">
            <button onClick={() => onReact?.("feel")} aria-label="Vyb"
              className={cx("flex items-center gap-1 rounded-full px-2 py-1 text-xs font-semibold transition active:scale-90 hover:bg-feel/10", d.myReaction === "feel" ? "text-feel" : "text-feel/70")}>
              <Heart className="h-4 w-4" fill={d.myReaction === "feel" ? "currentColor" : "none"} />{formatCount(d.feels)}
            </button>
            <button onClick={() => onReact?.("wild")} aria-label="Fail"
              className={cx("flex items-center gap-1 rounded-full px-2 py-1 text-xs font-semibold transition active:scale-90 hover:bg-shroud/10", d.myReaction === "wild" ? "text-shroud" : "text-white/45")}>
              <EyeOff className="h-4 w-4" />{formatCount(d.wilds)}
            </button>
            <span className="flex items-center gap-1 rounded-full px-2 py-1 text-xs font-semibold text-white/40">
              <MessageCircle className="h-4 w-4" />
            </span>
            {d.assetId && (
              <button onClick={download} aria-label="Download"
                className="flex items-center rounded-full px-2 py-1 text-white/55 transition active:scale-90 hover:bg-white/10 hover:text-white">
                {downloading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
              </button>
            )}
            <ReportButton kind="drop" targetId={d.id} label={d.title?.trim() || d.authorUsername || "drop"} className="flex items-center rounded-full px-2 py-1 hover:bg-wild/10" iconClassName="h-4 w-4" />
          </div>
          <div className="flex items-center gap-0.5" role="group" aria-label="Rate this track">
            {[1, 2, 3, 4, 5].map((n) => {
              const filled = (mine || Math.round(avg)) >= n;
              return (
                <button key={n} onClick={(e) => { e.stopPropagation(); onRate?.(n); }} aria-label={`Rate ${n}`} className="p-0.5 transition active:scale-90">
                  <Star className={cx("h-3.5 w-3.5", filled ? "text-amber-300" : "text-white/25")} fill={filled ? "currentColor" : "none"} />
                </button>
              );
            })}
            {count > 0 && <span className="ml-1 font-mono text-[10px] text-white/45">{avg.toFixed(1)}</span>}
          </div>
        </div>
      </div>
    </div>
  );
}

function Dot() { return <span className="text-white/20">·</span>; }

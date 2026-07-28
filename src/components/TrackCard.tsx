import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Pause, Play, Star, Heart, Loader2, Download, ShieldCheck } from "lucide-react";
import type { Drop, Reaction } from "@/types";
import { Waveform } from "@/components/Waveform";
import { TrackVisualizer } from "@/components/TrackVisualizer";
import { ReportButton } from "@/components/ReportButton";
import { usePlayer, playTrack, seekFraction, type PlayerTrack } from "@/lib/audioBus";
import { qualityLabel } from "@/lib/waveform";
import * as api from "@/lib/api";
import { FLAGS } from "@/lib/flags";
import { trySwarmDownload, swarmSeedOptIn } from "@/lib/swarm";
import { useSession } from "@/store/session";
import { patchWidgetPrefs } from "@/lib/vdock/widgetPrefs";
import { vdockVisual } from "@/lib/vdockVisualManifest";
import { cx, paletteFor, formatCount } from "@/lib/utils";

const LICENSE_LABEL: Record<string, string> = {
  "collab-only": "Collab", "credit-required": "Credit", free: "Free",
};

const KIND_LABEL: Record<string, string> = {
  sample: "Sample", loop: "Loop", oneshot: "One-shot", stem: "Stem",
  acapella: "Acapella", midi: "MIDI", preset: "Preset", project: "Project", track: "Track",
};

const RELEASE_LABEL: Record<string, string> = {
  original: "Original", remix: "Remix", cover: "Cover", edit: "Edit",
  mashup: "Mashup", live: "Live", instrumental: "Instrumental", bootleg: "Bootleg",
};

function fmtTime(s: number): string {
  if (!Number.isFinite(s) || s <= 0) return "0:00";
  return `${Math.floor(s / 60)}:${Math.floor(s % 60).toString().padStart(2, "0")}`;
}

export function toPlayerTrack(d: Drop): PlayerTrack {
  const accent = paletteFor(d.seed)[0];
  const playback = d.playbackCustomization ?? undefined;
  return {
    id: d.id, url: d.audioUrl ?? "",
    authorId: d.authorId,
    artistUsername: d.authorUsername ?? undefined,
    earnEligible: true,
    title: d.title?.trim() || KIND_LABEL[d.assetKind ?? "track"] || "Untitled",
    artist: d.creditedArtist?.trim() || d.authorUsername || "Creator",
    waveform: d.waveform, durationSec: d.durationSec,
    quality: qualityLabel(d.audioFormat ?? undefined, d.sampleRate ?? undefined, d.lossless),
    lossless: d.lossless, seed: d.seed, accent,
    fx: playback?.reactiveStyle ?? d.fx ?? "glow",
    playback,
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
  const navigate = useNavigate();
  const { userId, showToast } = useSession();
  const accent = useMemo(() => paletteFor(d.seed)[0], [d.seed]);
  const [downloading, setDownloading] = useState(false);
  const [prov, setProv] = useState<api.AssetProvenance | null>(null);

  function openArtist() {
    if (onOpenAuthor) {
      onOpenAuthor();
      return;
    }
    if (!d.authorId) return;
    if (userId && d.authorId === userId) navigate("/?tab=you");
    else navigate(`/u/${d.authorId}`);
  }

  useEffect(() => {
    if (!d.assetId || compact) return;
    let on = true;
    api.assetProvenance(d.assetId).then((p) => { if (on) setProv(p); }).catch(() => {});
    return () => { on = false; };
  }, [d.assetId, compact]);

  async function download(e: React.MouseEvent) {
    e.stopPropagation();
    if (!d.assetId || downloading) return;
    setDownloading(true);
    try {
      if (FLAGS.swarm && userId) {
        const swarmUrl = await trySwarmDownload(d.assetId, userId, { seedOptIn: swarmSeedOptIn() });
        if (swarmUrl) {
          const a = document.createElement("a");
          a.href = swarmUrl; a.rel = "noopener";
          a.download = `${(d.title || "drop").replace(/[^\w.-]+/g, "_")}.bin`;
          document.body.appendChild(a); a.click(); a.remove();
          setTimeout(() => URL.revokeObjectURL(swarmUrl), 10_000);
          return;
        }
      }
      const res = await api.downloadAsset(d.assetId);
      if (res) {
        const a = document.createElement("a");
        a.href = res.url; a.rel = "noopener";
        a.download = `${(d.title || "drop").replace(/[^\w.-]+/g, "_")}.wav`;
        document.body.appendChild(a); a.click(); a.remove();
        if (res.revoke) setTimeout(() => URL.revokeObjectURL(res.url), 10_000);
        patchWidgetPrefs({ watermarkAt: Date.now() });
        showToast(res.watermarked
          ? "Downloaded — watermarked for attribution"
          : "Downloaded — license grant recorded");
        void api.assetProvenance(d.assetId).then(setProv).catch(() => {});
      }
    } finally {
      setDownloading(false);
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
  const catalogVisual = vdockVisual(d.playbackCustomization?.vdockVisualId);
  const stageBackdrop =
    d.playbackCustomization?.backdropUrl
    ?? catalogVisual?.loopMp4
    ?? null;

  function togglePlay(e: React.MouseEvent) {
    e.stopPropagation();
    if (!d.audioUrl || !/^(https?:|blob:|data:)/i.test(d.audioUrl)) {
      showToast("This drop has no playable audio URL yet");
      return;
    }
    if (!isCurrent) void api.recordPlay(d.id);
    playTrack(toPlayerTrack(d), (queue ?? []).filter((x) => x.audioUrl && /^(https?:|blob:|data:)/i.test(x.audioUrl)).map(toPlayerTrack));
  }

  return (
    <div
      data-dark-stage
      className={cx("group relative overflow-hidden rounded-2xl bg-ink-900/85 shadow-card backdrop-blur-sm", className)}
    >
      <div className={cx("relative w-full", compact ? "h-24" : "h-36")}>
        <div className="absolute inset-0">
          <TrackVisualizer
            seed={d.seed}
            accent={accent}
            active={playing}
            backdropUrl={stageBackdrop}
            backdropFit={d.playbackCustomization?.backdropFit}
            backdropDim={d.playbackCustomization?.backdropDim}
          />
        </div>
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-ink-950/70" />
        {d.lossless && (
          <span className="absolute right-2.5 top-2.5 rounded-full border border-white/20 bg-black/40 px-2 py-0.5 font-mono text-[9px] font-bold uppercase tracking-wider text-white/90 backdrop-blur">Lossless</span>
        )}
        {(d.releaseType || d.assetKind) && (
          <span className="absolute left-2.5 top-2.5 rounded-full bg-black/45 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-white/85 backdrop-blur">
            {d.releaseType ? (RELEASE_LABEL[d.releaseType] ?? d.releaseType) : (KIND_LABEL[d.assetKind ?? "track"] ?? "Track")}
          </span>
        )}
        <button onClick={togglePlay} aria-label={playing ? "Pause" : "Play"}
          className={cx(
            "absolute left-1/2 top-1/2 flex -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full border border-white/25 bg-black/45 text-white backdrop-blur transition active:scale-90 group-hover:scale-105",
            compact ? "h-11 w-11" : "h-12 w-12",
          )}
          style={{ boxShadow: `0 0 30px -6px ${accent}` }}>
          {loading ? <Loader2 className="h-5 w-5 animate-spin" /> : playing ? <Pause className="h-5 w-5" /> : <Play className="ml-0.5 h-5 w-5" />}
        </button>
        {peaks && (
          <div className="absolute inset-x-2.5 bottom-1.5">
            <Waveform peaks={peaks} progress={progress} accent={accent} height={compact ? 22 : 28}
              onSeek={isCurrent ? (f) => seekFraction(f) : undefined} />
          </div>
        )}
      </div>

      <div className={cx("flex flex-col", compact ? "gap-1 p-2.5" : "gap-1.5 p-3")}>
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0 flex-1">
            <p className={cx("truncate font-display font-semibold text-white", compact ? "text-sm" : "text-base")}>
              {d.title?.trim() || KIND_LABEL[d.assetKind ?? "track"] || "Untitled"}
            </p>
            <p className={cx("truncate text-white/55", compact ? "text-[11px]" : "text-[12px]")}>
              {d.album?.trim() || "Single"}
            </p>
            <button
              type="button"
              onClick={openArtist}
              className="mt-0.5 block max-w-full truncate text-left text-[11px] text-white/40 transition hover:text-cyan-200/90"
            >
              {d.authorUsername ? `@${d.authorUsername}` : (d.creditedArtist?.trim() || "Uploader")}
            </button>
          </div>
          <div className="flex shrink-0 flex-col items-end gap-1">
            {d.license && (
              <span className="rounded-full bg-white/8 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-white/55">
                {LICENSE_LABEL[d.license] ?? d.license}
              </span>
            )}
            {prov && (prov.firstSeen || prov.downloads > 0) && (
              <span
                className="inline-flex max-w-[9rem] items-center gap-1 truncate rounded-full bg-feel/10 px-2 py-0.5 text-[10px] font-medium text-feel/90"
                title={prov.sha256 ? `sha256 ${prov.sha256.slice(0, 12)}…` : "Provenance ledger"}
              >
                <ShieldCheck className="h-3 w-3 shrink-0" />
                {prov.firstSeen
                  ? `On VYBZ ${new Date(prov.firstSeen).toLocaleDateString()}`
                  : `${prov.downloads} grant${prov.downloads === 1 ? "" : "s"}`}
              </span>
            )}
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 font-mono text-[10px] uppercase tracking-wide text-white/40">
          {dur > 0 && <span>{fmtTime(dur)}</span>}
          {d.bpm ? <><Dot />{d.bpm} BPM</> : null}
          {d.musicalKey ? <><Dot />{d.musicalKey}</> : null}
          {quality ? <><Dot />{quality}</> : null}
        </div>

        <div className="mt-1 flex items-center justify-between gap-2">
          <div className="flex items-center gap-0.5">
            <button type="button" onClick={() => onReact?.("feel")} aria-label="Vyb"
              className={cx("flex items-center gap-1 rounded-full px-2 py-1 text-xs font-semibold transition active:scale-90 hover:bg-feel/10", d.myReaction === "feel" ? "text-feel" : "text-white/40")}>
              <Heart className="h-4 w-4" fill={d.myReaction === "feel" ? "currentColor" : "none"} />
              {d.feels > 0 ? formatCount(d.feels) : null}
            </button>
            {d.assetId && (
              <button type="button" onClick={download} aria-label="Download"
                className="flex items-center rounded-full px-2 py-1 text-white/40 transition active:scale-90 hover:bg-white/10 hover:text-white">
                {downloading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
              </button>
            )}
            <ReportButton kind="drop" targetId={d.id} label={d.title?.trim() || d.authorUsername || "drop"} className="flex items-center rounded-full px-2 py-1 hover:bg-wild/10" iconClassName="h-4 w-4" />
          </div>
          <div className="flex items-center gap-0.5 opacity-70" role="group" aria-label="Rate this track">
            {[1, 2, 3, 4, 5].map((n) => {
              const filled = (mine || Math.round(avg)) >= n;
              return (
                <button type="button" key={n} onClick={(e) => { e.stopPropagation(); onRate?.(n); }} aria-label={`Rate ${n}`} className="p-0.5 transition active:scale-90">
                  <Star className={cx("h-3.5 w-3.5", filled ? "text-amber-300" : "text-white/20")} fill={filled ? "currentColor" : "none"} />
                </button>
              );
            })}
            {count > 0 && <span className="ml-1 font-mono text-[10px] text-white/35">{avg.toFixed(1)}</span>}
          </div>
        </div>
      </div>
    </div>
  );
}

function Dot() { return <span className="text-white/20">·</span>; }

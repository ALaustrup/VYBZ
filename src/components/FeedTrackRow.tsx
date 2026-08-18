import { useMemo } from "react";
import { Heart, Loader2, Pause, Play } from "lucide-react";
import type { Drop, Reaction } from "@/types";
import { Waveform } from "@/components/Waveform";
import { playTrack, seekFraction, usePlayer } from "@/lib/audioBus";
import { toPlayerTrack } from "@/lib/toPlayerTrack";
import * as api from "@/lib/api";
import { useSession } from "@/store/session";
import { cx, formatCount, timeAgo } from "@/lib/utils";

function fmtTime(s: number): string {
  if (!Number.isFinite(s) || s <= 0) return "";
  return `${Math.floor(s / 60)}:${Math.floor(s % 60).toString().padStart(2, "0")}`;
}

/**
 * SoundCloud-style stream row — play, identity, waveform. No extra chrome.
 */
export function FeedTrackRow({
  drop: d,
  queue,
  onReact,
  onOpenAuthor,
}: {
  drop: Drop & { myReaction?: Reaction };
  queue?: Drop[];
  onReact?: (r: Reaction) => void;
  onOpenAuthor?: () => void;
}) {
  const player = usePlayer();
  const { showToast } = useSession();
  const accent = useMemo(() => "#00C2FF", []);
  const isCurrent = player.track?.id === d.id;
  const playing = isCurrent && player.playing;
  const loading = isCurrent && player.loading;
  const dur = (isCurrent ? player.duration : 0) || d.durationSec || 0;
  const progress = isCurrent && dur > 0 ? player.currentTime / dur : 0;
  const peaks = d.waveform && d.waveform.length ? d.waveform : undefined;
  const name = d.creditedArtist?.trim() || d.authorUsername || "Uploader";

  function togglePlay() {
    if (!d.audioUrl || !/^(https?:|blob:|data:)/i.test(d.audioUrl)) {
      showToast("This drop has no playable audio yet");
      return;
    }
    if (!isCurrent) void api.recordPlay(d.id);
    playTrack(
      toPlayerTrack(d),
      (queue ?? [])
        .filter((x) => x.audioUrl && /^(https?:|blob:|data:)/i.test(x.audioUrl))
        .map(toPlayerTrack),
    );
  }

  return (
    <article
      data-testid="feed-track-row"
      className="group flex gap-3 rounded-2xl border border-white/[0.06] bg-white/[0.03] px-3 py-3 transition hover:border-white/12 hover:bg-white/[0.045] sm:gap-4 sm:px-4"
    >
      <button
        type="button"
        onClick={togglePlay}
        aria-label={playing ? `Pause ${d.title || "track"}` : `Play ${d.title || "track"}`}
        className="mt-0.5 flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-cyan-400/25 to-white/[0.06] text-white ring-1 ring-white/12 transition active:scale-95"
      >
        {loading ? (
          <Loader2 className="h-5 w-5 animate-spin" />
        ) : playing ? (
          <Pause className="h-5 w-5" />
        ) : (
          <Play className="ml-0.5 h-5 w-5" />
        )}
      </button>

      <div className="min-w-0 flex-1">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="truncate font-display text-[15px] font-semibold text-white sm:text-base">
              {d.title?.trim() || "Untitled"}
            </p>
            <button
              type="button"
              onClick={onOpenAuthor}
              className="mt-0.5 block truncate text-left text-[12px] text-white/50 transition hover:text-cyan-200"
            >
              {d.authorUsername ? `@${d.authorUsername}` : name}
              {d.createdAt ? ` · ${timeAgo(d.createdAt)}` : ""}
            </button>
          </div>
          <div className="flex shrink-0 items-center gap-2 pt-0.5">
            {dur > 0 ? (
              <span className="font-mono text-[11px] tabular-nums text-white/35">{fmtTime(dur)}</span>
            ) : null}
            <button
              type="button"
              onClick={() => onReact?.("feel")}
              aria-label="Like"
              className={cx(
                "inline-flex items-center gap-1 rounded-full px-1.5 py-1 text-[12px] transition",
                d.myReaction === "feel" ? "text-feel" : "text-white/35 hover:text-white/70",
              )}
            >
              <Heart className="h-3.5 w-3.5" fill={d.myReaction === "feel" ? "currentColor" : "none"} />
              {d.feels > 0 ? formatCount(d.feels) : null}
            </button>
          </div>
        </div>
        <div className="mt-2">
          {peaks ? (
            <Waveform
              peaks={peaks}
              progress={progress}
              accent={accent}
              height={36}
              onSeek={isCurrent ? (f) => seekFraction(f) : undefined}
            />
          ) : (
            <div className="h-2 overflow-hidden rounded-full bg-white/[0.06]">
              <div
                className="h-full rounded-full bg-cyan-300/70"
                style={{ width: `${Math.round(progress * 100)}%` }}
              />
            </div>
          )}
        </div>
      </div>
    </article>
  );
}

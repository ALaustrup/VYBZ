import { Loader2, Pause, Play } from "lucide-react";
import type { Drop } from "@/types";
import { isPlayableMediaUrl, playTrack, toggle, usePlayer } from "@/lib/audioBus";
import { toPlayerTrack } from "@/lib/toPlayerTrack";
import { cx, paletteFor, timeAgo } from "@/lib/utils";

function fmtDuration(s: number): string {
  if (!Number.isFinite(s) || s <= 0) return "";
  const m = Math.floor(s / 60);
  const sec = Math.floor(s % 60);
  if (m >= 60) {
    const h = Math.floor(m / 60);
    return `${h} hr ${m % 60} min`;
  }
  return `${m}:${sec.toString().padStart(2, "0")}`;
}

export function dropArtUrl(drop: Drop): string | null {
  return drop.playbackCustomization?.backdropUrl ?? null;
}

/**
 * Spotify podcast-episode card: square cover, play on hover, title, date, duration.
 */
export function EpisodeCard({
  drop,
  queue,
  onOpenAuthor,
}: {
  drop: Drop;
  queue?: Drop[];
  onOpenAuthor?: () => void;
}) {
  const player = usePlayer();
  const isCurrent = player.track?.id === drop.id;
  const playing = isCurrent && player.playing;
  const loading = isCurrent && player.loading;
  const playable = isPlayableMediaUrl(drop.audioUrl);
  const cover = dropArtUrl(drop);
  const [c0, c1] = paletteFor(drop.seed ?? 1);
  const monogram = (drop.title || drop.creditedArtist || "A").slice(0, 1).toUpperCase();
  const credit =
    drop.creditedArtist?.trim() || drop.authorUsername?.trim() || "Uploader";
  const dur = (isCurrent ? player.duration : 0) || drop.durationSec || 0;
  const durationLabel = fmtDuration(dur);

  function onPlay() {
    if (!playable) return;
    if (isCurrent) toggle();
    else {
      playTrack(
        toPlayerTrack(drop),
        (queue ?? [])
          .filter((x) => isPlayableMediaUrl(x.audioUrl))
          .map(toPlayerTrack),
      );
    }
  }

  return (
    <article
      data-testid="home-episode-card"
      className="group w-[9.75rem] shrink-0 snap-start sm:w-[11.5rem]"
    >
      <button
        type="button"
        disabled={!playable}
        onClick={onPlay}
        aria-label={playing ? `Pause ${drop.title || "track"}` : `Play ${drop.title || "track"}`}
        className="relative aspect-square w-full overflow-hidden rounded-xl bg-ink-900 shadow-[0_16px_40px_-24px_rgba(0,0,0,0.85)] ring-1 ring-white/8 transition duration-200 hover:-translate-y-0.5 hover:ring-white/16 disabled:opacity-45 motion-reduce:transition-none motion-reduce:hover:translate-y-0"
      >
        {cover ? (
          <img src={cover} alt="" className="absolute inset-0 h-full w-full object-cover" />
        ) : (
          <div
            className="absolute inset-0"
            style={{ background: `linear-gradient(145deg, ${c0}88 0%, #05070c 58%, ${c1}55 100%)` }}
            aria-hidden
          >
            <span className="absolute inset-0 flex items-center justify-center font-display text-5xl font-semibold text-white/30">
              {monogram}
            </span>
          </div>
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-black/55 via-transparent to-transparent opacity-80" />
        <span
          className={cx(
            "absolute bottom-2.5 right-2.5 grid h-11 w-11 place-items-center rounded-full bg-[rgb(var(--neon-mint))] text-black shadow-[0_10px_24px_-10px_rgba(0,0,0,0.8)] transition duration-200",
            playing
              ? "scale-100 opacity-100"
              : "scale-90 opacity-0 group-hover:scale-100 group-hover:opacity-100 motion-reduce:opacity-100",
          )}
        >
          {loading ? (
            <Loader2 className="h-5 w-5 animate-spin" />
          ) : playing ? (
            <Pause className="h-5 w-5" />
          ) : (
            <Play className="h-5 w-5 translate-x-px" />
          )}
        </span>
      </button>
      <p className="mt-2.5 truncate font-display text-[13px] font-semibold leading-snug text-white sm:text-sm">
        {drop.title?.trim() || "Untitled"}
      </p>
      <button
        type="button"
        onClick={onOpenAuthor}
        className="mt-0.5 block w-full truncate text-left text-[11px] text-white/45 transition hover:text-white/75"
      >
        {credit}
        {drop.createdAt ? ` · ${timeAgo(drop.createdAt)}` : ""}
        {durationLabel ? ` · ${durationLabel}` : ""}
      </button>
    </article>
  );
}

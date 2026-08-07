import { useCallback, useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Loader2, Pause, Play, Search, Compass } from "lucide-react";
import * as api from "@/lib/api";
import { EmptyState } from "@/components/EmptyState";
import { TrackVisualizer } from "@/components/TrackVisualizer";
import { useRegisterAppBar } from "@/lib/appBarBridge";
import { playTrack, usePlayer } from "@/lib/audioBus";
import { toPlayerTrack } from "@/lib/toPlayerTrack";
import { useReduceFx } from "@/lib/display";
import { useSession } from "@/store/session";
import { paletteFor, cx } from "@/lib/utils";
import type { DiscoveryDrop } from "@/lib/api";

/**
 * Dedicated preview element — does not steal AudioBus main queue.
 * Pauses briefly when committing a track to the dock player.
 */
function useHoverPreview() {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [previewId, setPreviewId] = useState<string | null>(null);
  const reduce = useReduceFx();

  useEffect(() => {
    const el = new Audio();
    el.preload = "none";
    el.volume = 0.55;
    audioRef.current = el;
    return () => {
      el.pause();
      el.removeAttribute("src");
      audioRef.current = null;
    };
  }, []);

  const stop = useCallback(() => {
    const el = audioRef.current;
    if (el) {
      el.pause();
      el.removeAttribute("src");
    }
    setPreviewId(null);
  }, []);

  const start = useCallback(
    (id: string, url: string | null | undefined) => {
      if (reduce || !url) return;
      const el = audioRef.current;
      if (!el) return;
      if (previewId === id) return;
      el.pause();
      el.src = url;
      el.currentTime = 0;
      void el.play().catch(() => undefined);
      setPreviewId(id);
    },
    [previewId, reduce],
  );

  return { previewId, start, stop };
}

function DiscoverCard({
  drop,
  previewing,
  onEnter,
  onLeave,
  onCommit,
}: {
  drop: DiscoveryDrop;
  previewing: boolean;
  onEnter: () => void;
  onLeave: () => void;
  onCommit: () => void;
}) {
  const navigate = useNavigate();
  const accent = paletteFor(drop.seed)[0];
  const cover = drop.playbackCustomization?.backdropUrl;

  return (
    <article
      className={cx(
        "forge-glass group relative overflow-hidden !rounded-2xl p-0 transition duration-200",
        "hover:-translate-y-0.5 hover:border-white/20",
        "motion-reduce:transition-none motion-reduce:hover:translate-y-0",
      )}
      onMouseEnter={onEnter}
      onMouseLeave={onLeave}
      onFocus={onEnter}
      onBlur={onLeave}
    >
      <span className="forge-glass-edge pointer-events-none" aria-hidden />
      <button
        type="button"
        onClick={onCommit}
        className="relative block aspect-[4/5] w-full overflow-hidden text-left"
        aria-label={`Play ${drop.title}`}
      >
        {cover ? (
          <img src={cover} alt="" className="absolute inset-0 h-full w-full object-cover opacity-75" />
        ) : (
          <div
            className="absolute inset-0"
            style={{ background: `linear-gradient(160deg, ${accent}44, #04060c 70%)` }}
          />
        )}
        <div className="absolute inset-0 opacity-80">
          <TrackVisualizer
            seed={drop.seed}
            accent={accent}
            active={previewing}
            backdropUrl={cover ?? undefined}
            className="h-full w-full"
          />
        </div>
        <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/25 to-transparent" />
        <div className="absolute bottom-0 left-0 right-0 p-3.5">
          <p className="truncate font-display text-[15px] font-semibold text-white">{drop.title}</p>
          <button
            type="button"
            className="mt-0.5 truncate text-[12px] text-white/55 hover:text-cyan-200"
            onClick={(e) => {
              e.stopPropagation();
              if (drop.authorUsername) navigate(`/u/${drop.authorUsername}`);
            }}
          >
            {drop.creditedArtist || drop.authorUsername || "Artist"}
          </button>
        </div>
        <span
          className={cx(
            "absolute right-3 top-3 flex h-9 w-9 items-center justify-center rounded-full border border-white/15 bg-black/45 text-white backdrop-blur-md transition",
            previewing ? "opacity-100" : "opacity-0 group-hover:opacity-100",
          )}
          aria-hidden
        >
          {previewing ? <Pause className="h-4 w-4" fill="currentColor" /> : <Play className="ml-0.5 h-4 w-4" fill="currentColor" />}
        </span>
      </button>
    </article>
  );
}

/** Music-first Discover — glass cards with hover preview playback. */
export function DiscoverPage() {
  const { showToast } = useSession();
  const player = usePlayer();
  const [query, setQuery] = useState("");
  const [drops, setDrops] = useState<DiscoveryDrop[]>([]);
  const [loading, setLoading] = useState(true);
  const { previewId, start, stop } = useHoverPreview();

  useRegisterAppBar({
    title: "Discover",
    subtitle: "Fresh work from the network",
  }, []);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    const seed = Math.floor(Date.now() / 60_000) % 10_000;
    api.listDiscovery(seed, 48).then((list) => {
      if (!cancelled) {
        setDrops(list);
        setLoading(false);
      }
    });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => () => stop(), [stop]);

  const filtered = query.trim()
    ? drops.filter((d) => {
        const q = query.toLowerCase();
        return (
          d.title?.toLowerCase().includes(q) ||
          d.creditedArtist?.toLowerCase().includes(q) ||
          d.authorUsername?.toLowerCase().includes(q) ||
          d.album?.toLowerCase().includes(q)
        );
      })
    : drops;

  function commit(d: DiscoveryDrop) {
    stop();
    if (!d.audioUrl) {
      showToast("No playable audio on this drop");
      return;
    }
    playTrack(
      toPlayerTrack(d),
      filtered.map(toPlayerTrack),
    );
  }

  return (
    <div className="flex h-full flex-col gap-4 px-1 pb-4 pt-2">
      <label className="forge-field max-w-md">
        <Search className="forge-field-icon h-4 w-4" />
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Filter by title, artist, album…"
          aria-label="Filter discoveries"
        />
      </label>

      {loading ? (
        <div className="flex flex-1 items-center justify-center py-20">
          <Loader2 className="h-6 w-6 animate-spin text-white/40" />
        </div>
      ) : filtered.length === 0 ? (
        <EmptyState
          icon={Compass}
          title="Nothing to discover yet"
          body="When creators publish drops, they appear here as glass cards you can preview on hover."
        />
      ) : (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
          {filtered.map((d) => (
            <DiscoverCard
              key={d.id}
              drop={d}
              previewing={previewId === d.id && !(player.playing && player.track?.id === d.id)}
              onEnter={() => {
                if (player.playing && player.track?.id === d.id) return;
                start(d.id, d.audioUrl);
              }}
              onLeave={stop}
              onCommit={() => commit(d)}
            />
          ))}
        </div>
      )}
    </div>
  );
}

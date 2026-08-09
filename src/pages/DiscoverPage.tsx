import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { LayoutGrid, List, Loader2, Pause, Play, Search, Compass } from "lucide-react";
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

type ViewMode = "grid" | "list";
/** OR-031 — release-centered discovery filters (craft only). */
type AudioFilter = "all" | "audio" | "recent" | "releases" | "emerging";

function isReleaseCentered(d: DiscoveryDrop): boolean {
  return Boolean(d.releaseType || (d.album && d.album.trim()) || d.assetKind === "track");
}

const VIEW_KEY = "vybz.discover.view";

function readView(): ViewMode {
  try {
    const v = localStorage.getItem(VIEW_KEY);
    if (v === "list" || v === "grid") return v;
  } catch { /* ignore */ }
  return "grid";
}

/**
 * Dedicated preview element — does not steal AudioBus main queue.
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
          <TrackVisualizer
            seed={drop.seed ?? 1}
            accent={accent}
            active={previewing}
            className="absolute inset-0"
          />
        )}
        <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/85 via-black/40 to-transparent p-3 pt-10">
          <p className="truncate text-[13px] font-semibold text-white">{drop.title || "Untitled"}</p>
          <button
            type="button"
            className="truncate text-[11px] text-white/55 hover:text-white/80"
            onClick={(e) => {
              e.stopPropagation();
              if (drop.authorId) navigate(`/u/${drop.authorId}`);
            }}
          >
            {drop.creditedArtist || drop.authorUsername || "Artist"}
          </button>
          {(drop.releaseType || drop.album) && (
            <p className="mt-0.5 truncate text-[10px] uppercase tracking-wide text-white/40">
              {[drop.releaseType, drop.album].filter(Boolean).join(" · ")}
            </p>
          )}
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

function DiscoverListRow({
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
    <li
      className="forge-card flex items-center gap-3 !p-2.5"
      onMouseEnter={onEnter}
      onMouseLeave={onLeave}
    >
      <button
        type="button"
        onClick={onCommit}
        className="relative h-14 w-14 shrink-0 overflow-hidden rounded-xl border border-white/10"
        aria-label={`Play ${drop.title}`}
        style={{ background: `radial-gradient(circle at 30% 30%, ${accent}66, transparent 70%)` }}
      >
        {cover ? <img src={cover} alt="" className="h-full w-full object-cover" /> : null}
        <span className="absolute inset-0 flex items-center justify-center bg-black/25 text-white">
          {previewing ? <Pause className="h-4 w-4" fill="currentColor" /> : <Play className="ml-0.5 h-4 w-4" fill="currentColor" />}
        </span>
      </button>
      <div className="min-w-0 flex-1">
        <p className="truncate text-[14px] font-medium text-white">{drop.title || "Untitled"}</p>
        <button
          type="button"
          className="truncate text-[12px] text-white/45 hover:text-white/70"
          onClick={() => drop.authorId && navigate(`/u/${drop.authorId}`)}
        >
          {drop.creditedArtist || drop.authorUsername || "Artist"}
          {drop.album ? ` · ${drop.album}` : ""}
        </button>
      </div>
      <span className="shrink-0 text-[10px] uppercase tracking-wider text-white/30">
        {drop.audioUrl ? "Audio" : "No audio"}
      </span>
    </li>
  );
}

/** Public live feed of uploaded songs and samples. */
export function DiscoverPage() {
  const { showToast } = useSession();
  const player = usePlayer();
  const [query, setQuery] = useState("");
  const [audioFilter, setAudioFilter] = useState<AudioFilter>("all");
  const [view, setView] = useState<ViewMode>(readView);
  const [drops, setDrops] = useState<DiscoveryDrop[]>([]);
  const [loading, setLoading] = useState(true);
  const { previewId, start, stop } = useHoverPreview();

  useRegisterAppBar({
    title: "Discover",
    subtitle: "Release-centered",
  }, []);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    const seed = Math.floor(Date.now() / 60_000) % 10_000;
    api.listDiscovery(seed, 64).then((list) => {
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

  function setViewMode(next: ViewMode) {
    setView(next);
    try { localStorage.setItem(VIEW_KEY, next); } catch { /* ignore */ }
  }

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    const weekAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
    let list = drops.filter((d) => {
      if (audioFilter === "audio" && !d.audioUrl) return false;
      if (audioFilter === "recent" && (d.createdAt ?? 0) < weekAgo) return false;
      if (audioFilter === "releases" && !isReleaseCentered(d)) return false;
      if (audioFilter === "emerging" && (!d.audioUrl || !isReleaseCentered(d))) return false;
      if (!q) return true;
      return (
        d.title?.toLowerCase().includes(q) ||
        d.creditedArtist?.toLowerCase().includes(q) ||
        d.authorUsername?.toLowerCase().includes(q) ||
        d.album?.toLowerCase().includes(q)
      );
    });
    if (audioFilter === "emerging") {
      // Lesser-known first: low measured plays, then newer.
      list = [...list].sort((a, b) => {
        const playDelta = (a.plays ?? 0) - (b.plays ?? 0);
        if (playDelta !== 0) return playDelta;
        return (b.createdAt ?? 0) - (a.createdAt ?? 0);
      });
    }
    return list;
  }, [drops, query, audioFilter]);

  function commit(d: DiscoveryDrop) {
    stop();
    if (!d.audioUrl) {
      showToast("No playable audio on this upload");
      return;
    }
    playTrack(
      toPlayerTrack(d),
      filtered.map(toPlayerTrack),
    );
  }

  return (
    <div className="flex h-full flex-col gap-3 px-1 pb-4 pt-2">
      <div className="flex flex-wrap items-center gap-2">
        <label className="forge-field min-w-[12rem] max-w-md flex-1">
          <Search className="forge-field-icon h-4 w-4" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search songs and samples…"
            aria-label="Search discover feed"
          />
        </label>
        <div className="flex flex-wrap items-center gap-1 rounded-xl border border-white/10 bg-white/[0.03] p-1" role="group" aria-label="Filters" data-testid="discover-filters">
          {([
            ["all", "All"],
            ["audio", "Has audio"],
            ["releases", "Releases"],
            ["emerging", "Emerging"],
            ["recent", "7 days"],
          ] as const).map(([id, label]) => (
            <button
              key={id}
              type="button"
              onClick={() => setAudioFilter(id)}
              aria-pressed={audioFilter === id}
              data-testid={`discover-filter-${id}`}
              className={cx(
                "rounded-lg px-2.5 py-1.5 text-[11px] font-semibold transition",
                audioFilter === id ? "bg-white/12 text-white" : "text-white/45 hover:text-white/75",
              )}
            >
              {label}
            </button>
          ))}
        </div>
        <div className="flex items-center gap-1 rounded-xl border border-white/10 bg-white/[0.03] p-1" role="group" aria-label="View mode">
          <button
            type="button"
            onClick={() => setViewMode("grid")}
            aria-pressed={view === "grid"}
            aria-label="Grid view"
            className={cx("rounded-lg p-2", view === "grid" ? "bg-white/12 text-white" : "text-white/45")}
          >
            <LayoutGrid className="h-4 w-4" />
          </button>
          <button
            type="button"
            onClick={() => setViewMode("list")}
            aria-pressed={view === "list"}
            aria-label="List view"
            className={cx("rounded-lg p-2", view === "list" ? "bg-white/12 text-white" : "text-white/45")}
          >
            <List className="h-4 w-4" />
          </button>
        </div>
      </div>

      <p className="text-[12px] text-white/40" data-testid="discover-or031-blurb">
        Release-centered public catalog — find tracks and emerging artists by craft.
        {!loading ? ` · ${filtered.length} shown` : ""}
      </p>

      {loading ? (
        <div className="flex flex-1 items-center justify-center py-20">
          <Loader2 className="h-6 w-6 animate-spin text-white/40" />
        </div>
      ) : filtered.length === 0 ? (
        <EmptyState
          icon={Compass}
          title="Nothing matches"
          body="Try a broader search, or clear filters. New public uploads appear here as creators publish."
        />
      ) : view === "grid" ? (
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
      ) : (
        <ul className="flex flex-col gap-2" role="list">
          {filtered.map((d) => (
            <DiscoverListRow
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
        </ul>
      )}
    </div>
  );
}

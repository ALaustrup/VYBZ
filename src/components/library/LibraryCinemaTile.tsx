import { useEffect, useRef, useState } from "react";
import { Check, FileText, Maximize2, MoreVertical, Pause, Play } from "lucide-react";
import { TrackVisualizer } from "@/components/TrackVisualizer";
import { TrackActionMenu } from "@/components/TrackActionMenu";
import type { MenuAnchor } from "@/components/menu/ContextMenu";
import { pause, playTrack, getPlaybackProgress, seek, seekFraction, usePlayerShell } from "@/lib/audioBus";
import { toPlayerTrack } from "@/lib/toPlayerTrack";
import {
  cinemaPlayRestartsFromStart,
  cinemaProgressFraction,
  cinemaProgressSeekFraction,
  cinemaProgressShouldShow,
  cinemaVideoShouldPreview,
  libraryStillUrl,
} from "@/features/library/libraryPreview";
import { classifyDrop, isPlayableAudioWork } from "@/features/profile/workKind";
import { useReduceFx } from "@/lib/display";
import { useInView } from "@/components/library/useInView";
import { paletteFor, cx } from "@/lib/utils";
import { useSession } from "@/store/session";
import * as api from "@/lib/api";
import type { Drop } from "@/types";

const KIND_LABEL: Record<string, string> = {
  audio: "Audio",
  image: "Image",
  video: "Video",
  file: "File",
};

export function LibraryCinemaTile({
  drop: d,
  queue,
  variant,
  groupLabel,
  selected,
  onSelect,
  isFeatured,
  onStage,
  snapshotDropIds,
  onChanged,
  onVisual,
  visualOpen,
}: {
  drop: Drop;
  queue: Drop[];
  variant: "cinema" | "grid";
  groupLabel?: string | null;
  selected: boolean;
  onSelect: (e: React.MouseEvent) => void;
  isFeatured: boolean;
  onStage: boolean;
  snapshotDropIds: string[];
  onChanged: (c: { kind: "deleted" | "renamed" | "featured" | "placed"; dropId: string; title?: string }) => void;
  onVisual: () => void;
  visualOpen: boolean;
}) {
  const player = usePlayerShell();
  const reduce = useReduceFx();
  const { showToast } = useSession();
  const rootRef = useRef<HTMLElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const moreRef = useRef<HTMLButtonElement>(null);
  const progressRef = useRef<HTMLSpanElement>(null);
  const [menuAnchor, setMenuAnchor] = useState<MenuAnchor | null>(null);
  const inView = useInView(rootRef, variant === "cinema" ? 0.2 : 0.35);

  const kind = classifyDrop(d);
  const playable = isPlayableAudioWork(d);
  const isCurrent = player.track?.id === d.id;
  const playing = isCurrent && player.playing;
  const cinema = variant === "cinema";
  const showProgress = cinemaProgressShouldShow({ cinema, isCurrent });
  const accent = paletteFor(d.seed)[0];
  const still = libraryStillUrl(d);
  const [c1, c2] = paletteFor(d.seed);
  const previewVideo = cinemaVideoShouldPreview({
    kind,
    inView,
    reduceFx: reduce,
    audioPlaying: player.playing,
    visualOpen,
  });
  const showStage = kind === "audio" && (inView || playing);
  const showVideo = kind === "video" && !!d.audioUrl && inView && !visualOpen;

  useEffect(() => {
    const v = videoRef.current;
    if (!v) return;
    if (previewVideo) {
      v.muted = true;
      v.playsInline = true;
      void v.play().catch(() => {});
    } else if (!visualOpen) {
      v.pause();
    }
  }, [previewVideo, visualOpen]);

  useEffect(() => {
    if (!showProgress) return;
    const known = d.durationSec || 0;
    let raf = 0;
    let running = true;
    const tick = () => {
      if (!running) return;
      const el = progressRef.current;
      if (el) {
        const clock = getPlaybackProgress();
        const duration = clock.duration || known;
        el.style.transform = `scaleX(${cinemaProgressFraction({ currentTime: clock.currentTime, duration })})`;
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => {
      running = false;
      cancelAnimationFrame(raf);
    };
  }, [showProgress, d.durationSec]);

  function toggleMedia(e?: React.MouseEvent) {
    e?.stopPropagation();
    if (kind === "video" && d.audioUrl) {
      pause();
      const v = videoRef.current;
      if (!v) {
        onVisual();
        return;
      }
      if (v.paused || v.muted) {
        v.muted = false;
        void v.play().catch(() => onVisual());
      } else {
        v.pause();
      }
      return;
    }
    if (playable) {
      const clock = getPlaybackProgress();
      const fraction = cinemaProgressFraction({
        currentTime: clock.currentTime,
        duration: clock.duration || d.durationSec || 0,
      });
      if (cinemaPlayRestartsFromStart({ isCurrent, playing, fraction })) seek(0);
      if (!isCurrent) void api.recordPlay(d.id);
      playTrack(
        toPlayerTrack(d),
        queue.filter((x) => isPlayableAudioWork(x)).map(toPlayerTrack),
      );
      return;
    }
    if (kind === "audio") {
      showToast("This drop has no playable audio URL yet");
      return;
    }
    onVisual();
  }

  function scrubProgress(e: React.PointerEvent<HTMLDivElement>) {
    e.stopPropagation();
    e.preventDefault();
    const rect = e.currentTarget.getBoundingClientRect();
    seekFraction(cinemaProgressSeekFraction({ clientX: e.clientX, left: rect.left, width: rect.width }));
  }

  return (
    <article
      ref={rootRef}
      data-testid={`library-${variant}-tile-${d.id}`}
      className={cx(
        "group relative overflow-hidden bg-ink-950",
        cinema ? "library-cinema-tile" : "aspect-[4/5] rounded-2xl sm:aspect-square",
        selected && "ring-2 ring-white/25",
      )}
      onContextMenu={(e) => {
        e.preventDefault();
        setMenuAnchor({ x: e.clientX, y: e.clientY });
      }}
    >
      {showVideo ? (
        <video
          ref={videoRef}
          src={d.audioUrl}
          className="absolute inset-0 h-full w-full object-cover"
          muted
          playsInline
          loop
          preload="metadata"
          aria-hidden={previewVideo}
        />
      ) : kind === "image" && d.audioUrl ? (
        <img src={d.audioUrl} alt="" className="absolute inset-0 h-full w-full object-cover" />
      ) : showStage ? (
        <TrackVisualizer
          seed={d.seed}
          accent={accent}
          active={playing}
          backdropUrl={d.playbackCustomization?.backdropUrl}
          backdropFit={d.playbackCustomization?.backdropFit}
          backdropDim={d.playbackCustomization?.backdropDim}
          className="absolute inset-0"
        />
      ) : still ? (
        <img src={still} alt="" className="absolute inset-0 h-full w-full object-cover" />
      ) : kind === "file" ? (
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-gradient-to-b from-white/[0.04] to-transparent">
          <FileText className="h-10 w-10 text-white/35" />
          <span className="font-mono text-[11px] uppercase tracking-[0.18em] text-white/35">
            {(d.audioFormat ?? "file").replace(/^\./, "")}
          </span>
        </div>
      ) : (
        <div
          className="absolute inset-0"
          style={{ background: `linear-gradient(160deg, ${c1} 0%, ${c2} 55%, #050508 100%)` }}
        />
      )}

      <div className={cx(
        "pointer-events-none absolute inset-0",
        cinema
          ? "bg-gradient-to-t from-black/70 via-transparent to-black/15"
          : "bg-gradient-to-t from-black/80 via-black/10 to-black/20",
      )} />

      {!cinema ? (
        <button
          type="button"
          role="checkbox"
          aria-checked={selected}
          aria-label={`Select ${d.title?.trim() || "Untitled"}`}
          onClick={(e) => {
            e.stopPropagation();
            onSelect(e);
          }}
          data-testid="library-select-item"
          className={cx(
            "absolute left-3 top-3 z-20 flex h-6 w-6 items-center justify-center rounded-full border border-white/20 bg-black/40 text-white backdrop-blur transition",
            selected ? "opacity-100" : "opacity-0 group-hover:opacity-100 focus-visible:opacity-100",
          )}
        >
          <Check className={cx("h-3.5 w-3.5", selected ? "opacity-100" : "opacity-0")} />
        </button>
      ) : null}

      {!cinema ? (
        <div className="absolute right-3 top-3 z-20 flex items-center gap-1.5">
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onVisual();
            }}
            aria-label="Full screen visual"
            data-testid={`library-visual-${d.id}`}
            className="flex h-9 w-9 items-center justify-center rounded-full bg-black/40 text-white/80 backdrop-blur transition hover:text-white"
          >
            <Maximize2 className="h-4 w-4" />
          </button>
          <button
            ref={moreRef}
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              const rect = moreRef.current?.getBoundingClientRect();
              setMenuAnchor(rect ? { x: rect.right - 248, y: rect.bottom + 6 } : { x: 16, y: 16 });
            }}
            aria-label={`Actions for ${d.title?.trim() || "this work"}`}
            className="flex h-9 w-9 items-center justify-center rounded-full bg-black/40 text-white/80 backdrop-blur transition hover:text-white"
          >
            <MoreVertical className="h-4 w-4" />
          </button>
        </div>
      ) : null}

      <button
        type="button"
        onClick={toggleMedia}
        aria-label={playing ? "Pause" : kind === "image" || kind === "file" ? "Open" : "Play"}
        data-testid="library-cinema-tap"
        className="absolute inset-0 z-10"
      />

      <div className="pointer-events-none absolute inset-x-0 bottom-0 z-20 flex items-end justify-between gap-3 p-5 sm:p-6">
        <div className="min-w-0">
          {groupLabel ? (
            <h3 className="mb-1 font-mono text-[10px] uppercase tracking-[0.2em] text-white/35">{groupLabel}</h3>
          ) : null}
          <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-white/45">
            {KIND_LABEL[kind] ?? kind}
            {isFeatured ? " · Featured" : onStage ? " · On VYBZ" : ""}
          </p>
          <h2 className={cx("mt-1 truncate font-display text-white", cinema ? "text-2xl font-semibold tracking-tight" : "text-base font-medium")}>
            {d.title?.trim() || "Untitled"}
          </h2>
        </div>
        <div className="pointer-events-auto flex shrink-0 items-center gap-1.5">
          {(playable || kind === "video") && (
            <span className="flex h-11 w-11 items-center justify-center rounded-full bg-white/10 text-white backdrop-blur">
              {playing ? <Pause className="h-4 w-4" /> : <Play className="ml-0.5 h-4 w-4" />}
            </span>
          )}
          {cinema ? (
            <>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  if (playable && !playing) toggleMedia();
                  onVisual();
                }}
                aria-label="Full screen visual"
                data-testid={`library-visual-${d.id}`}
                className="flex h-11 w-11 items-center justify-center rounded-full bg-white/10 text-white backdrop-blur transition hover:bg-white/20"
              >
                <Maximize2 className="h-4 w-4" />
              </button>
              <button
                ref={moreRef}
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  const rect = moreRef.current?.getBoundingClientRect();
                  setMenuAnchor(rect ? { x: rect.right - 248, y: rect.top - 8 } : { x: 16, y: 16 });
                }}
                aria-label={`Actions for ${d.title?.trim() || "this work"}`}
                className="flex h-11 w-11 items-center justify-center rounded-full bg-white/10 text-white backdrop-blur transition hover:bg-white/20"
              >
                <MoreVertical className="h-4 w-4" />
              </button>
            </>
          ) : null}
        </div>
      </div>

      {showProgress ? (
        <div
          role="slider"
          aria-label="Playback position"
          aria-valuemin={0}
          aria-valuemax={1}
          data-testid="library-cinema-progress"
          className="absolute inset-x-0 bottom-0 z-30 flex h-8 cursor-ew-resize items-end"
          onPointerDown={(e) => {
            e.currentTarget.setPointerCapture(e.pointerId);
            scrubProgress(e);
          }}
          onPointerMove={(e) => {
            if (e.buttons) scrubProgress(e);
          }}
          onClick={(e) => e.stopPropagation()}
        >
          <span className="block h-1 w-full overflow-hidden bg-white/15">
            <span
              ref={progressRef}
              className="block h-full w-full origin-left bg-white/85"
              style={{ transform: "scaleX(0)" }}
            />
          </span>
        </div>
      ) : null}

      {menuAnchor !== null ? (
        <TrackActionMenu
          drop={d}
          open
          anchor={menuAnchor}
          onClose={() => setMenuAnchor(null)}
          returnFocusTo={moreRef.current}
          onChanged={onChanged}
          onPlay={() => toggleMedia()}
          isFeatured={isFeatured}
          onStage={onStage}
          snapshotDropIds={snapshotDropIds}
        />
      ) : null}
    </article>
  );
}

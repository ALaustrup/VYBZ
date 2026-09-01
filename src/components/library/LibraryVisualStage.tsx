import { useCallback, useEffect, useRef, useState } from "react";
import { ChevronLeft, ChevronRight, FileText, Pause, Play, X } from "lucide-react";
import { OverlayPortal } from "@/lib/overlayPortal";
import { TrackVisualizer } from "@/components/TrackVisualizer";
import { Waveform } from "@/components/Waveform";
import { getPlaybackProgress, getSnapshot, pause, play, playTrack, seek, seekFraction, usePlayer } from "@/lib/audioBus";
import { toPlayerTrack } from "@/lib/toPlayerTrack";
import { classifyDrop, isPlayableAudioWork } from "@/features/profile/workKind";
import {
  cinemaKeyboardTargetIsControl,
  cinemaPlayRestartsFromStart,
  cinemaProgressFraction,
  cinemaVisualSpaceIsTap,
} from "@/features/library/libraryPreview";
import { paletteFor } from "@/lib/utils";
import * as api from "@/lib/api";
import type { Drop } from "@/types";

function fmtTime(s: number): string {
  if (!Number.isFinite(s) || s <= 0) return "0:00";
  return `${Math.floor(s / 60)}:${Math.floor(s % 60).toString().padStart(2, "0")}`;
}

export function LibraryVisualStage({
  drops,
  index,
  onClose,
  onIndex,
  onPlace,
}: {
  drops: Drop[];
  index: number;
  onClose: () => void;
  onIndex: (next: number) => void;
  onPlace?: (drop: Drop) => void;
}) {
  const player = usePlayer();
  const stageRef = useRef<HTMLDivElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const [videoPlaying, setVideoPlaying] = useState(false);
  const drop = drops[index];
  const kind = drop ? classifyDrop(drop) : "file";
  const playable = drop ? isPlayableAudioWork(drop) : false;
  const videoWork = kind === "video" && !!drop?.audioUrl;
  const isCurrent = !!drop && player.track?.id === drop.id;
  const playing = videoWork ? videoPlaying : isCurrent && player.playing;
  const accent = drop ? paletteFor(drop.seed)[0] : "#00c2ff";
  const dur = (isCurrent ? player.duration : 0) || drop?.durationSec || 0;
  const progress = isCurrent && dur > 0 ? player.currentTime / dur : 0;
  const peaks = drop?.waveform && drop.waveform.length ? drop.waveform : undefined;

  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, []);

  useEffect(() => {
    stageRef.current?.focus();
  }, [drop?.id]);

  useEffect(() => {
    if (!drop) return;
    if (kind === "video") {
      pause();
      const v = videoRef.current;
      if (v) {
        v.playsInline = true;
        void v.play().catch(() => {});
      }
      return;
    }
    if (playable) {
      const snap = getSnapshot();
      const clock = getPlaybackProgress();
      const fraction = cinemaProgressFraction({
        currentTime: clock.currentTime,
        duration: clock.duration || drop.durationSec || 0,
      });
      const current = snap.track?.id === drop.id;
      if (cinemaPlayRestartsFromStart({ isCurrent: current, playing: current && snap.playing, fraction })) {
        seek(0);
      }
      if (!current) {
        void api.recordPlay(drop.id);
        playTrack(
          toPlayerTrack(drop),
          drops.filter((x) => isPlayableAudioWork(x)).map(toPlayerTrack),
        );
      } else if (!snap.playing) {
        void play();
      }
      return;
    }
    pause();
    // Opening a work (or moving prev/next) is the tap. Queue list can change identity without a new work.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [drop?.id, kind, playable]);

  useEffect(() => {
    const v = videoRef.current;
    if (!v || kind !== "video") {
      setVideoPlaying(false);
      return;
    }
    const sync = () => setVideoPlaying(!v.paused);
    sync();
    v.addEventListener("play", sync);
    v.addEventListener("pause", sync);
    return () => {
      v.removeEventListener("play", sync);
      v.removeEventListener("pause", sync);
    };
  }, [drop?.id, kind]);

  const toggleMedia = useCallback(() => {
    if (videoWork) {
      const v = videoRef.current;
      if (!v) return;
      if (v.paused) void v.play().catch(() => {});
      else v.pause();
      return;
    }
    if (!drop || !playable) return;
    const clock = getPlaybackProgress();
    const fraction = cinemaProgressFraction({
      currentTime: clock.currentTime,
      duration: clock.duration || drop.durationSec || 0,
    });
    if (cinemaPlayRestartsFromStart({ isCurrent, playing: isCurrent && player.playing, fraction })) seek(0);
    playTrack(
      toPlayerTrack(drop),
      drops.filter((x) => isPlayableAudioWork(x)).map(toPlayerTrack),
    );
  }, [videoWork, drop, playable, isCurrent, player.playing, drops]);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") {
        onClose();
        return;
      }
      if (e.key === "ArrowRight" && index < drops.length - 1) {
        e.preventDefault();
        onIndex(index + 1);
        return;
      }
      if (e.key === "ArrowLeft") {
        e.preventDefault();
        if (index > 0) onIndex(index - 1);
        return;
      }
        if (
        (e.key === " " || e.key === "Spacebar" || e.code === "Space") &&
        cinemaVisualSpaceIsTap({
          visualOpen: true,
          targetIsControl: cinemaKeyboardTargetIsControl(e.target),
        })
      ) {
        e.preventDefault();
        toggleMedia();
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [index, drops.length, onClose, onIndex, toggleMedia]);

  if (!drop) return null;

  return (
    <OverlayPortal>
      <div
        ref={stageRef}
        tabIndex={-1}
        className="fixed inset-0 z-[94] flex flex-col bg-black outline-none"
        data-testid="library-visual-stage"
        data-dark-stage
        role="dialog"
        aria-modal="true"
        aria-label="Library visual"
      >
        {kind === "audio" ? (
          <TrackVisualizer
            seed={drop.seed}
            accent={accent}
            active={playing}
            backdropUrl={drop.playbackCustomization?.backdropUrl}
            backdropFit={drop.playbackCustomization?.backdropFit}
            backdropDim={drop.playbackCustomization?.backdropDim}
            className="absolute inset-0"
          />
        ) : kind === "video" && drop.audioUrl ? (
          <video
            key={drop.id}
            ref={videoRef}
            src={drop.audioUrl}
            className="absolute inset-0 h-full w-full object-contain"
            playsInline
          />
        ) : kind === "image" && drop.audioUrl ? (
          <img src={drop.audioUrl} alt="" className="absolute inset-0 h-full w-full object-contain" />
        ) : (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-4">
            <FileText className="h-16 w-16 text-white/30" />
            {drop.audioUrl ? (
              <a
                href={drop.audioUrl}
                target="_blank"
                rel="noreferrer"
                className="rounded-full bg-white/10 px-4 py-2 text-[12px] font-semibold uppercase tracking-[0.16em] text-white/80"
              >
                Open file
              </a>
            ) : null}
          </div>
        )}

        <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-black/50" />

        <div className="relative z-10 flex items-center justify-between px-4 pt-[max(0.75rem,env(safe-area-inset-top))]">
          <button
            type="button"
            onClick={onClose}
            aria-label="Close visual"
            className="flex h-10 w-10 items-center justify-center rounded-full bg-white/10 text-white"
          >
            <X className="h-5 w-5" />
          </button>
          <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-white/45">
            {index + 1} / {drops.length}
          </p>
          {onPlace ? (
            <button
              type="button"
              onClick={() => onPlace(drop)}
              className="rounded-full bg-white/10 px-3 py-2 text-[10px] font-semibold uppercase tracking-[0.16em] text-white/75"
            >
              Place
            </button>
          ) : (
            <span className="w-10" />
          )}
        </div>

        <div className="relative z-10 mt-auto px-5 pb-[max(1.5rem,env(safe-area-inset-bottom))]">
          <p className="font-display text-2xl font-semibold text-white">{drop.title?.trim() || "Untitled"}</p>
          {kind === "audio" && peaks ? (
            <Waveform
              peaks={peaks}
              progress={progress}
              accent={accent}
              height={48}
              className="mt-4"
              onSeek={(frac) => seekFraction(frac)}
            />
          ) : null}
          {kind === "audio" ? (
            <p className="mt-2 font-mono text-[11px] text-white/40">
              {fmtTime(isCurrent ? player.currentTime : 0)} / {fmtTime(dur)}
            </p>
          ) : null}
          <div className="mt-4 flex items-center justify-center gap-6">
            <button
              type="button"
              onClick={() => index > 0 && onIndex(index - 1)}
              disabled={index <= 0}
              aria-label="Previous"
              className="flex h-11 w-11 items-center justify-center rounded-full bg-white/10 text-white disabled:opacity-25"
            >
              <ChevronLeft className="h-5 w-5" />
            </button>
            {playable || videoWork ? (
              <button
                type="button"
                onClick={toggleMedia}
                aria-label={playing ? "Pause" : "Play"}
                data-testid="library-visual-tap"
                className="flex h-14 w-14 items-center justify-center rounded-full bg-white text-black"
              >
                {playing ? <Pause className="h-5 w-5" /> : <Play className="ml-0.5 h-5 w-5" />}
              </button>
            ) : (
              <span className="h-14 w-14" />
            )}
            <button
              type="button"
              onClick={() => index < drops.length - 1 && onIndex(index + 1)}
              disabled={index >= drops.length - 1}
              aria-label="Next"
              className="flex h-11 w-11 items-center justify-center rounded-full bg-white/10 text-white disabled:opacity-25"
            >
              <ChevronRight className="h-5 w-5" />
            </button>
          </div>
        </div>
      </div>
    </OverlayPortal>
  );
}

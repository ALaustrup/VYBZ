import { classifyDrop, type WorkKind } from "@/features/profile/workKind";
import type { Drop } from "@/types";

/**
 * Scroll preview is visual only. Video may muted-loop while in view.
 * AudioBus never starts because a tile scrolled on screen.
 */
export function cinemaVideoShouldPreview(input: {
  kind: WorkKind;
  inView: boolean;
  reduceFx: boolean;
  audioPlaying: boolean;
  visualOpen: boolean;
}): boolean {
  return (
    input.kind === "video" &&
    input.inView &&
    !input.reduceFx &&
    !input.audioPlaying &&
    !input.visualOpen
  );
}

/** Sound starts on tap. Scroll does not start speaker playback. */
export function cinemaScrollStartsAudio(): false {
  return false;
}

/**
 * Cinema overlay recedes while you watch or scroll.
 * Filters, reduced motion, and a held search keep it.
 */
export function cinemaChromeShouldHide(input: {
  cinema: boolean;
  filtersOpen: boolean;
  reduceFx: boolean;
  hold: boolean;
  scrolled: boolean;
  playingSettled: boolean;
}): boolean {
  if (!input.cinema || input.filtersOpen || input.reduceFx || input.hold) return false;
  return input.scrolled || input.playingSettled;
}

/** Playing (or paused) work shows progress on the cinema tile. Scroll does not. */
export function cinemaProgressShouldShow(input: { cinema: boolean; isCurrent: boolean }): boolean {
  return input.cinema && input.isCurrent;
}

/** Clock → bar. Duration 0 or a bad clock is an empty bar, not NaN. */
export function cinemaProgressFraction(input: { currentTime: number; duration: number }): number {
  if (!(input.duration > 0) || !Number.isFinite(input.currentTime)) return 0;
  return Math.max(0, Math.min(1, input.currentTime / input.duration));
}

/** Tap or drag on the cinema bar. Width 0 does not seek. */
export function cinemaProgressSeekFraction(input: { clientX: number; left: number; width: number }): number {
  if (!(input.width > 0)) return 0;
  return Math.max(0, Math.min(1, (input.clientX - input.left) / input.width));
}

/** Ended work starts from the start on tap, instead of toggling at the end. */
export function cinemaPlayRestartsFromStart(input: {
  isCurrent: boolean;
  playing: boolean;
  fraction: number;
}): boolean {
  return input.isCurrent && !input.playing && input.fraction >= 0.995;
}

export function libraryStillUrl(drop: Drop): string | null {
  const kind = classifyDrop(drop);
  if (kind === "image" && drop.audioUrl) return drop.audioUrl;
  return drop.playbackCustomization?.backdropUrl ?? null;
}

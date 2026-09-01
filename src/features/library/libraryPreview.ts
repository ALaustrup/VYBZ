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

export function libraryStillUrl(drop: Drop): string | null {
  const kind = classifyDrop(drop);
  if (kind === "image" && drop.audioUrl) return drop.audioUrl;
  return drop.playbackCustomization?.backdropUrl ?? null;
}

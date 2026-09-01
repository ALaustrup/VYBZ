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
  unmuted?: boolean;
}): boolean {
  return (
    input.kind === "video" &&
    input.inView &&
    !input.reduceFx &&
    !input.audioPlaying &&
    !input.visualOpen &&
    !input.unmuted
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

/** Playing video shows progress on the tile. Muted preview is not the playing work. */
export function cinemaVideoProgressShouldShow(input: {
  cinema: boolean;
  video: boolean;
  unmuted: boolean;
}): boolean {
  return input.cinema && input.video && input.unmuted;
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

/** Ending a work does not start the next work. Arrows and taps still move. */
export function cinemaEndedAdvancesWork(): false {
  return false;
}

/** Cinema and visual play this work only. Neighbors stay for arrows, not for ended. */
export function cinemaPlaybackList<T>(input: { current: T; neighbors: T[] }): T[] {
  if (cinemaEndedAdvancesWork()) return input.neighbors;
  return [input.current];
}

/** Arrows move between works. They do not start speaker playback. */
export function cinemaArrowStartsAudio(): false {
  return false;
}

/** Space is a tap. Search, filters, menus, and full-screen keep their own keys. */
export function cinemaKeyboardIsGalleryNav(input: {
  cinema: boolean;
  targetIsControl: boolean;
  visualOpen: boolean;
  filtersOpen: boolean;
}): boolean {
  return input.cinema && !input.targetIsControl && !input.visualOpen && !input.filtersOpen;
}

/** Full-screen visual: Space is a tap. Native video controls stay off the stage. */
export function cinemaVisualSpaceIsTap(input: { visualOpen: boolean; targetIsControl: boolean }): boolean {
  return input.visualOpen && !input.targetIsControl;
}

/** Full-screen visual clock fills live. The stage does not subscribe to timeupdate. */
export function cinemaVisualClockIsLive(): true {
  return true;
}

/** Clock text for the visual stage. Missing time is 0:00, not NaN. */
export function cinemaClockLabel(seconds: number): string {
  if (!Number.isFinite(seconds) || seconds <= 0) return "0:00";
  return `${Math.floor(seconds / 60)}:${Math.floor(seconds % 60).toString().padStart(2, "0")}`;
}

export function cinemaKeyboardTargetIsControl(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false;
  if (target.isContentEditable) return true;
  const tag = target.tagName;
  if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT" || tag === "OPTION") return true;
  return !!target.closest("button, a, [role='slider'], [role='combobox'], [role='menu']");
}

/** Snap index from gallery scroll. Viewport 0 or an empty gallery is the first work. */
export function cinemaActiveTileIndex(input: {
  scrollTop: number;
  viewport: number;
  count: number;
}): number {
  if (!(input.viewport > 0) || input.count <= 0) return 0;
  return Math.max(0, Math.min(input.count - 1, Math.round(input.scrollTop / input.viewport)));
}

export function libraryStillUrl(drop: Drop): string | null {
  const kind = classifyDrop(drop);
  if (kind === "image" && drop.audioUrl) return drop.audioUrl;
  return drop.playbackCustomization?.backdropUrl ?? null;
}

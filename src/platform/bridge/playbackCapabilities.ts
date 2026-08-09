import type { PlaybackCapabilities } from "@/contracts";

/** Shared M9 playback caps — all shells use dry HTML audio until MediaSession ships. */
export function dryPlaybackCapabilities(): PlaybackCapabilities {
  return {
    dryHtmlAudio: true,
    mediaSession: false,
    nativeDsp: false,
  };
}

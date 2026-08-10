import type { PlaybackCapabilities } from "@/contracts";

interface NavigatorWithOptionalMediaSession {
  mediaSession?: unknown;
}

export function supportsMediaSession(
  target: NavigatorWithOptionalMediaSession | undefined =
    typeof navigator === "undefined" ? undefined : navigator,
): boolean {
  return target?.mediaSession != null;
}

/** Shared M9 playback caps — dry HTML audio with runtime OS-control disclosure. */
export function dryPlaybackCapabilities(
  options: { mediaSession?: boolean } = {},
): PlaybackCapabilities {
  return {
    dryHtmlAudio: true,
    mediaSession: options.mediaSession ?? false,
    nativeDsp: false,
  };
}

export function runtimePlaybackCapabilities(): PlaybackCapabilities {
  return dryPlaybackCapabilities({ mediaSession: supportsMediaSession() });
}

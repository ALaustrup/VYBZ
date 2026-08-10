import { describe, expect, it, vi } from "vitest";
import type {
  PlaybackController,
  PlaybackMediaState,
} from "@/contracts";
import { bindBrowserMediaSession } from "@/platform/bridge/mediaSession";
import {
  dryPlaybackCapabilities,
  supportsMediaSession,
} from "@/platform/bridge/playbackCapabilities";

function fakeSession() {
  const handlers = new Map<MediaSessionAction, MediaSessionActionHandler | null>();
  const positions: MediaPositionState[] = [];
  const session = {
    metadata: null as MediaMetadata | null,
    playbackState: "none" as MediaSessionPlaybackState,
    setActionHandler: (action: MediaSessionAction, handler: MediaSessionActionHandler | null) => {
      handlers.set(action, handler);
    },
    setPositionState: (state?: MediaPositionState) => {
      if (state) positions.push(state);
    },
  };
  return { session, handlers, positions };
}

function fakeController(initial?: Partial<PlaybackMediaState>) {
  let state: PlaybackMediaState = {
    track: null,
    playing: false,
    currentTime: 0,
    duration: 0,
    ...initial,
  };
  const listeners = new Set<() => void>();
  const controller: PlaybackController = {
    getState: () => state,
    subscribe: (listener) => {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    play: vi.fn(),
    pause: vi.fn(),
    next: vi.fn(),
    previous: vi.fn(),
    seek: vi.fn(),
  };
  return {
    controller,
    emit: (patch: Partial<PlaybackMediaState>) => {
      state = { ...state, ...patch };
      listeners.forEach((listener) => listener());
    },
  };
}

describe("M9 Platform Bridge MediaSession wiring", () => {
  it("reports runtime support without changing the dry playback contract", () => {
    expect(supportsMediaSession(undefined)).toBe(false);
    expect(supportsMediaSession({ mediaSession: {} })).toBe(true);
    expect(dryPlaybackCapabilities({ mediaSession: true })).toEqual({
      dryHtmlAudio: true,
      mediaSession: true,
      playbackLifecycle: false,
      audioFocus: false,
      nativeDsp: false,
    });
  });

  it("routes OS actions through the platform-neutral AudioBus controller", () => {
    const { session, handlers } = fakeSession();
    const { controller, emit } = fakeController({ currentTime: 30, duration: 120 });
    const cleanup = bindBrowserMediaSession(controller, session);

    handlers.get("play")?.({ action: "play" });
    handlers.get("nexttrack")?.({ action: "nexttrack" });
    handlers.get("seekbackward")?.({ action: "seekbackward", seekOffset: 5 });
    handlers.get("seekforward")?.({ action: "seekforward" });
    handlers.get("seekto")?.({ action: "seekto", seekTime: 42 });

    expect(controller.play).toHaveBeenCalledOnce();
    expect(controller.next).toHaveBeenCalledOnce();
    expect(vi.mocked(controller.seek).mock.calls.map(([seconds]) => seconds)).toEqual([
      25,
      40,
      42,
    ]);

    cleanup();
    expect(handlers.get("play")).toBeNull();
    emit({ playing: true });
    expect(session.playbackState).toBe("none");
  });

  it("publishes playback and bounded position state", () => {
    const { session, positions } = fakeSession();
    const { controller, emit } = fakeController();
    const cleanup = bindBrowserMediaSession(controller, session);

    emit({
      track: {
        title: "Track",
        artist: "Artist",
        album: "Release",
        durationSec: 120,
      },
      playing: true,
      currentTime: 130,
      duration: 120,
    });

    expect(session.playbackState).toBe("playing");
    expect(positions).toEqual([{ duration: 120, playbackRate: 1, position: 120 }]);
    cleanup();
  });

  it("puts PlaybackSignal disclosure into MediaSession album metadata", () => {
    class FakeMediaMetadata {
      title: string;
      artist: string;
      album: string;
      constructor(init: { title: string; artist: string; album?: string }) {
        this.title = init.title;
        this.artist = init.artist;
        this.album = init.album ?? "";
      }
    }
    vi.stubGlobal("MediaMetadata", FakeMediaMetadata);

    const { session } = fakeSession();
    const { controller, emit } = fakeController();
    const cleanup = bindBrowserMediaSession(controller, session);

    emit({
      track: { title: "Sim", artist: "Correct", album: "Album" },
      playing: true,
      currentTime: 1,
      duration: 10,
      disclosure: "disclosed simulation preview",
    });

    expect(session.metadata?.album).toBe("disclosed simulation preview");
    cleanup();
    vi.unstubAllGlobals();
  });

  it("cannot interrupt dry playback when a partial WebView rejects state", () => {
    const session = {
      metadata: null,
      playbackState: "none" as MediaSessionPlaybackState,
      setActionHandler: vi.fn(),
      setPositionState: () => {
        throw new Error("unsupported");
      },
    };
    const { controller } = fakeController({
      track: { title: "Track", artist: "Artist", durationSec: 10 },
      playing: true,
      currentTime: 1,
      duration: 10,
    });

    expect(() => bindBrowserMediaSession(controller, session)).not.toThrow();
  });
});

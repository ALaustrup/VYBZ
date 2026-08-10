import { describe, expect, it, vi } from "vitest";
import type { PlaybackController, PlaybackMediaState } from "@/contracts";
import { bindAudioFocus } from "@/platform/bridge/audioFocusBind";
import type { AudioFocusAdapter, AudioFocusChange } from "@/platform/android/audioFocus";

function mockController(initial: Partial<PlaybackMediaState> = {}): PlaybackController & {
  state: PlaybackMediaState;
  emit: () => void;
} {
  const listeners = new Set<() => void>();
  const state: PlaybackMediaState = {
    track: { title: "t", artist: "a" },
    playing: false,
    currentTime: 0,
    duration: 10,
    ...initial,
  };
  return {
    state,
    emit: () => listeners.forEach((l) => l()),
    getState: () => state,
    subscribe: (listener) => {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    play: vi.fn(() => {
      state.playing = true;
    }),
    pause: vi.fn(() => {
      state.playing = false;
    }),
    next: vi.fn(),
    previous: vi.fn(),
    seek: vi.fn(),
  };
}

function mockAdapter(): AudioFocusAdapter & {
  emit: (change: AudioFocusChange) => void;
  request: ReturnType<typeof vi.fn>;
  abandon: ReturnType<typeof vi.fn>;
} {
  let listener: ((change: AudioFocusChange) => void) | undefined;
  return {
    isNativeAndroid: () => true,
    isAvailable: async () => true,
    request: vi.fn(async () => true),
    abandon: vi.fn(async () => undefined),
    onChange: (cb) => {
      listener = cb;
      return () => {
        listener = undefined;
      };
    },
    emit: (change) => listener?.(change),
  };
}

describe("bindAudioFocus", () => {
  it("no-ops when not native Android", () => {
    const controller = mockController({ playing: true });
    const adapter: AudioFocusAdapter = {
      isNativeAndroid: () => false,
      isAvailable: async () => false,
      request: vi.fn(async () => false),
      abandon: vi.fn(async () => undefined),
      onChange: () => () => undefined,
    };
    const unbind = bindAudioFocus(controller, adapter);
    expect(adapter.request).not.toHaveBeenCalled();
    unbind();
  });

  it("requests focus on play and pauses on transient loss", async () => {
    const controller = mockController({ playing: false });
    const adapter = mockAdapter();
    bindAudioFocus(controller, adapter);

    controller.state.playing = true;
    controller.emit();
    await Promise.resolve();
    expect(adapter.request).toHaveBeenCalled();

    adapter.emit("lossTransient");
    expect(controller.pause).toHaveBeenCalled();
    expect(controller.state.playing).toBe(false);

    adapter.emit("gain");
    expect(controller.play).toHaveBeenCalled();
  });

  it("does not resume when user paused without a focus loss", async () => {
    const controller = mockController({ playing: true });
    const adapter = mockAdapter();
    bindAudioFocus(controller, adapter);
    await Promise.resolve();

    controller.state.playing = false;
    controller.emit();
    await Promise.resolve();
    expect(adapter.abandon).toHaveBeenCalled();

    adapter.emit("gain");
    expect(controller.play).not.toHaveBeenCalled();
  });
});

import { describe, expect, it, vi } from "vitest";
import type { PlaybackController, PlaybackMediaState } from "@/contracts";
import { bindPlaybackLifecycle } from "@/platform/bridge/playbackLifecycle";

function mockController(initial: Partial<PlaybackMediaState> = {}): PlaybackController & {
  state: PlaybackMediaState;
} {
  const state: PlaybackMediaState = {
    track: { title: "t", artist: "a" },
    playing: false,
    currentTime: 0,
    duration: 10,
    ...initial,
  };
  return {
    state,
    getState: () => state,
    subscribe: () => () => undefined,
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

describe("bindPlaybackLifecycle", () => {
  it("pauses on deactivate and resumes only if it paused playback", () => {
    const controller = mockController({ playing: true });
    let emit: ((active: boolean) => void) | undefined;
    const unbind = bindPlaybackLifecycle(controller, {
      subscribeAppState: (cb) => {
        emit = cb;
        return () => undefined;
      },
    });

    emit?.(false);
    expect(controller.pause).toHaveBeenCalledTimes(1);
    expect(controller.state.playing).toBe(false);

    emit?.(true);
    expect(controller.play).toHaveBeenCalledTimes(1);
    expect(controller.state.playing).toBe(true);

    emit?.(false);
    emit?.(true);
    expect(controller.pause).toHaveBeenCalledTimes(2);
    expect(controller.play).toHaveBeenCalledTimes(2);

    unbind();
  });

  it("does not resume when playback was already paused", () => {
    const controller = mockController({ playing: false });
    let emit: ((active: boolean) => void) | undefined;
    bindPlaybackLifecycle(controller, {
      subscribeAppState: (cb) => {
        emit = cb;
        return () => undefined;
      },
    });

    emit?.(false);
    emit?.(true);
    expect(controller.pause).not.toHaveBeenCalled();
    expect(controller.play).not.toHaveBeenCalled();
  });
});

import type { PlaybackController } from "@/contracts";
import {
  createNativeAudioFocusAdapter,
  type AudioFocusAdapter,
  type AudioFocusChange,
} from "@/platform/android/audioFocus";

/**
 * Bind dry AudioBus transport to Android AudioManager focus.
 * Transient loss pauses (no volume-duck DSP on the play path).
 * Resumes only when this binder paused for a focus loss.
 */
export function bindAudioFocus(
  controller: PlaybackController,
  adapter: AudioFocusAdapter = createNativeAudioFocusAdapter(),
): () => void {
  if (!adapter.isNativeAndroid()) {
    return () => undefined;
  }

  let pausedByFocus = false;
  let holding = false;
  let requestInFlight = false;

  const ensureFocus = async () => {
    if (holding || requestInFlight) return;
    requestInFlight = true;
    try {
      holding = await adapter.request();
    } finally {
      requestInFlight = false;
    }
  };

  const releaseFocus = async () => {
    if (!holding) return;
    holding = false;
    await adapter.abandon();
  };

  const unsubState = controller.subscribe(() => {
    const state = controller.getState();
    if (state.playing) {
      void ensureFocus();
      return;
    }
    if (!pausedByFocus) void releaseFocus();
  });

  const onChange = (change: AudioFocusChange) => {
    if (change === "loss" || change === "lossTransient" || change === "lossTransientCanDuck") {
      if (controller.getState().playing) {
        pausedByFocus = true;
        controller.pause();
      }
      if (change === "loss") {
        holding = false;
      }
      return;
    }
    if (change === "gain" && pausedByFocus) {
      pausedByFocus = false;
      void controller.play();
    }
  };

  const unsubFocus = adapter.onChange(onChange);

  if (controller.getState().playing) {
    void ensureFocus();
  }

  return () => {
    unsubState();
    unsubFocus();
    pausedByFocus = false;
    void releaseFocus();
  };
}

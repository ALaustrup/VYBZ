import type { PlaybackController } from "@/contracts";

export type AppStateSubscriber = (onActiveChange: (isActive: boolean) => void) => () => void;

/**
 * Capacitor App appStateChange — pauses dry playback when the shell deactivates
 * and resumes only if this binder paused it. Not native AudioManager focus
 * (PlaybackCapabilities.audioFocus stays false until a native adapter exists).
 */
export async function subscribeCapacitorAppState(
  onActiveChange: (isActive: boolean) => void,
): Promise<() => void> {
  try {
    const { App } = await import("@capacitor/app");
    const handle = await App.addListener("appStateChange", (state) => {
      onActiveChange(state.isActive);
    });
    return () => {
      void handle.remove();
    };
  } catch {
    return () => undefined;
  }
}

export function createCapacitorAppStateSubscriber(): AppStateSubscriber {
  return (onActiveChange) => {
    let removed = false;
    let unbind: (() => void) | undefined;
    void subscribeCapacitorAppState(onActiveChange).then((fn) => {
      if (removed) {
        fn();
        return;
      }
      unbind = fn;
    });
    return () => {
      removed = true;
      unbind?.();
    };
  };
}

/**
 * Bind dry AudioBus pause/resume to shell deactivation.
 * Inject `subscribeAppState` in tests; production uses Capacitor when present.
 */
export function bindPlaybackLifecycle(
  controller: PlaybackController,
  options: { subscribeAppState?: AppStateSubscriber } = {},
): () => void {
  let pausedByLifecycle = false;
  const subscribe =
    options.subscribeAppState ?? createCapacitorAppStateSubscriber();

  const onActiveChange = (isActive: boolean) => {
    if (!isActive) {
      const state = controller.getState();
      if (state.playing) {
        pausedByLifecycle = true;
        controller.pause();
      }
      return;
    }
    if (!pausedByLifecycle) return;
    pausedByLifecycle = false;
    void controller.play();
  };

  const unbindApp = subscribe(onActiveChange);

  const onPageHide = (event: PageTransitionEvent) => {
    // Entering bfcache / being discarded — keep snapshot honest.
    if (event.persisted) onActiveChange(false);
  };
  const onPageShow = (event: PageTransitionEvent) => {
    if (event.persisted) onActiveChange(true);
  };

  if (typeof window !== "undefined") {
    window.addEventListener("pagehide", onPageHide);
    window.addEventListener("pageshow", onPageShow);
  }

  return () => {
    unbindApp();
    if (typeof window !== "undefined") {
      window.removeEventListener("pagehide", onPageHide);
      window.removeEventListener("pageshow", onPageShow);
    }
    pausedByLifecycle = false;
  };
}

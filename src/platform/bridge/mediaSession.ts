import type {
  PlaybackController,
  PlaybackMediaState,
} from "@/contracts";

type MediaSessionTarget = Pick<
  MediaSession,
  "metadata" | "playbackState" | "setActionHandler" | "setPositionState"
>;

const ACTIONS: MediaSessionAction[] = [
  "play",
  "pause",
  "nexttrack",
  "previoustrack",
  "seekto",
  "seekbackward",
  "seekforward",
];

function currentMediaSession(): MediaSessionTarget | null {
  if (typeof navigator === "undefined" || !("mediaSession" in navigator)) return null;
  return navigator.mediaSession;
}

function setHandler(
  session: MediaSessionTarget,
  action: MediaSessionAction,
  handler: MediaSessionActionHandler | null,
) {
  try {
    session.setActionHandler(action, handler);
  } catch {
    // Some WebViews expose MediaSession but reject individual actions.
  }
}

function syncMediaSession(
  session: MediaSessionTarget,
  state: PlaybackMediaState,
) {
  try {
    if (!state.track) {
      session.metadata = null;
      session.playbackState = "none";
      return;
    }

    const album =
      state.disclosure && state.disclosure.length > 0
        ? state.disclosure
        : (state.track.album ?? "");

    if (
      typeof MediaMetadata !== "undefined" &&
      (session.metadata?.title !== state.track.title ||
        session.metadata?.artist !== state.track.artist ||
        session.metadata?.album !== album)
    ) {
      session.metadata = new MediaMetadata({
        title: state.track.title,
        artist: state.track.artist,
        album,
      });
    }

    session.playbackState = state.playing ? "playing" : "paused";
    const duration = state.duration || state.track.durationSec || 0;
    if (!Number.isFinite(duration) || duration <= 0) return;

    session.setPositionState({
      duration,
      playbackRate: 1,
      position: Math.min(duration, Math.max(0, state.currentTime)),
    });
  } catch {
    // Optional OS integration must never interrupt dry HTML audio.
  }
}

/** Bind browser/WebView OS controls to a platform-neutral dry transport. */
export function bindBrowserMediaSession(
  controller: PlaybackController,
  session: MediaSessionTarget | null = currentMediaSession(),
): () => void {
  if (!session) return () => undefined;

  setHandler(session, "play", () => void controller.play());
  setHandler(session, "pause", controller.pause);
  setHandler(session, "nexttrack", controller.next);
  setHandler(session, "previoustrack", controller.previous);
  setHandler(session, "seekto", (details) => {
    if (typeof details.seekTime === "number") controller.seek(details.seekTime);
  });
  setHandler(session, "seekbackward", (details) => {
    controller.seek(controller.getState().currentTime - (details.seekOffset ?? 10));
  });
  setHandler(session, "seekforward", (details) => {
    controller.seek(controller.getState().currentTime + (details.seekOffset ?? 10));
  });

  const sync = () => syncMediaSession(session, controller.getState());
  const unsubscribe = controller.subscribe(sync);
  sync();

  return () => {
    unsubscribe();
    for (const action of ACTIONS) setHandler(session, action, null);
    try {
      session.metadata = null;
      session.playbackState = "none";
    } catch {
      // Ignore teardown failures in partial WebViews.
    }
  };
}

/**
 * Keep a muted <video> locked to AudioBus play/pause (and optionally time).
 * Avoids calling video.load() on every play toggle — that was fighting VDock audio.
 */

export type StageSyncMode = "loop" | "timeline";

export function bindStageVideo(
  video: HTMLVideoElement,
  opts: {
    playing: boolean;
    /** Audio clock seconds — used for timeline sync only. */
    currentTime?: number;
    mode?: StageSyncMode;
  },
) {
  const mode = opts.mode ?? "loop";
  video.muted = true;
  video.playsInline = true;
  video.loop = mode === "loop";

  if (!opts.playing) {
    if (!video.paused) video.pause();
    return;
  }

  if (mode === "timeline" && typeof opts.currentTime === "number" && Number.isFinite(opts.currentTime)) {
    const dur = video.duration;
    if (Number.isFinite(dur) && dur > 0) {
      const target = ((opts.currentTime % dur) + dur) % dur;
      if (Math.abs(video.currentTime - target) > 0.45) {
        try {
          video.currentTime = target;
        } catch {
          /* ignore seek errors while buffering */
        }
      }
    }
  }

  if (video.paused) {
    void video.play().catch(() => undefined);
  }
}

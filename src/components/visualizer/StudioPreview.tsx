import { useEffect, useRef } from "react";
import {
  STUDIO_H,
  STUDIO_W,
  renderStudioFrame,
  type StudioBands,
  type StudioReactiveSettings,
} from "@/lib/visualizerStudio";

/**
 * Live canvas preview for the Visualizer Studio.
 * Draws media + reactive overlays driven by analyser bands.
 */
export function StudioPreview({
  mediaEl,
  mediaKind,
  bands,
  freqs,
  settings,
  timeSec,
  canvasRef,
  className,
}: {
  mediaEl: HTMLVideoElement | HTMLImageElement | null;
  mediaKind: "video" | "image" | null;
  bands: StudioBands;
  freqs: Uint8Array | null;
  settings: StudioReactiveSettings;
  timeSec: number;
  canvasRef: React.MutableRefObject<HTMLCanvasElement | null>;
  className?: string;
}) {
  const localRef = useRef<HTMLCanvasElement>(null);
  const bandsRef = useRef(bands);
  const freqsRef = useRef(freqs);
  const settingsRef = useRef(settings);
  const timeRef = useRef(timeSec);
  const mediaRef = useRef(mediaEl);
  const kindRef = useRef(mediaKind);

  bandsRef.current = bands;
  freqsRef.current = freqs;
  settingsRef.current = settings;
  timeRef.current = timeSec;
  mediaRef.current = mediaEl;
  kindRef.current = mediaKind;

  useEffect(() => {
    const canvas = localRef.current;
    if (!canvas) return;
    canvasRef.current = canvas;
    canvas.width = STUDIO_W;
    canvas.height = STUDIO_H;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let raf = 0;
    let running = true;

    const draw = () => {
      if (!running) return;
      const media = mediaRef.current;
      let mw = 0;
      let mh = 0;
      if (media) {
        if (kindRef.current === "video") {
          const v = media as HTMLVideoElement;
          mw = v.videoWidth;
          mh = v.videoHeight;
        } else {
          const img = media as HTMLImageElement;
          mw = img.naturalWidth;
          mh = img.naturalHeight;
        }
      }
      renderStudioFrame(ctx, {
        media: mw > 0 ? media : null,
        mediaW: mw,
        mediaH: mh,
        bands: bandsRef.current,
        freqs: freqsRef.current,
        settings: settingsRef.current,
        timeSec: timeRef.current,
      });
      raf = requestAnimationFrame(draw);
    };

    raf = requestAnimationFrame(draw);
    return () => {
      running = false;
      cancelAnimationFrame(raf);
    };
  }, [canvasRef]);

  return (
    <canvas
      ref={localRef}
      className={className}
      width={STUDIO_W}
      height={STUDIO_H}
      aria-label="Visualizer preview"
    />
  );
}

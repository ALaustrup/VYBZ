import { useEffect, useRef } from "react";
import { cx } from "@/lib/utils";

interface WaveformProps {
  /** Normalized peaks 0..1. */
  peaks: number[];
  /** Playback progress 0..1 (fills the bars up to here). */
  progress?: number;
  /** Live clock. When set, the wave fills from RAF instead of a progress prop. */
  liveProgress?: () => number;
  /** Accent for the played portion. */
  accent?: string;
  height?: number;
  className?: string;
  /** Seek callback (fraction 0..1) when the user clicks/taps the wave. */
  onSeek?: (frac: number) => void;
}

/**
 * A crisp, GPU-cheap waveform rendered to canvas. The played portion fills with
 * the drop's accent; the rest sits as calm graphite bars. Click/drag to seek.
 * Without liveProgress, redraws only when peaks/progress change (no rAF).
 */
export function Waveform({
  peaks,
  progress = 0,
  liveProgress,
  accent = "#a87cf8",
  height = 56,
  className,
  onSeek,
}: WaveformProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const liveProgressRef = useRef(liveProgress);
  liveProgressRef.current = liveProgress;
  const live = !!liveProgress;

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const parent = canvas.parentElement;
    const width = parent?.clientWidth ?? 300;
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    canvas.width = width * dpr;
    canvas.height = height * dpr;
    canvas.style.width = "100%";
    canvas.style.height = `${height}px`;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const draw = (frac: number) => {
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, width, height);

      // Resample the raw peaks down to the number of bars that actually fit the
      // canvas, so the waveform reads cleanly and consistently regardless of the
      // clip length (800 raw buckets into a narrow bar would otherwise speckle).
      const STEP = 3; // px per bar (bar + gap)
      const bars = Math.max(8, Math.floor(width / STEP));
      const src = peaks.length || 1;
      const per = src / bars;
      const barW = Math.max(1.5, width / bars - 1);
      const mid = height / 2;
      const playedX = Math.max(0, Math.min(1, frac)) * width;

      for (let b = 0; b < bars; b++) {
        // Peak of the raw bucket range this bar represents.
        let p = 0;
        const start = Math.floor(b * per);
        const end = Math.max(start + 1, Math.floor((b + 1) * per));
        for (let i = start; i < end && i < peaks.length; i++) {
          if (peaks[i] > p) p = peaks[i];
        }
        const x = (b / bars) * width;
        const h = Math.max(2, p * (height - 4));
        ctx.fillStyle = x <= playedX ? accent : "rgba(255,255,255,0.18)";
        ctx.beginPath();
        ctx.roundRect(x, mid - h / 2, barW, h, Math.min(barW / 2, 1.5));
        ctx.fill();
      }
    };

    if (live) {
      let raf = 0;
      let running = true;
      const tick = () => {
        if (!running) return;
        draw(liveProgressRef.current?.() ?? progress);
        raf = requestAnimationFrame(tick);
      };
      raf = requestAnimationFrame(tick);
      return () => {
        running = false;
        cancelAnimationFrame(raf);
      };
    }

    draw(progress);
  }, [peaks, progress, accent, height, live]);

  function handlePointer(e: React.PointerEvent<HTMLCanvasElement>) {
    if (!onSeek) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const frac = Math.min(1, Math.max(0, (e.clientX - rect.left) / rect.width));
    onSeek(frac);
  }

  return (
    <canvas
      ref={canvasRef}
      onPointerDown={handlePointer}
      className={cx(onSeek ? "cursor-pointer touch-none" : "", className)}
      aria-hidden
    />
  );
}

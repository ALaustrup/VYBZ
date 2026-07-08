import { useEffect, useRef } from "react";
import { cx } from "@/lib/utils";

interface WaveformProps {
  /** Normalized peaks 0..1. */
  peaks: number[];
  /** Playback progress 0..1 (fills the bars up to here). */
  progress?: number;
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
 * Redraws only when peaks/progress change (no rAF), so it's near-free at rest.
 */
export function Waveform({
  peaks,
  progress = 0,
  accent = "#a87cf8",
  height = 56,
  className,
  onSeek,
}: WaveformProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

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
    ctx.scale(dpr, dpr);
    ctx.clearRect(0, 0, width, height);

    const n = peaks.length || 1;
    const gap = 1;
    const barW = Math.max(1, width / n - gap);
    const mid = height / 2;
    const playedX = progress * width;

    for (let i = 0; i < n; i++) {
      const x = (i / n) * width;
      const h = Math.max(2, peaks[i] * (height - 4));
      ctx.fillStyle = x <= playedX ? accent : "rgba(255,255,255,0.18)";
      ctx.beginPath();
      const r = Math.min(barW / 2, 1.5);
      const y = mid - h / 2;
      // Rounded bar.
      ctx.roundRect(x, y, barW, h, r);
      ctx.fill();
    }
  }, [peaks, progress, accent, height]);

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

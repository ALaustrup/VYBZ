import { useEffect, useRef } from "react";
import { frequencyBinCount, readFrequencies } from "@/lib/audioBus";
import { useFxScale, useReduceFx } from "@/lib/display";
import { createDropStageEngine } from "@/lib/gpu/dropStageEngine";
import { sampleReactiveFrame } from "@/lib/reactiveVisualRuntime";
import { paletteFor, cx } from "@/lib/utils";

interface DropStageProps {
  seed: number;
  accent?: string;
  /** True when this drop is the audible focus. */
  active?: boolean;
  className?: string;
  /** Public CDN video/image under the reactive layer. */
  backdropUrl?: string | null;
  backdropFit?: "cover" | "contain";
  /** 0..1 dim over backdrop (uploader default ~0.35). */
  backdropDim?: number;
}

/**
 * Full-bleed drop banner compositor — optional video/still backdrop +
 * WebGL2 reactive field (Canvas2D seeded fallback).
 * Never intercepts pointer events (play/scrub/Orb stay on top).
 */
export function DropStage({
  seed,
  accent = "#34f5a0",
  active = false,
  className,
  backdropUrl = null,
  backdropFit = "cover",
  backdropDim = 0.35,
}: DropStageProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const reduce = useReduceFx();
  const fxScale = useFxScale();
  const hasBackdrop = !!backdropUrl;
  const looksLikeImage = !!backdropUrl && /\.(jpe?g|png|webp|gif)(\?|$)/i.test(backdropUrl);

  // Keep video in sync with active playback (save battery when paused)
  useEffect(() => {
    const v = videoRef.current;
    if (!v) return;
    if (active && !reduce) void v.play().catch(() => {});
    else v.pause();
  }, [active, reduce, backdropUrl]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const palette = [...paletteFor(seed)];
    if (accent) palette[0] = accent;

    // With a backdrop, Soft/Max still drive the overlay; Off / reduce = calm veil only
    const gpu = !reduce ? createDropStageEngine(canvas) : null;
    if (gpu) {
      let raf = 0;
      let t = 0;
      let w = 300;
      let h = 200;
      const resize = () => {
        const parent = canvas.parentElement;
        w = parent?.clientWidth ?? 300;
        h = parent?.clientHeight ?? 200;
        gpu.resize(w, h, Math.min(2, window.devicePixelRatio || 1));
      };
      resize();
      const ro = typeof ResizeObserver !== "undefined" ? new ResizeObserver(resize) : null;
      ro?.observe(canvas.parentElement ?? canvas);
      window.addEventListener("resize", resize);

      const loop = () => {
        const animate = active && !reduce && fxScale > 0.02;
        t += animate ? 0.016 : 0.004;
        const rv = sampleReactiveFrame(animate);
        // Scale FX down slightly when a backdrop is present so video stays visible
        const stageFx = (reduce ? 0 : fxScale) * (hasBackdrop ? 0.72 : 1);
        gpu.draw({
          time: t,
          active: animate,
          fxScale: stageFx,
          seed: seed >>> 0,
          palette,
          rv,
        });
        if (animate || t < 0.5) raf = requestAnimationFrame(loop);
        else {
          gpu.draw({
            time: t,
            active: false,
            fxScale: hasBackdrop ? 0.15 : 0,
            seed: seed >>> 0,
            palette,
            rv: sampleReactiveFrame(false),
          });
        }
      };
      raf = requestAnimationFrame(loop);
      return () => {
        cancelAnimationFrame(raf);
        window.removeEventListener("resize", resize);
        ro?.disconnect();
        gpu.destroy();
      };
    }

    // Canvas2D seeded fallback
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const freq = new Uint8Array(frequencyBinCount());
    let s = (seed >>> 0) || 1;
    const rnd = () => {
      s = (s * 1664525 + 1013904223) >>> 0;
      return s / 0xffffffff;
    };
    const style = (seed >>> 0) % 4;
    const rings = 3 + Math.floor(rnd() * 3);
    const phase = rnd() * Math.PI * 2;
    const drift = 0.15 + rnd() * 0.5;
    const skew = 0.6 + rnd() * 0.8;
    let w = 300;
    let h = 200;
    let raf = 0;
    let t = 0;
    const resize = () => {
      const parent = canvas.parentElement;
      w = parent?.clientWidth ?? 300;
      h = parent?.clientHeight ?? 200;
      const dpr = Math.min(2, window.devicePixelRatio || 1);
      canvas.width = w * dpr;
      canvas.height = h * dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };
    resize();
    window.addEventListener("resize", resize);

    const frame = () => {
      const animate = active && !reduce;
      t += animate ? 0.016 : 0;
      const b = animate ? sampleReactiveFrame(true) : sampleReactiveFrame(false);
      const pulse = reduce ? 0.12 : 0.1 + b.level * 0.85 + b.beat * 0.35;
      ctx.clearRect(0, 0, w, h);
      if (hasBackdrop) {
        // Light veil only — video/image carries the stage
        ctx.fillStyle = `rgba(6,8,16,${0.12 + pulse * 0.08})`;
        ctx.fillRect(0, 0, w, h);
      }
      ctx.globalCompositeOperation = "lighter";
      const alphaMul = hasBackdrop ? 0.55 : 1;
      if (style === 0) {
        for (let r = 0; r < rings; r++) {
          const base = (Math.min(w, h) / 2) * (0.28 + (r / rings) * 0.6);
          const wobble = base * (1 + pulse * (0.18 + r * 0.05));
          const spin = phase + t * drift * (r % 2 ? -1 : 1);
          ctx.beginPath();
          for (let a = 0; a <= Math.PI * 2 + 0.1; a += 0.14) {
            const rad = wobble * (1 + 0.06 * Math.sin(a * (2 + r) * skew + spin));
            const x = w / 2 + Math.cos(a) * rad;
            const y = h / 2 + Math.sin(a) * rad * 0.92;
            a === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
          }
          ctx.closePath();
          ctx.strokeStyle = hexA(palette[r % 3], (0.08 + pulse * 0.12) * alphaMul);
          ctx.lineWidth = 1 + pulse * 1.8;
          ctx.stroke();
        }
      } else if (style === 1) {
        if (animate) readFrequencies(freq);
        const N = Math.max(18, Math.min(40, Math.floor(w / 10)));
        const half = Math.floor(N / 2);
        for (let i = 0; i < half; i++) {
          const bin = Math.floor(Math.pow(i / half, 1.6) * (freq.length * 0.55));
          const v = animate ? freq[bin] / 255 : 0.1;
          const bh = Math.max(2, v * h * 0.8 * (0.7 + pulse * 0.6));
          const bw = w / N - 2;
          for (const dir of [-1, 1] as const) {
            const x = w / 2 + dir * (i + 0.5) * (bw + 2) - bw / 2;
            ctx.fillStyle = hexA(palette[i % 3], (0.35 + v * 0.4) * alphaMul);
            ctx.fillRect(x, h - bh, bw, bh);
          }
        }
      } else if (style === 2) {
        for (let i = 0; i < 8; i++) {
          const ang = t * (0.4 + i * 0.05) + i;
          const x = w / 2 + Math.cos(ang) * w * 0.28 * (1 + b.bass * 0.4);
          const y = h / 2 + Math.sin(ang) * h * 0.28;
          ctx.fillStyle = hexA(palette[i % 3], (0.35 + b.level * 0.3) * alphaMul);
          ctx.beginPath();
          ctx.arc(x, y, 2 + b.beat * 4, 0, Math.PI * 2);
          ctx.fill();
        }
      } else {
        ctx.strokeStyle = hexA(palette[0], (0.2 + pulse * 0.3) * alphaMul);
        ctx.lineWidth = 1.5 + pulse * 2;
        ctx.beginPath();
        for (let x = 0; x <= w; x += 6) {
          const y = h * 0.5 + Math.sin(x / w * Math.PI * 4 + t + b.mid * 3) * h * (0.12 + pulse * 0.1);
          x === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
        }
        ctx.stroke();
      }
      ctx.globalCompositeOperation = "source-over";
      if (!animate) return;
      raf = requestAnimationFrame(frame);
    };
    frame();
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", resize);
    };
  }, [seed, accent, active, reduce, fxScale, hasBackdrop]);

  const fitClass = backdropFit === "contain" ? "object-contain" : "object-cover";
  // When FX Off / reduce-motion, show more of the backdrop (less dim)
  const dim = reduce || fxScale < 0.02
    ? Math.min(backdropDim, 0.2)
    : backdropDim;

  return (
    <div className={cx("pointer-events-none absolute inset-0 overflow-hidden", className)} aria-hidden>
      {backdropUrl && (
        looksLikeImage ? (
          <img
            src={backdropUrl}
            alt=""
            className={cx("absolute inset-0 h-full w-full bg-ink-950", fitClass)}
          />
        ) : (
          <video
            ref={videoRef}
            src={backdropUrl}
            muted
            loop
            playsInline
            autoPlay={active}
            className={cx("absolute inset-0 h-full w-full bg-ink-950", fitClass)}
          />
        )
      )}
      {backdropUrl && (
        <div
          className="absolute inset-0"
          style={{ background: `rgba(6, 8, 16, ${dim})` }}
        />
      )}
      <canvas
        ref={canvasRef}
        className={cx(
          "absolute inset-0 h-full w-full",
          hasBackdrop && (reduce || fxScale < 0.02) && "opacity-40",
        )}
      />
    </div>
  );
}

function hexA(hex: string, alpha: number): string {
  if (hex.startsWith("#") && hex.length >= 7) {
    const r = parseInt(hex.slice(1, 3), 16);
    const g = parseInt(hex.slice(3, 5), 16);
    const b = parseInt(hex.slice(5, 7), 16);
    return `rgba(${r}, ${g}, ${b}, ${alpha})`;
  }
  return hex;
}

/** @deprecated Prefer DropStage — thin alias for call-site migration. */
export { DropStage as TrackVisualizer };

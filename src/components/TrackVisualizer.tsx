import { useEffect, useRef } from "react";
import { frequencyBinCount, readFrequencies } from "@/lib/audioBus";
import { cx } from "@/lib/utils";

interface TrackVisualizerProps {
  /** Deterministic seed → every track looks unique (§6.6). */
  seed: number;
  /** Accent hex for the bloom. */
  accent?: string;
  /** True when THIS track is the one currently playing (drives reactivity). */
  active?: boolean;
  className?: string;
}

/**
 * A generative, seeded visualizer that fills a track card's "stage" (§6.6).
 * Guaranteed-unique per (seed): palette phase, ring geometry and motion all
 * derive from the seed, so no two tracks look the same. When the track is the
 * active player track it reacts to live low-end energy from the shared AudioBus
 * analyser; otherwise it renders a calm, near-static seeded frame (zero idle
 * cost — one slow rAF that mostly draws the same thing). Foundation for the
 * Phase 4 platform-wide border FX.
 */
export function TrackVisualizer({
  seed,
  accent = "#a87cf8",
  active = false,
  className,
}: TrackVisualizerProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const rafRef = useRef<number>(0);
  const freqRef = useRef<Uint8Array>(new Uint8Array(frequencyBinCount()));

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const reduce = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;

    // Seeded params.
    let s = seed >>> 0;
    const rnd = () => {
      s = (s * 1664525 + 1013904223) >>> 0;
      return s / 0xffffffff;
    };
    const rings = 3 + Math.floor(rnd() * 3);
    const phase = rnd() * Math.PI * 2;
    const drift = 0.15 + rnd() * 0.5;
    const skew = 0.6 + rnd() * 0.8;

    function resize() {
      const parent = canvas!.parentElement;
      const w = parent?.clientWidth ?? 300;
      const h = parent?.clientHeight ?? 200;
      const dpr = Math.min(2, window.devicePixelRatio || 1);
      canvas!.width = w * dpr;
      canvas!.height = h * dpr;
      ctx!.setTransform(dpr, 0, 0, dpr, 0, 0);
      return { w, h };
    }
    let { w, h } = resize();
    const onResize = () => ({ w, h } = resize());
    window.addEventListener("resize", onResize);

    let t = 0;
    function frame() {
      // Animate only while THIS track is the active playback; paused/off cards
      // render a single calm seeded frame for zero idle cost (§6.6).
      const animate = active && !reduce;
      t += animate ? 0.016 : 0;
      // Live low-end energy (bass) when this track is the active playback.
      let energy = 0;
      if (active && readFrequencies(freqRef.current)) {
        const bins = Math.max(1, Math.floor(freqRef.current.length * 0.12));
        let sum = 0;
        for (let i = 0; i < bins; i++) sum += freqRef.current[i];
        energy = sum / (bins * 255);
      }
      const pulse = reduce ? 0.12 : 0.12 + energy * 0.9;

      ctx!.clearRect(0, 0, w, h);
      // Deep vignette base.
      const bg = ctx!.createRadialGradient(w / 2, h * 0.55, 0, w / 2, h * 0.55, Math.max(w, h) * 0.75);
      bg.addColorStop(0, "rgba(255,255,255,0.02)");
      bg.addColorStop(1, "rgba(6,8,16,0)");
      ctx!.fillStyle = bg;
      ctx!.fillRect(0, 0, w, h);

      const cx0 = w / 2;
      const cy0 = h / 2;
      ctx!.globalCompositeOperation = "lighter";
      for (let r = 0; r < rings; r++) {
        const base = (Math.min(w, h) / 2) * (0.28 + (r / rings) * 0.6);
        const wobble = base * (1 + pulse * (0.18 + r * 0.05));
        const spin = phase + t * drift * (r % 2 ? -1 : 1);
        ctx!.beginPath();
        for (let a = 0; a <= Math.PI * 2 + 0.1; a += 0.14) {
          const rad =
            wobble *
            (1 + 0.06 * Math.sin(a * (2 + r) * skew + spin) + pulse * 0.08 * Math.sin(a * 3 + t));
          const x = cx0 + Math.cos(a) * rad;
          const y = cy0 + Math.sin(a) * rad * 0.92;
          if (a === 0) ctx!.moveTo(x, y);
          else ctx!.lineTo(x, y);
        }
        ctx!.closePath();
        const alpha = 0.05 + (1 - r / rings) * (0.08 + pulse * 0.12);
        ctx!.strokeStyle = withAlpha(accent, alpha);
        ctx!.lineWidth = 1 + pulse * 1.6;
        ctx!.stroke();
      }
      ctx!.globalCompositeOperation = "source-over";

      // Idle (not the active track) or reduced-motion: draw one frame and stop.
      if (!active || reduce) return;
      rafRef.current = requestAnimationFrame(frame);
    }
    frame();

    return () => {
      cancelAnimationFrame(rafRef.current);
      window.removeEventListener("resize", onResize);
    };
  }, [seed, accent, active]);

  return (
    <canvas
      ref={canvasRef}
      className={cx("h-full w-full", className)}
      aria-hidden
    />
  );
}

function withAlpha(hex: string, alpha: number): string {
  if (hex.startsWith("#") && hex.length >= 7) {
    const r = parseInt(hex.slice(1, 3), 16);
    const g = parseInt(hex.slice(3, 5), 16);
    const b = parseInt(hex.slice(5, 7), 16);
    return `rgba(${r}, ${g}, ${b}, ${alpha})`;
  }
  return hex;
}

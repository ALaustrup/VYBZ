import { useEffect, useRef } from "react";
import { usePlayer, readBands } from "@/lib/audioBus";
import { paletteFor } from "@/lib/utils";
import { useReduceFx } from "@/lib/display";

/**
 * Platform-wide audio-reactive border (Phase E — the visual hook). A full-viewport,
 * click-through overlay that frames the whole app in a soft edge glow which breathes
 * with the currently-playing track: thickness/brightness track overall energy, a
 * transient "pop" fires on beats, and the colour comes from the track's seeded
 * palette. Completely dormant (no canvas work, invisible) when nothing is playing;
 * fades out on pause; respects reduced-motion. Only the edges paint, so the centre
 * stays clear and interaction is never blocked.
 */
export function ReactiveFrame() {
  const { track, playing } = usePlayer();
  const reduce = useReduceFx();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const seed = track?.seed ?? 1;
  const accent = track?.accent ?? "#a87cf8";

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const [c0, c1, c2] = paletteFor(seed);

    let w = 0, h = 0, dpr = 1;
    const resize = () => {
      dpr = Math.min(2, window.devicePixelRatio || 1);
      w = window.innerWidth; h = window.innerHeight;
      canvas.width = Math.floor(w * dpr); canvas.height = Math.floor(h * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };
    resize();
    window.addEventListener("resize", resize);

    let raf = 0;
    let ema = 0;          // running average level → beat detection
    let intensity = 0;    // eased master intensity (fades in/out)
    let pop = 0;          // transient flash
    let t = 0;

    const glowEdge = (side: "top" | "bottom" | "left" | "right", color: string, alpha: number, depth: number) => {
      let g: CanvasGradient;
      if (side === "top") g = ctx.createLinearGradient(0, 0, 0, depth);
      else if (side === "bottom") g = ctx.createLinearGradient(0, h, 0, h - depth);
      else if (side === "left") g = ctx.createLinearGradient(0, 0, depth, 0);
      else g = ctx.createLinearGradient(w, 0, w - depth, 0);
      g.addColorStop(0, hexA(color, alpha));
      g.addColorStop(1, hexA(color, 0));
      ctx.fillStyle = g;
      if (side === "top") ctx.fillRect(0, 0, w, depth);
      else if (side === "bottom") ctx.fillRect(0, h - depth, w, depth);
      else if (side === "left") ctx.fillRect(0, 0, depth, h);
      else ctx.fillRect(w - depth, 0, depth, h);
    };

    const cornerBloom = (x: number, y: number, r: number, color: string, alpha: number) => {
      const g = ctx.createRadialGradient(x, y, 0, x, y, r);
      g.addColorStop(0, hexA(color, alpha));
      g.addColorStop(1, hexA(color, 0));
      ctx.fillStyle = g;
      ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.fill();
    };

    const draw = (targetIntensity: number) => {
      // Smooth fade in/out; fully transparent (nothing painted) unless audio plays.
      intensity += (targetIntensity - intensity) * 0.06;
      ctx.clearRect(0, 0, w, h);
      if (intensity < 0.01) return;

      const { bass, mid, high, level } = playing ? readBands() : { bass: 0, mid: 0, high: 0, level: 0 };
      // Gentle beat/transient detection on the low end.
      ema += (bass - ema) * 0.12;
      const hit = Math.max(0, bass - ema * 1.2);
      pop = Math.max(pop * 0.92, hit * 1.4);
      t += 0.016;

      const energy = Math.min(1, level * 0.9 + pop * 0.4);
      const breathe = reduce ? 0.3 : 0.5 + 0.5 * Math.sin(t * 0.8);
      // Subtle: near-invisible at rest during playback, swelling gently with energy.
      // A soft colourful glow, not a bright rim — a visual additive, not a grabber.
      const master = intensity * (0.22 + energy * 0.8 + breathe * 0.12);

      const minSide = Math.min(w, h);
      const depth = minSide * (0.08 + energy * 0.13 + pop * 0.04);

      // Phase-shifted per-edge wobble → colours flow around the frame for a
      // dynamic, living feel (each edge keeps a distinct palette colour).
      const wob = (ph: number) => 0.72 + 0.28 * Math.sin(t * 0.7 + ph);

      ctx.globalCompositeOperation = "lighter";
      glowEdge("top", c0, 0.15 * master * wob(0), depth);
      glowEdge("bottom", accent, (0.18 * master + 0.09 * pop) * wob(1.6), depth * (1 + bass * 0.4));
      glowEdge("left", c1, (0.15 * master + high * 0.09) * wob(3.1), depth * (0.9 + mid * 0.4));
      glowEdge("right", c2, (0.15 * master + high * 0.09) * wob(4.5), depth * (0.9 + mid * 0.4));
      // Corner blooms in rotating palette colours for gentle colour movement.
      const cr = minSide * (0.2 + energy * 0.16);
      cornerBloom(0, 0, cr, c1, 0.13 * master * wob(0.8));
      cornerBloom(w, 0, cr, c2, 0.13 * master * wob(2.3));
      cornerBloom(0, h, cr, accent, 0.15 * master * wob(3.8));
      cornerBloom(w, h, cr, c0, 0.15 * master * wob(5.2));
      // Whisper-thin rim only — just enough to define the edge, never grabby.
      ctx.globalCompositeOperation = "source-over";
      const rimW = 1.5 + energy * 2 + pop * 2.5;
      ctx.lineWidth = rimW;
      ctx.strokeStyle = hexA(accent, Math.min(0.35, 0.1 * master + 0.12 * pop));
      ctx.strokeRect(rimW / 2, rimW / 2, Math.max(0, w - rimW), Math.max(0, h - rimW));
    };

    const tick = () => {
      const target = playing ? 1 : 0;
      draw(target);
      // Keep the loop alive while playing, or briefly to ease out on pause; then rest.
      if (playing || intensity > 0.02) raf = requestAnimationFrame(tick);
    };

    if (reduce) draw(playing ? 1 : 0); // one static frame, no loop
    else raf = requestAnimationFrame(tick);

    return () => { cancelAnimationFrame(raf); window.removeEventListener("resize", resize); };
  }, [playing, seed, accent, reduce]);

  return (
    <canvas
      ref={canvasRef}
      aria-hidden="true"
      className="pointer-events-none fixed inset-0 z-[60] h-full w-full"
    />
  );
}

function hexA(hex: string, a: number): string {
  const m = hex.replace("#", "");
  if (m.length < 6) return hex;
  const r = parseInt(m.slice(0, 2), 16), g = parseInt(m.slice(2, 4), 16), b = parseInt(m.slice(4, 6), 16);
  return `rgba(${r}, ${g}, ${b}, ${Math.max(0, Math.min(1, a))})`;
}

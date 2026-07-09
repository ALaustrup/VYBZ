import { useEffect, useRef } from "react";
import { usePlayer, readBands } from "@/lib/audioBus";
import { paletteFor } from "@/lib/utils";

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
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const seed = track?.seed ?? 1;
  const accent = track?.accent ?? "#a87cf8";

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const reduce = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches ?? false;
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
      intensity += (targetIntensity - intensity) * 0.08;
      ctx.clearRect(0, 0, w, h);
      if (intensity < 0.01) return;

      const { bass, mid, high, level } = playing ? readBands() : { bass: 0, mid: 0, high: 0, level: reduce ? 0.15 : 0 };
      // Beat/transient detection on the low end.
      ema += (bass - ema) * 0.15;
      const hit = Math.max(0, bass - ema * 1.15);
      pop = Math.max(pop * 0.9, hit * 2.2);
      t += 0.016;

      const energy = Math.min(1, level * 0.9 + pop * 0.5);
      const breathe = reduce ? 0 : 0.5 + 0.5 * Math.sin(t * 1.1);
      const master = intensity * (0.35 + energy * 0.8 + breathe * 0.08);

      const minSide = Math.min(w, h);
      const depth = minSide * (0.06 + energy * 0.12 + pop * 0.05);

      ctx.globalCompositeOperation = "lighter";
      // Edges: warmer accent on top/bottom, palette variety on the sides.
      glowEdge("top", accent, 0.10 * master + 0.05 * pop, depth);
      glowEdge("bottom", accent, 0.12 * master + 0.06 * pop, depth * (1 + bass * 0.4));
      glowEdge("left", c1, 0.09 * master + high * 0.05, depth * (0.8 + mid * 0.5));
      glowEdge("right", c2, 0.09 * master + high * 0.05, depth * (0.8 + mid * 0.5));
      // Corner blooms cycle through the palette for colour movement.
      const cr = minSide * (0.18 + energy * 0.14);
      cornerBloom(0, 0, cr, c1, 0.10 * master);
      cornerBloom(w, 0, cr, c2, 0.10 * master);
      cornerBloom(0, h, cr, accent, 0.12 * master);
      cornerBloom(w, h, cr, c0, 0.12 * master);
      ctx.globalCompositeOperation = "source-over";
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
  }, [playing, seed, accent]);

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

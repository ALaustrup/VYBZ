import { useEffect, useRef } from "react";
import { usePlayer, readBands, readFrequencies, frequencyBinCount } from "@/lib/audioBus";
import { resolvePlaybackVisuals } from "@/lib/playbackCustomization";
import { useFxScale } from "@/lib/display";

/**
 * Outline-first audio-reactive chrome. Strokes the viewport edges (and optional
 * hairline dashes) from the poster’s PostFx — no foggy fills. Click-through.
 * Uploader playback_customization overrides listener defaults while a track plays.
 */
export function ReactiveFrame() {
  const { track, playing } = usePlayer();
  const fxScale = useFxScale();
  const reduce = fxScale === 0;
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const visuals = resolvePlaybackVisuals({
    seed: track?.seed,
    accent: track?.accent,
    fx: track?.fx,
    playback: track?.playback,
  });
  const { seed, accent, fx, palette: pal } = visuals;

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let w = 0, h = 0, dpr = 1;
    const resize = () => {
      dpr = Math.min(2, window.devicePixelRatio || 1);
      w = window.innerWidth; h = window.innerHeight;
      canvas.width = Math.floor(w * dpr); canvas.height = Math.floor(h * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };
    resize();
    window.addEventListener("resize", resize);

    let raf = 0, ema = 0, intensity = 0, pop = 0, t = 0;
    let dashOffset = 0;
    const freq = new Uint8Array(frequencyBinCount());
    const inset = 10;
    const radius = 18;

    const strokeRoundRect = (alpha: number, width: number, color: string, dash?: number[]) => {
      if (alpha < 0.01) return;
      ctx.save();
      ctx.strokeStyle = hexA(color, alpha);
      ctx.lineWidth = width;
      if (dash) ctx.setLineDash(dash);
      ctx.beginPath();
      const x = inset, y = inset, rw = w - inset * 2, rh = h - inset * 2, r = radius;
      ctx.moveTo(x + r, y);
      ctx.arcTo(x + rw, y, x + rw, y + rh, r);
      ctx.arcTo(x + rw, y + rh, x, y + rh, r);
      ctx.arcTo(x, y + rh, x, y, r);
      ctx.arcTo(x, y, x + rw, y, r);
      ctx.closePath();
      ctx.stroke();
      ctx.restore();
    };

    const edgeSegments = (energy: number, master: number) => {
      // Thin corner brackets instead of bloom fills
      const len = 28 + energy * 36;
      const a = 0.35 * master + energy * 0.25;
      const drawCorner = (x0: number, y0: number, dx: number, dy: number, color: string) => {
        ctx.strokeStyle = hexA(color, a);
        ctx.lineWidth = 1.5 + energy;
        ctx.beginPath();
        ctx.moveTo(x0, y0 + dy * len);
        ctx.lineTo(x0, y0);
        ctx.lineTo(x0 + dx * len, y0);
        ctx.stroke();
      };
      drawCorner(inset, inset, 1, 1, pal[0]);
      drawCorner(w - inset, inset, -1, 1, pal[1]);
      drawCorner(inset, h - inset, 1, -1, pal[2]);
      drawCorner(w - inset, h - inset, -1, -1, accent);
    };

    const draw = (target: number) => {
      intensity += (target - intensity) * 0.08;
      ctx.clearRect(0, 0, w, h);
      if (intensity < 0.01 || fx === "off") return;
      const b = playing ? readBands() : { bass: 0, mid: 0, high: 0, level: 0 };
      ema += (b.bass - ema) * 0.12;
      pop = Math.max(pop * 0.92, Math.max(0, b.bass - ema * 1.2) * 1.5);
      t += 0.016;
      const energy = Math.min(1, b.level * 1.1 + pop * 0.5);
      const master = intensity * (0.45 + energy * 0.9) * fxScale;

      document.documentElement.style.setProperty("--reactive-line", hexA(accent, 0.25 + energy * 0.35 * master));
      document.documentElement.style.setProperty("--reactive-line-strong", hexA(accent, 0.4 + energy * 0.4 * master));

      if (fx === "aurora") {
        // Slow hue-shifting outline only
        const huePal = [pal[Math.floor(t) % 4], pal[Math.floor(t + 1) % 4]];
        strokeRoundRect(0.2 * master + energy * 0.15, 1.25, huePal[0]);
        strokeRoundRect(0.12 * master, 1, huePal[1], [6, 10]);
        ctx.lineDashOffset = -t * 18;
      } else if (fx === "pulse") {
        const breathe = 0.55 + 0.45 * Math.sin(t * 3 + pop * 4);
        strokeRoundRect((0.22 + pop * 0.45) * master * breathe, 1.5 + pop * 2, accent);
        edgeSegments(energy, master);
      } else if (fx === "bars") {
        readFrequencies(freq);
        const n = Math.min(64, freq.length);
        const usable = w - inset * 2;
        const bw = usable / n;
        ctx.lineWidth = 1.5;
        for (let i = 0; i < n; i++) {
          const v = (freq[Math.floor(i * (freq.length / n))] / 255) || 0;
          const bh = 4 + v * 22 * master;
          ctx.strokeStyle = hexA(pal[i % 4], (0.2 + v * 0.55) * master);
          const x = inset + i * bw + bw * 0.5;
          ctx.beginPath();
          ctx.moveTo(x, h - inset);
          ctx.lineTo(x, h - inset - bh);
          ctx.stroke();
          ctx.beginPath();
          ctx.moveTo(x, inset);
          ctx.lineTo(x, inset + bh * 0.7);
          ctx.stroke();
        }
        strokeRoundRect(0.12 * master, 1, accent);
      } else if (fx === "ripple") {
        dashOffset -= 1.8 + energy * 4;
        ctx.lineDashOffset = dashOffset;
        strokeRoundRect(0.28 * master + pop * 0.25, 1.35, accent, [10, 14]);
        strokeRoundRect(0.14 * master, 1, pal[1], [4, 12]);
        edgeSegments(energy * 0.6, master);
      } else {
        // glow → crisp dual outline
        const wob = 0.75 + 0.25 * Math.sin(t * 0.9);
        strokeRoundRect((0.18 + energy * 0.2) * master * wob, 1.25 + b.bass * 1.2, accent);
        strokeRoundRect(0.1 * master, 1, pal[1], [2, 8]);
        edgeSegments(energy, master * 0.85);
      }
    };

    const tick = () => {
      draw(playing ? 1 : 0);
      if (playing || intensity > 0.02) raf = requestAnimationFrame(tick);
      else document.documentElement.style.removeProperty("--reactive-line");
    };
    if (reduce) draw(playing ? 0.5 : 0);
    else raf = requestAnimationFrame(tick);

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", resize);
      document.documentElement.style.removeProperty("--reactive-line");
      document.documentElement.style.removeProperty("--reactive-line-strong");
    };
  }, [playing, seed, accent, fx, pal, reduce, fxScale]);

  return <canvas ref={canvasRef} aria-hidden="true" className="pointer-events-none fixed inset-0 z-[60] h-full w-full" />;
}

function hexA(hex: string, a: number): string {
  const m = hex.replace("#", "");
  if (m.length < 6) return hex;
  const r = parseInt(m.slice(0, 2), 16), g = parseInt(m.slice(2, 4), 16), b = parseInt(m.slice(4, 6), 16);
  return `rgba(${r}, ${g}, ${b}, ${Math.max(0, Math.min(1, a))})`;
}

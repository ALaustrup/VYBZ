import { useEffect, useRef } from "react";
import { usePlayer, readBands, readFrequencies, frequencyBinCount } from "@/lib/audioBus";
import { paletteFor } from "@/lib/utils";
import { useFxScale } from "@/lib/display";

/**
 * Platform-wide audio-reactive frame. A full-viewport, click-through overlay that
 * frames the app and reacts to whatever is playing — using the POSTER'S chosen
 * effect (`track.fx`): glow / aurora / pulse / bars / ripple (or off). Colour comes
 * from the post/track accent + seeded palette. Fully transparent when idle; fades
 * on pause; honours reduced-motion. Only the edges paint, so interaction is free.
 */
export function ReactiveFrame() {
  const { track, playing } = usePlayer();
  const fxScale = useFxScale(); // 0 = off/reduced, 0.6 = subtle (default), 1 = full
  const reduce = fxScale === 0;
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const seed = track?.seed ?? 1;
  const accent = track?.accent ?? "#a87cf8";
  const fx = track?.fx ?? "glow";

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const [c0, c1, c2] = paletteFor(seed);
    const pal = [accent, c0, c1, c2];

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
    let ripples: { r: number; a: number }[] = [];
    const freq = new Uint8Array(frequencyBinCount());

    const edge = (side: "top" | "bottom" | "left" | "right", color: string, alpha: number, depth: number) => {
      let g: CanvasGradient;
      if (side === "top") g = ctx.createLinearGradient(0, 0, 0, depth);
      else if (side === "bottom") g = ctx.createLinearGradient(0, h, 0, h - depth);
      else if (side === "left") g = ctx.createLinearGradient(0, 0, depth, 0);
      else g = ctx.createLinearGradient(w, 0, w - depth, 0);
      g.addColorStop(0, hexA(color, alpha)); g.addColorStop(1, hexA(color, 0));
      ctx.fillStyle = g;
      if (side === "top") ctx.fillRect(0, 0, w, depth);
      else if (side === "bottom") ctx.fillRect(0, h - depth, w, depth);
      else if (side === "left") ctx.fillRect(0, 0, depth, h);
      else ctx.fillRect(w - depth, 0, depth, h);
    };
    const bloom = (x: number, y: number, r: number, color: string, alpha: number) => {
      const g = ctx.createRadialGradient(x, y, 0, x, y, Math.max(1, r));
      g.addColorStop(0, hexA(color, alpha)); g.addColorStop(1, hexA(color, 0));
      ctx.fillStyle = g; ctx.beginPath(); ctx.arc(x, y, Math.max(1, r), 0, Math.PI * 2); ctx.fill();
    };

    const draw = (target: number) => {
      intensity += (target - intensity) * 0.06;
      ctx.clearRect(0, 0, w, h);
      if (intensity < 0.01 || fx === "off") return;
      const b = playing ? readBands() : { bass: 0, mid: 0, high: 0, level: 0 };
      ema += (b.bass - ema) * 0.12;
      pop = Math.max(pop * 0.92, Math.max(0, b.bass - ema * 1.2) * 1.5);
      t += 0.016;
      const energy = Math.min(1, b.level * 1.1 + pop * 0.5);
      // Present while playing, swelling with energy — scaled by the creator's
      // intensity preference (subtle by default) so it's a hook, never a klaxon.
      const master = intensity * (0.55 + energy * 1.1) * fxScale;
      const minSide = Math.min(w, h);
      ctx.globalCompositeOperation = "lighter";

      if (fx === "aurora") {
        // Drifting colour bands hugging the top & bottom — flowing, alive.
        for (let i = 0; i < 4; i++) {
          const cx = w * (0.2 + 0.2 * i) + Math.sin(t * 0.5 + i) * w * 0.15;
          const r = minSide * (0.34 + energy * 0.24) * (0.8 + 0.2 * Math.sin(t + i));
          bloom(cx, -r * 0.15, r, pal[i % 4], (0.24 + energy * 0.2) * master);
          bloom(w - cx, h + r * 0.15, r, pal[(i + 2) % 4], (0.24 + energy * 0.2) * master);
        }
      } else if (fx === "pulse") {
        // Radial pulses that swell hard on the beat, from corners + edge mids.
        const cr = minSide * (0.26 + energy * 0.3 + pop * 0.35);
        const pts: [number, number][] = [[0, 0], [w, 0], [0, h], [w, h], [w / 2, 0], [w / 2, h]];
        pts.forEach((p, i) => bloom(p[0], p[1], cr * (0.7 + 0.3 * Math.sin(t * 2 + i)), pal[i % 4], (0.3 + pop * 0.6) * master));
      } else if (fx === "bars") {
        // Edge spectrum: frequency bars marching along the bottom (mirrored top).
        readFrequencies(freq);
        const n = Math.min(48, freq.length);
        const bw = w / n;
        for (let i = 0; i < n; i++) {
          const v = (freq[Math.floor(i * (freq.length / n))] / 255) || 0;
          const bh = v * minSide * 0.22 * (0.5 + master);
          const col = pal[i % 4];
          const gb = ctx.createLinearGradient(0, h, 0, h - bh);
          gb.addColorStop(0, hexA(col, 0.5 * master + 0.2 * v)); gb.addColorStop(1, hexA(col, 0));
          ctx.fillStyle = gb; ctx.fillRect(i * bw, h - bh, bw + 1, bh);
          const gt = ctx.createLinearGradient(0, 0, 0, bh);
          gt.addColorStop(0, hexA(pal[(i + 2) % 4], 0.4 * master + 0.15 * v)); gt.addColorStop(1, hexA(pal[(i + 2) % 4], 0));
          ctx.fillStyle = gt; ctx.fillRect(w - (i + 1) * bw, 0, bw + 1, bh);
        }
      } else if (fx === "ripple") {
        // Concentric rings spawned on beats, expanding from centre.
        if (pop > 0.12 && (ripples.length === 0 || ripples[ripples.length - 1].r > minSide * 0.12)) ripples.push({ r: 0, a: 1 });
        ripples = ripples.filter((rp) => rp.a > 0.02);
        ctx.globalCompositeOperation = "lighter";
        ripples.forEach((rp, i) => {
          rp.r += minSide * 0.012; rp.a *= 0.972;
          ctx.beginPath(); ctx.arc(w / 2, h / 2, rp.r, 0, Math.PI * 2);
          ctx.strokeStyle = hexA(pal[i % 4], rp.a * 0.5 * master); ctx.lineWidth = 2 + energy * 3; ctx.stroke();
        });
        // soft base glow so it's never empty
        edge("top", accent, 0.06 * master, minSide * 0.06);
        edge("bottom", accent, 0.06 * master, minSide * 0.06);
      } else {
        // "glow" (default): subtle, colourful, phase-shifted edge glow.
        const wob = (ph: number) => 0.72 + 0.28 * Math.sin(t * 0.7 + ph);
        const depth = minSide * (0.08 + energy * 0.13 + pop * 0.04);
        edge("top", c0, 0.15 * master * wob(0), depth);
        edge("bottom", accent, (0.18 * master + 0.09 * pop) * wob(1.6), depth * (1 + b.bass * 0.4));
        edge("left", c1, (0.15 * master + b.high * 0.09) * wob(3.1), depth * (0.9 + b.mid * 0.4));
        edge("right", c2, (0.15 * master + b.high * 0.09) * wob(4.5), depth * (0.9 + b.mid * 0.4));
        const cr = minSide * (0.2 + energy * 0.16);
        bloom(0, 0, cr, c1, 0.13 * master * wob(0.8));
        bloom(w, h, cr, accent, 0.15 * master * wob(5.2));
      }
    };

    const tick = () => {
      draw(playing ? 1 : 0);
      if (playing || intensity > 0.02) raf = requestAnimationFrame(tick);
    };
    if (reduce) draw(playing ? 1 : 0);
    else raf = requestAnimationFrame(tick);

    return () => { cancelAnimationFrame(raf); window.removeEventListener("resize", resize); };
  }, [playing, seed, accent, fx, reduce, fxScale]);

  return <canvas ref={canvasRef} aria-hidden="true" className="pointer-events-none fixed inset-0 z-[60] h-full w-full" />;
}

function hexA(hex: string, a: number): string {
  const m = hex.replace("#", "");
  if (m.length < 6) return hex;
  const r = parseInt(m.slice(0, 2), 16), g = parseInt(m.slice(2, 4), 16), b = parseInt(m.slice(4, 6), 16);
  return `rgba(${r}, ${g}, ${b}, ${Math.max(0, Math.min(1, a))})`;
}

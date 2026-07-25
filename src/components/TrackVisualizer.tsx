import { useEffect, useRef } from "react";
import { frequencyBinCount, readFrequencies } from "@/lib/audioBus";
import { sampleReactiveFrame } from "@/lib/reactiveVisualRuntime";
import { paletteFor, cx } from "@/lib/utils";
import { useReduceFx } from "@/lib/display";

interface TrackVisualizerProps {
  /** Deterministic seed → each track gets a unique style + palette + motion. */
  seed: number;
  /** Accent hex (primary palette colour) for the bloom. */
  accent?: string;
  /** True when THIS track is the one currently playing (drives reactivity). */
  active?: boolean;
  className?: string;
}

/** Number of styles in the seeded visualizer library. */
const STYLES = 4;

/**
 * Seeded generative visualizer LIBRARY (Phase E). The track's seed selects one of
 * several distinct styles — organic rings, a mirrored spectrum, orbiting particles,
 * or flowing ribbons — and seeds its palette, geometry and motion, so no two tracks
 * look alike. When the track is the active playback it reacts to live bass/mid/high
 * energy from the shared AudioBus; otherwise it paints a single calm frame (zero
 * idle cost). Respects reduced-motion.
 */
export function TrackVisualizer({ seed, accent = "#a87cf8", active = false, className }: TrackVisualizerProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const rafRef = useRef<number>(0);
  const freqRef = useRef<Uint8Array>(new Uint8Array(frequencyBinCount()));
  const reduce = useReduceFx();

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const palette = paletteFor(seed);
    const p0 = accent || palette[0];

    // Seeded PRNG + params shared by every style.
    let s = (seed >>> 0) || 1;
    const rnd = () => { s = (s * 1664525 + 1013904223) >>> 0; return s / 0xffffffff; };
    const style = (seed >>> 0) % STYLES;
    const rings = 3 + Math.floor(rnd() * 3);
    const phase = rnd() * Math.PI * 2;
    const drift = 0.15 + rnd() * 0.5;
    const skew = 0.6 + rnd() * 0.8;
    const orbits = Array.from({ length: 5 + Math.floor(rnd() * 4) }, () => ({
      a: rnd() * Math.PI * 2, sp: (0.2 + rnd() * 0.8) * (rnd() > 0.5 ? 1 : -1),
      rx: 0.25 + rnd() * 0.5, ry: 0.2 + rnd() * 0.45, sz: 1.5 + rnd() * 3, col: palette[Math.floor(rnd() * 3)],
    }));
    const ribbons = Array.from({ length: 3 }, (_, i) => ({
      off: rnd() * Math.PI * 2, freq: 1 + rnd() * 2, amp: 0.12 + rnd() * 0.16, col: palette[i % 3], yo: 0.35 + i * 0.15,
    }));

    let w = 300, h = 200;
    const resize = () => {
      const parent = canvas.parentElement;
      w = parent?.clientWidth ?? 300; h = parent?.clientHeight ?? 200;
      const dpr = Math.min(2, window.devicePixelRatio || 1);
      canvas.width = w * dpr; canvas.height = h * dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };
    resize();
    window.addEventListener("resize", resize);

    let t = 0;
    const frame = () => {
      const animate = active && !reduce;
      t += animate ? 0.016 : 0;
      let bass = 0, mid = 0, high = 0, level = 0, beat = 0;
      if (active) {
        const b = sampleReactiveFrame(true);
        bass = b.bass; mid = b.mid; high = b.high; level = b.level; beat = b.beat;
      }
      const pulse = reduce ? 0.12 : 0.1 + level * 0.85 + beat * 0.35;

      ctx.clearRect(0, 0, w, h);
      const bg = ctx.createRadialGradient(w / 2, h * 0.55, 0, w / 2, h * 0.55, Math.max(w, h) * 0.75);
      bg.addColorStop(0, "rgba(255,255,255,0.02)");
      bg.addColorStop(1, "rgba(6,8,16,0)");
      ctx.fillStyle = bg; ctx.fillRect(0, 0, w, h);
      ctx.globalCompositeOperation = "lighter";

      if (style === 0) drawRings(ctx, w, h, t, palette, p0, pulse, rings, phase, drift, skew);
      else if (style === 1) drawBars(ctx, w, h, t, palette, active ? readFreq(freqRef.current) : null, pulse, reduce);
      else if (style === 2) drawOrbits(ctx, w, h, t, orbits, bass, level, animate);
      else drawRibbons(ctx, w, h, t, ribbons, mid, high, pulse);

      ctx.globalCompositeOperation = "source-over";
      if (!active || reduce) return;
      rafRef.current = requestAnimationFrame(frame);
    };
    frame();

    return () => { cancelAnimationFrame(rafRef.current); window.removeEventListener("resize", resize); };
  }, [seed, accent, active, reduce]);

  return <canvas ref={canvasRef} className={cx("h-full w-full", className)} aria-hidden />;
}

function readFreq(buf: Uint8Array): Uint8Array {
  readFrequencies(buf);
  return buf;
}

// ── Styles ───────────────────────────────────────────────────────────────────
function drawRings(ctx: CanvasRenderingContext2D, w: number, h: number, t: number, palette: string[], accent: string, pulse: number, rings: number, phase: number, drift: number, skew: number) {
  const cx0 = w / 2, cy0 = h / 2;
  for (let r = 0; r < rings; r++) {
    const base = (Math.min(w, h) / 2) * (0.28 + (r / rings) * 0.6);
    const wobble = base * (1 + pulse * (0.18 + r * 0.05));
    const spin = phase + t * drift * (r % 2 ? -1 : 1);
    ctx.beginPath();
    for (let a = 0; a <= Math.PI * 2 + 0.1; a += 0.14) {
      const rad = wobble * (1 + 0.06 * Math.sin(a * (2 + r) * skew + spin) + pulse * 0.08 * Math.sin(a * 3 + t));
      const x = cx0 + Math.cos(a) * rad, y = cy0 + Math.sin(a) * rad * 0.92;
      a === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
    }
    ctx.closePath();
    ctx.strokeStyle = hexA(palette[r % 3] || accent, 0.05 + (1 - r / rings) * (0.09 + pulse * 0.13));
    ctx.lineWidth = 1 + pulse * 1.8; ctx.stroke();
  }
}

function drawBars(ctx: CanvasRenderingContext2D, w: number, h: number, t: number, palette: string[], freq: Uint8Array | null, pulse: number, reduce: boolean) {
  const N = Math.max(18, Math.min(40, Math.floor(w / 10)));
  const half = Math.floor(N / 2);
  const gap = 2, bw = (w / N) - gap;
  for (let i = 0; i < half; i++) {
    // Log-ish mapping into the low-mid bins for a musical spectrum.
    let v: number;
    if (freq) { const bin = Math.floor(Math.pow(i / half, 1.6) * (freq.length * 0.55)); v = freq[bin] / 255; }
    else v = 0.08 + 0.06 * Math.sin(i * 0.7 + t) * (reduce ? 0 : 1);
    const bh = Math.max(2, v * h * 0.8 * (0.7 + pulse * 0.6));
    const col = palette[i % 3];
    for (const dir of [-1, 1]) {
      const x = w / 2 + dir * (i + 0.5) * (bw + gap) - bw / 2;
      const g = ctx.createLinearGradient(0, h, 0, h - bh);
      g.addColorStop(0, hexA(col, 0.08)); g.addColorStop(1, hexA(col, 0.55));
      ctx.fillStyle = g; ctx.fillRect(x, h - bh, bw, bh);
    }
  }
}

function drawOrbits(ctx: CanvasRenderingContext2D, w: number, h: number, t: number, orbits: { a: number; sp: number; rx: number; ry: number; sz: number; col: string }[], bass: number, level: number, animate: boolean) {
  const cx0 = w / 2, cy0 = h / 2, R = Math.min(w, h) / 2;
  for (const o of orbits) {
    const ang = o.a + (animate ? t * o.sp : 0);
    const rr = 1 + bass * 0.6;
    const x = cx0 + Math.cos(ang) * R * o.rx * rr, y = cy0 + Math.sin(ang) * R * o.ry * rr;
    const size = o.sz * (1 + level * 1.6);
    const g = ctx.createRadialGradient(x, y, 0, x, y, size * 4);
    g.addColorStop(0, hexA(o.col, 0.5)); g.addColorStop(1, hexA(o.col, 0));
    ctx.fillStyle = g; ctx.beginPath(); ctx.arc(x, y, size * 4, 0, Math.PI * 2); ctx.fill();
  }
}

function drawRibbons(ctx: CanvasRenderingContext2D, w: number, h: number, t: number, ribbons: { off: number; freq: number; amp: number; col: string; yo: number }[], mid: number, high: number, pulse: number) {
  for (const rb of ribbons) {
    const amp = h * (rb.amp + mid * 0.14 + high * 0.06);
    ctx.beginPath();
    for (let x = 0; x <= w; x += 6) {
      const px = x / w;
      const y = h * rb.yo + Math.sin(px * Math.PI * 2 * rb.freq + t * 0.9 + rb.off) * amp * (0.6 + pulse * 0.6);
      x === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
    }
    ctx.strokeStyle = hexA(rb.col, 0.12 + pulse * 0.22);
    ctx.lineWidth = 1.5 + pulse * 2.4; ctx.stroke();
  }
}

function hexA(hex: string, alpha: number): string {
  if (hex.startsWith("#") && hex.length >= 7) {
    const r = parseInt(hex.slice(1, 3), 16), g = parseInt(hex.slice(3, 5), 16), b = parseInt(hex.slice(5, 7), 16);
    return `rgba(${r}, ${g}, ${b}, ${alpha})`;
  }
  return hex;
}

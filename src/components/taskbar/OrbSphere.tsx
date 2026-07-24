import { useEffect, useMemo, useRef } from "react";
import { readBands, readFrequencies, frequencyBinCount, usePlayer } from "@/lib/audioBus";
import { useFxScale, useReduceFx } from "@/lib/display";
import { resolvePlaybackVisuals } from "@/lib/playbackCustomization";
import { cx } from "@/lib/utils";
import type { PostFx } from "@/types";

interface OrbSphereProps {
  open: boolean;
  flash: boolean;
  onClick: () => void;
  className?: string;
}

/**
 * Canvas Orb — primary audio-reactive surface. Morphs (sphere / blob / ring /
 * bars / liquid) from frequency bands + uploader playback_customization.
 */
export function OrbSphere({ open, flash, onClick, className }: OrbSphereProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const wrapRef = useRef<HTMLButtonElement>(null);
  const { playing, track } = usePlayer();
  const reduce = useReduceFx();
  const fxScale = useFxScale();
  const visuals = useMemo(
    () => resolvePlaybackVisuals({
      seed: track?.seed,
      accent: track?.accent,
      fx: track?.fx,
      playback: track?.playback,
    }),
    [track?.seed, track?.accent, track?.fx, track?.playback],
  );
  const { accent, seed, palette: pal, pulseScale, rimIntensity, specularFollow, fx } = visuals;
  const palKey = pal.join(",");

  useEffect(() => {
    const canvas = canvasRef.current;
    const wrap = wrapRef.current;
    if (!canvas || !wrap) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const colors = palKey.split(",");
    const freq = new Uint8Array(frequencyBinCount());

    const SIZE = 72;
    let dpr = 1;
    const resize = () => {
      dpr = Math.min(2, window.devicePixelRatio || 1);
      canvas.width = Math.floor(SIZE * dpr);
      canvas.height = Math.floor(SIZE * dpr);
      canvas.style.width = `${SIZE}px`;
      canvas.style.height = `${SIZE}px`;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };
    resize();

    const ptr = { x: SIZE * 0.38, y: SIZE * 0.32, tx: SIZE * 0.38, ty: SIZE * 0.32, inside: false };
    const onMove = (e: PointerEvent) => {
      const r = wrap.getBoundingClientRect();
      const cx = e.clientX - r.left;
      const cy = e.clientY - r.top;
      const dx = cx - r.width / 2;
      const dy = cy - r.height / 2;
      const hit = Math.hypot(dx, dy) < r.width * 0.55;
      ptr.inside = hit;
      if (hit && specularFollow) {
        ptr.tx = SIZE * 0.5 + dx * 0.55;
        ptr.ty = SIZE * 0.5 + dy * 0.55;
      } else {
        ptr.tx = SIZE * 0.38;
        ptr.ty = SIZE * 0.32;
      }
    };
    const onLeave = () => {
      ptr.inside = false;
      ptr.tx = SIZE * 0.38;
      ptr.ty = SIZE * 0.32;
    };
    window.addEventListener("pointermove", onMove);
    wrap.addEventListener("pointerleave", onLeave);

    let raf = 0;
    let t = 0;
    let flashA = 0;
    let hidden = document.hidden;
    const onVis = () => { hidden = document.hidden; };

    const morph = morphMode(fx);

    const draw = () => {
      if (hidden) {
        raf = requestAnimationFrame(draw);
        return;
      }
      t += 0.016;
      ptr.x += (ptr.tx - ptr.x) * 0.14;
      ptr.y += (ptr.ty - ptr.y) * 0.14;
      if (flash) flashA = 1;
      else flashA *= 0.88;

      const bands = playing && !reduce ? readBands() : { bass: 0, mid: 0, high: 0, level: 0 };
      if (playing && !reduce) readFrequencies(freq);
      const pulse = reduce
        ? (playing ? 0.12 : 0)
        : (bands.bass * 0.55 + bands.level * 0.35) * fxScale * (0.35 + pulseScale * 1.2);
      const R = SIZE * 0.38 + pulse * 4;
      const cx = SIZE / 2;
      const cy = SIZE / 2;

      ctx.clearRect(0, 0, SIZE, SIZE);

      // Soft aura — subtle, not a chrome outline
      if ((ptr.inside || open || playing) && !reduce) {
        const rim = ctx.createRadialGradient(cx, cy, R * 0.55, cx, cy, R * 1.65);
        const rimA = (0.05 + pulse * 0.22) * (0.35 + rimIntensity * 1.15);
        rim.addColorStop(0, hexA(colors[0], rimA));
        rim.addColorStop(0.55, hexA(colors[1], rimA * 0.55));
        rim.addColorStop(1, hexA(colors[2], 0));
        ctx.fillStyle = rim;
        ctx.beginPath();
        ctx.arc(cx, cy, R * 1.65, 0, Math.PI * 2);
        ctx.fill();
      }

      // Morphing body silhouette
      ctx.save();
      pathMorph(ctx, morph, cx, cy, R, t, bands, freq, pulse);
      ctx.clip();

      const body = ctx.createRadialGradient(ptr.x, ptr.y, R * 0.05, cx, cy, R * 1.05);
      body.addColorStop(0, flashA > 0.05 ? `rgba(255,255,255,${0.95 * flashA + 0.55})` : "#f4efff");
      body.addColorStop(0.35, hexA(colors[0], 0.85));
      body.addColorStop(0.72, hexA(colors[1], 0.95));
      body.addColorStop(1, "#1a1528");
      ctx.fillStyle = body;
      ctx.fillRect(0, 0, SIZE, SIZE);

      const spec = ctx.createRadialGradient(ptr.x, ptr.y, 0, ptr.x, ptr.y, R * 0.45);
      spec.addColorStop(0, `rgba(255,255,255,${0.55 + flashA * 0.4})`);
      spec.addColorStop(1, "rgba(255,255,255,0)");
      ctx.fillStyle = spec;
      ctx.fillRect(0, 0, SIZE, SIZE);

      if (playing && !reduce && morph === "bars") {
        const n = 12;
        for (let i = 0; i < n; i++) {
          const v = (freq[Math.floor((i / n) * freq.length)] || 0) / 255;
          const bh = (4 + v * R * 1.4) * fxScale;
          const x = cx - R * 0.7 + (i / (n - 1)) * R * 1.4;
          ctx.fillStyle = hexA(colors[i % colors.length], 0.35 + v * 0.5);
          ctx.fillRect(x - 1.5, cy + R * 0.35 - bh, 3, bh);
        }
      } else if (playing && !reduce && morph === "liquid") {
        ctx.strokeStyle = hexA(colors[Math.floor(t * 2) % colors.length], 0.3 + pulse * 0.4);
        ctx.lineWidth = 1.2;
        ctx.beginPath();
        for (let i = 0; i < 28; i++) {
          const a = (i / 28) * Math.PI * 2 + t * 0.9;
          const wob = Math.sin(a * 3 + bands.mid * 10) * (2 + pulse * 5);
          const x = cx + Math.cos(a) * (R * 0.55 + wob);
          const y = cy + Math.sin(a * 1.2) * (R * 0.35 + wob * 0.4);
          if (i === 0) ctx.moveTo(x, y);
          else ctx.lineTo(x, y);
        }
        ctx.closePath();
        ctx.stroke();
      }
      ctx.restore();

      // Thin rim on silhouette
      ctx.strokeStyle = hexA("#ffffff", 0.14 + (ptr.inside ? 0.18 : 0) + pulse * 0.12);
      ctx.lineWidth = 1.15;
      pathMorph(ctx, morph, cx, cy, R, t, bands, freq, pulse);
      ctx.stroke();

      raf = requestAnimationFrame(draw);
    };

    document.addEventListener("visibilitychange", onVis);
    raf = requestAnimationFrame(draw);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("pointermove", onMove);
      wrap.removeEventListener("pointerleave", onLeave);
      document.removeEventListener("visibilitychange", onVis);
    };
  }, [playing, accent, seed, palKey, pulseScale, rimIntensity, specularFollow, reduce, fxScale, open, flash, fx]);

  return (
    <button
      ref={wrapRef}
      type="button"
      onClick={onClick}
      aria-label={open ? "Close actions" : "Open actions"}
      aria-expanded={open}
      className={cx(
        "relative grid h-[72px] w-[72px] place-items-center rounded-full outline-none focus-visible:ring-2 focus-visible:ring-veil-400/60",
        className,
      )}
    >
      <canvas ref={canvasRef} aria-hidden className="pointer-events-none" />
    </button>
  );
}

type Morph = "sphere" | "blob" | "ring" | "bars" | "liquid";

function morphMode(fx: PostFx): Morph {
  switch (fx) {
    case "pulse": return "blob";
    case "bars": return "bars";
    case "ripple": return "ring";
    case "aurora": return "liquid";
    case "off":
    case "glow":
    default: return "sphere";
  }
}

function pathMorph(
  ctx: CanvasRenderingContext2D,
  morph: Morph,
  cx: number,
  cy: number,
  R: number,
  t: number,
  bands: { bass: number; mid: number; high: number; level: number },
  freq: Uint8Array,
  pulse: number,
) {
  ctx.beginPath();
  if (morph === "sphere" || morph === "bars") {
    ctx.arc(cx, cy, R, 0, Math.PI * 2);
    return;
  }
  if (morph === "ring") {
    const inner = R * (0.55 - pulse * 0.08);
    ctx.arc(cx, cy, R, 0, Math.PI * 2);
    ctx.arc(cx, cy, Math.max(4, inner), 0, Math.PI * 2, true);
    return;
  }
  // blob / liquid — frequency-warped circle
  const n = 48;
  for (let i = 0; i <= n; i++) {
    const a = (i / n) * Math.PI * 2;
    const fi = Math.floor(((i / n) * freq.length)) % Math.max(1, freq.length);
    const f = (freq[fi] || 0) / 255;
    const warp =
      morph === "liquid"
        ? Math.sin(a * 4 + t * 2.2) * (2.5 + bands.high * 6) + f * 5 * pulse
        : Math.sin(a * 3 + t * 1.6 + bands.bass * 2) * (3 + pulse * 5) + bands.mid * 4;
    const rr = R + warp;
    const x = cx + Math.cos(a) * rr;
    const y = cy + Math.sin(a) * rr;
    if (i === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  }
  ctx.closePath();
}

function hexA(hex: string, a: number): string {
  const m = hex.replace("#", "");
  if (m.length < 6) return `rgba(168,124,248,${a})`;
  const r = parseInt(m.slice(0, 2), 16);
  const g = parseInt(m.slice(2, 4), 16);
  const b = parseInt(m.slice(4, 6), 16);
  return `rgba(${r}, ${g}, ${b}, ${Math.max(0, Math.min(1, a))})`;
}

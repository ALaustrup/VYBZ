import { useEffect, useRef } from "react";
import { readBands, usePlayer } from "@/lib/audioBus";
import { useFxScale, useReduceFx } from "@/lib/display";
import { cx, paletteFor } from "@/lib/utils";

interface OrbSphereProps {
  open: boolean;
  flash: boolean;
  onClick: () => void;
  className?: string;
}

/**
 * Canvas “fake-3D” orb — pointer-follow specular, neochrome rim in hit range,
 * audio-reactive pulse from AudioBus, white flash on open.
 */
export function OrbSphere({ open, flash, onClick, className }: OrbSphereProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const wrapRef = useRef<HTMLButtonElement>(null);
  const { playing, track } = usePlayer();
  const reduce = useReduceFx();
  const fxScale = useFxScale();
  const accent = track?.accent ?? "#a87cf8";
  const seed = track?.seed ?? 1;

  useEffect(() => {
    const canvas = canvasRef.current;
    const wrap = wrapRef.current;
    if (!canvas || !wrap) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

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
      if (hit) {
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

    const [c0, c1, c2] = paletteFor(seed);
    const pal = [accent, c0, c1, c2];

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
      const pulse = reduce ? (playing ? 0.12 : 0) : (bands.bass * 0.55 + bands.level * 0.35) * fxScale;
      const R = SIZE * 0.38 + pulse * 4;
      const cx = SIZE / 2;
      const cy = SIZE / 2;

      ctx.clearRect(0, 0, SIZE, SIZE);

      // Soft outer neon rim when hovered / open
      if (ptr.inside || open) {
        const rim = ctx.createRadialGradient(cx, cy, R * 0.7, cx, cy, R * 1.55);
        const hueShift = (t * 40) % 360;
        rim.addColorStop(0, `hsla(${280 + hueShift * 0.05}, 80%, 70%, ${0.08 + pulse * 0.2})`);
        rim.addColorStop(0.55, hexA(pal[0], 0.22 + pulse * 0.25));
        rim.addColorStop(1, hexA(pal[2], 0));
        ctx.fillStyle = rim;
        ctx.beginPath();
        ctx.arc(cx, cy, R * 1.55, 0, Math.PI * 2);
        ctx.fill();
      }

      // Sphere body
      const body = ctx.createRadialGradient(ptr.x, ptr.y, R * 0.05, cx, cy, R);
      body.addColorStop(0, flashA > 0.05 ? `rgba(255,255,255,${0.95 * flashA + 0.55})` : "#f4efff");
      body.addColorStop(0.35, hexA(pal[0], 0.85));
      body.addColorStop(0.72, hexA(pal[1], 0.95));
      body.addColorStop(1, "#1a1528");
      ctx.fillStyle = body;
      ctx.beginPath();
      ctx.arc(cx, cy, R, 0, Math.PI * 2);
      ctx.fill();

      // Specular
      const spec = ctx.createRadialGradient(ptr.x, ptr.y, 0, ptr.x, ptr.y, R * 0.45);
      spec.addColorStop(0, `rgba(255,255,255,${0.55 + flashA * 0.4})`);
      spec.addColorStop(1, "rgba(255,255,255,0)");
      ctx.fillStyle = spec;
      ctx.beginPath();
      ctx.arc(cx, cy, R, 0, Math.PI * 2);
      ctx.fill();

      // Equator shimmer (audio)
      if (playing && !reduce) {
        ctx.save();
        ctx.beginPath();
        ctx.arc(cx, cy, R, 0, Math.PI * 2);
        ctx.clip();
        ctx.strokeStyle = hexA(pal[Math.floor(t * 2) % 4], 0.25 + pulse * 0.45);
        ctx.lineWidth = 1.25;
        ctx.beginPath();
        for (let i = 0; i < 24; i++) {
          const a = (i / 24) * Math.PI * 2 + t * 0.8;
          const wob = Math.sin(a * 3 + bands.mid * 8) * (2 + pulse * 4);
          const x = cx + Math.cos(a) * (R * 0.72 + wob);
          const y = cy + Math.sin(a) * (R * 0.28);
          if (i === 0) ctx.moveTo(x, y);
          else ctx.lineTo(x, y);
        }
        ctx.closePath();
        ctx.stroke();
        ctx.restore();
      }

      // Crisp outline
      ctx.strokeStyle = hexA("#ffffff", 0.18 + (ptr.inside ? 0.2 : 0) + pulse * 0.15);
      ctx.lineWidth = 1.25;
      ctx.beginPath();
      ctx.arc(cx, cy, R, 0, Math.PI * 2);
      ctx.stroke();

      if (open || flashA > 0.02 || playing || ptr.inside || Math.abs(ptr.x - ptr.tx) > 0.2) {
        raf = requestAnimationFrame(draw);
      } else {
        raf = requestAnimationFrame(draw);
      }
    };

    document.addEventListener("visibilitychange", onVis);
    raf = requestAnimationFrame(draw);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("pointermove", onMove);
      wrap.removeEventListener("pointerleave", onLeave);
      document.removeEventListener("visibilitychange", onVis);
    };
  }, [playing, accent, seed, reduce, fxScale, open, flash]);

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

function hexA(hex: string, a: number): string {
  const m = hex.replace("#", "");
  if (m.length < 6) return `rgba(168,124,248,${a})`;
  const r = parseInt(m.slice(0, 2), 16);
  const g = parseInt(m.slice(2, 4), 16);
  const b = parseInt(m.slice(4, 6), 16);
  return `rgba(${r}, ${g}, ${b}, ${Math.max(0, Math.min(1, a))})`;
}

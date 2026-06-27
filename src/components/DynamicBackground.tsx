import { useEffect, useRef } from "react";
import { bgVariant } from "@/lib/backgrounds";

interface DynamicBackgroundProps {
  /** Variant id (aurora/ember/…). Godmode-customizable. */
  variant?: string;
}

interface Blob {
  x: number;
  y: number;
  vx: number;
  vy: number;
  r: number;
  color: string;
}

const BASE = "#08080b";

/**
 * The living, touch-reactive backdrop — slow drifting accent "clouds" over a
 * charcoal base that warp and brighten toward the pointer/touch ("heat-paint").
 * Rendered at reduced internal resolution (naturally soft) and behind the whole
 * app, which sits on frosted dark glass. Cheap, pauses when hidden, and falls
 * back to a static wash when the user prefers reduced motion.
 */
export function DynamicBackground({ variant }: DynamicBackgroundProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d", { alpha: false });
    if (!ctx) return;

    const colors = bgVariant(variant).colors;
    const reduce =
      typeof window !== "undefined" &&
      window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;

    // Render at ~55% resolution; the CSS upscale keeps it buttery and soft.
    const SCALE = 0.55;
    let w = 0;
    let h = 0;

    const resize = () => {
      w = Math.max(1, Math.floor(window.innerWidth * SCALE));
      h = Math.max(1, Math.floor(window.innerHeight * SCALE));
      canvas.width = w;
      canvas.height = h;
    };
    resize();

    // Seed a handful of drifting blobs from the variant palette.
    const blobs: Blob[] = [];
    const COUNT = 6;
    for (let i = 0; i < COUNT; i++) {
      blobs.push({
        x: Math.random() * w,
        y: Math.random() * h,
        vx: (Math.random() - 0.5) * 0.12,
        vy: (Math.random() - 0.5) * 0.12,
        r: (0.34 + Math.random() * 0.26) * Math.max(w, h),
        color: colors[i % colors.length],
      });
    }

    // Pointer "heat" — eases toward the latest touch/cursor position.
    const heat = { x: w / 2, y: h / 2, tx: w / 2, ty: h / 2, power: 0 };
    const onMove = (cx: number, cy: number) => {
      heat.tx = cx * SCALE;
      heat.ty = cy * SCALE;
      heat.power = 1;
    };
    const pointerMove = (e: PointerEvent) => onMove(e.clientX, e.clientY);
    const touchMove = (e: TouchEvent) => {
      const t = e.touches[0];
      if (t) onMove(t.clientX, t.clientY);
    };

    const drawBlob = (x: number, y: number, r: number, color: string, alpha: number) => {
      const g = ctx.createRadialGradient(x, y, 0, x, y, r);
      g.addColorStop(0, hexA(color, alpha));
      g.addColorStop(1, hexA(color, 0));
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.arc(x, y, r, 0, Math.PI * 2);
      ctx.fill();
    };

    const render = () => {
      ctx.globalCompositeOperation = "source-over";
      ctx.fillStyle = BASE;
      ctx.fillRect(0, 0, w, h);

      ctx.globalCompositeOperation = "lighter";
      for (const b of blobs) {
        if (!reduce) {
          b.x += b.vx;
          b.y += b.vy;
          // Gentle attraction toward the heat point.
          b.x += (heat.x - b.x) * 0.0006 * heat.power;
          b.y += (heat.y - b.y) * 0.0006 * heat.power;
          if (b.x < -b.r) b.x = w + b.r;
          if (b.x > w + b.r) b.x = -b.r;
          if (b.y < -b.r) b.y = h + b.r;
          if (b.y > h + b.r) b.y = -b.r;
        }
        drawBlob(b.x, b.y, b.r, b.color, 0.34);
      }

      // The reactive highlight that blooms under the finger/cursor.
      heat.x += (heat.tx - heat.x) * 0.08;
      heat.y += (heat.ty - heat.y) * 0.08;
      if (heat.power > 0) {
        drawBlob(heat.x, heat.y, Math.max(w, h) * 0.2, colors[1], 0.3 * heat.power);
        heat.power = Math.max(0, heat.power - 0.012);
      }
      ctx.globalCompositeOperation = "source-over";
    };

    let raf = 0;
    let running = true;
    const loop = () => {
      if (running) render();
      raf = requestAnimationFrame(loop);
    };

    if (reduce) {
      render(); // one static frame
    } else {
      raf = requestAnimationFrame(loop);
    }

    const onVisibility = () => {
      running = document.visibilityState === "visible";
    };
    const onResize = () => {
      resize();
    };

    window.addEventListener("pointermove", pointerMove, { passive: true });
    window.addEventListener("touchmove", touchMove, { passive: true });
    window.addEventListener("resize", onResize);
    document.addEventListener("visibilitychange", onVisibility);

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("pointermove", pointerMove);
      window.removeEventListener("touchmove", touchMove);
      window.removeEventListener("resize", onResize);
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, [variant]);

  return (
    <canvas
      ref={canvasRef}
      aria-hidden="true"
      className="pointer-events-none fixed inset-0 -z-10 h-full w-full"
      style={{ filter: "blur(28px)", transform: "scale(1.08)" }}
    />
  );
}

/** "#rrggbb" + alpha(0..1) → "rgba(...)". */
function hexA(hex: string, a: number): string {
  const m = hex.replace("#", "");
  const r = parseInt(m.slice(0, 2), 16);
  const g = parseInt(m.slice(2, 4), 16);
  const b = parseInt(m.slice(4, 6), 16);
  return `rgba(${r}, ${g}, ${b}, ${a})`;
}

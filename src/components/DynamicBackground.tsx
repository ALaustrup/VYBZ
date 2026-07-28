import { useEffect, useRef } from "react";
import { bgVariant } from "@/lib/backgrounds";
import { useReduceFx, useFxScale } from "@/lib/display";
import { readBands, usePlayer } from "@/lib/audioBus";
import { SITE_BACKDROP } from "@/lib/siteBackdrop";

interface DynamicBackgroundProps {
  variant?: string;
  /** `static` for auth/boot; `live` soft poster + reactive bloom (no full-screen video). */
  mode?: "live" | "static";
}

interface Blob {
  x: number;
  y: number;
  vx: number;
  vy: number;
  r: number;
  color: string;
}

const BASE = "#07121f";

/**
 * Soft luminous atmosphere — poster still + reactive glass blooms.
 * Full-screen looping video was costly and non-reactive; stage owns motion now.
 */
export function DynamicBackground({ variant, mode = "live" }: DynamicBackgroundProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const reduce = useReduceFx();
  const fxScale = useFxScale();
  const { playing } = usePlayer();
  const blobAlpha = (mode === "static" ? 0.12 : 0.2) * (reduce ? 1 : 0.85 + 0.15 * fxScale);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d", { alpha: true });
    if (!ctx) return;

    const colors = bgVariant(variant).colors;
    const SCALE = 0.5;
    let w = 0;
    let h = 0;

    const resize = () => {
      w = Math.max(1, Math.floor(window.innerWidth * SCALE));
      h = Math.max(1, Math.floor(window.innerHeight * SCALE));
      canvas.width = w;
      canvas.height = h;
    };
    resize();

    const blobs: Blob[] = [];
    for (let i = 0; i < 4; i++) {
      blobs.push({
        x: Math.random() * w,
        y: Math.random() * h,
        vx: (Math.random() - 0.5) * 0.08,
        vy: (Math.random() - 0.5) * 0.08,
        r: (0.28 + Math.random() * 0.22) * Math.max(w, h),
        color: colors[i % colors.length],
      });
    }

    const drawBlob = (x: number, y: number, r: number, color: string, alpha: number) => {
      const g = ctx.createRadialGradient(x, y, 0, x, y, r);
      g.addColorStop(0, hexA(color, alpha));
      g.addColorStop(1, hexA(color, 0));
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.arc(x, y, r, 0, Math.PI * 2);
      ctx.fill();
    };

    let raf = 0;
    let running = true;
    const loop = () => {
      if (!running) return;
      ctx.clearRect(0, 0, w, h);
      const bands = playing ? readBands() : { bass: 0.1, mid: 0.08, high: 0.05, level: 0.08 };
      const pulse = 1 + bands.level * 0.35;
      for (const b of blobs) {
        if (!reduce) {
          b.x += b.vx * (0.6 + bands.mid);
          b.y += b.vy * (0.6 + bands.bass);
          if (b.x < -b.r) b.x = w + b.r;
          if (b.x > w + b.r) b.x = -b.r;
          if (b.y < -b.r) b.y = h + b.r;
          if (b.y > h + b.r) b.y = -b.r;
        }
        drawBlob(b.x, b.y, b.r * pulse, b.color, blobAlpha * (0.85 + bands.bass * 0.4));
      }
      // Center bloom — soft “glass light”
      drawBlob(w * 0.5, h * 0.35, Math.max(w, h) * (0.22 + bands.level * 0.08), "#7ec8ff", 0.14 + bands.high * 0.12);
      raf = requestAnimationFrame(loop);
    };

    if (reduce) {
      for (const b of blobs) drawBlob(b.x, b.y, b.r, b.color, blobAlpha);
    } else {
      raf = requestAnimationFrame(loop);
    }

    const onVisibility = () => {
      running = document.visibilityState === "visible";
      if (running && !reduce) raf = requestAnimationFrame(loop);
    };
    const onResize = () => resize();
    window.addEventListener("resize", onResize);
    document.addEventListener("visibilitychange", onVisibility);

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", onResize);
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, [variant, reduce, blobAlpha, playing]);

  return (
    <div className="pointer-events-none fixed inset-0 -z-10 overflow-hidden" aria-hidden="true">
      <div className="absolute inset-0" style={{ background: BASE }} />
      <img
        src={SITE_BACKDROP.poster}
        alt=""
        className="absolute inset-0 h-full w-full object-cover"
        style={{
          opacity: mode === "static" ? 0.22 : playing ? 0.2 : 0.28,
          filter: "blur(18px) saturate(1.15)",
          transform: "scale(1.12)",
        }}
      />
      <div
        className="absolute inset-0"
        style={{
          background:
            "linear-gradient(180deg, rgba(30,80,140,0.35) 0%, rgba(7,18,31,0.45) 42%, rgba(7,18,31,0.82) 100%)",
        }}
      />
      <canvas
        ref={canvasRef}
        className="absolute inset-0 h-full w-full"
        style={{ filter: "blur(32px)", transform: "scale(1.05)", opacity: 0.85 }}
      />
    </div>
  );
}

function hexA(hex: string, a: number): string {
  const m = hex.replace("#", "");
  const r = parseInt(m.slice(0, 2), 16);
  const g = parseInt(m.slice(2, 4), 16);
  const b = parseInt(m.slice(4, 6), 16);
  return `rgba(${r}, ${g}, ${b}, ${a})`;
}

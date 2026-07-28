import { useEffect, useRef, useState } from "react";
import { bgVariant } from "@/lib/backgrounds";
import { useReduceFx, useFxScale } from "@/lib/display";
import { usePlayer } from "@/lib/audioBus";
import { SITE_BACKDROP } from "@/lib/siteBackdrop";

interface DynamicBackgroundProps {
  /** Variant id (aurora/ember/…) — soft accent blooms over the video. */
  variant?: string;
  /**
   * `static` — poster + scrims only (auth / boot). Avoids video decode fighting passkey UI.
   * `live` — looping muted video (default once inside the app).
   */
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

const BASE = "#0a0e18";

/**
 * Site backdrop: looping muted video under heavy readability scrims,
 * plus soft neon blooms from the surface palette.
 */
export function DynamicBackground({ variant, mode = "live" }: DynamicBackgroundProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const reduce = useReduceFx();
  const fxScale = useFxScale();
  const { playing, track } = usePlayer();
  const [videoOk, setVideoOk] = useState(true);
  // Free a decoder slot while the cinema stage owns a track visual.
  const stageOwnsVisual = !!(track?.playback?.vdockVisualId || track?.playback?.backdropUrl);
  const allowVideo = mode === "live" && !reduce && videoOk && !(playing && stageOwnsVisual);
  const playDim = playing ? 0.55 : 1;
  const blobAlpha = (mode === "static" ? 0.1 : 0.18) * (reduce ? 1 : 0.78 + 0.22 * fxScale) * playDim;

  useEffect(() => {
    const v = videoRef.current;
    if (!v || !allowVideo) return;
    v.playbackRate = 0.92;
    const play = () => { void v.play().catch(() => setVideoOk(false)); };
    play();
    const onVis = () => {
      if (document.visibilityState === "visible") play();
      else v.pause();
    };
    document.addEventListener("visibilitychange", onVis);
    return () => {
      v.pause();
      document.removeEventListener("visibilitychange", onVis);
    };
  }, [allowVideo]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d", { alpha: true });
    if (!ctx) return;

    const colors = bgVariant(variant).colors;
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

    const blobs: Blob[] = [];
    for (let i = 0; i < 5; i++) {
      blobs.push({
        x: Math.random() * w,
        y: Math.random() * h,
        vx: (Math.random() - 0.5) * 0.1,
        vy: (Math.random() - 0.5) * 0.1,
        r: (0.3 + Math.random() * 0.24) * Math.max(w, h),
        color: colors[i % colors.length],
      });
    }

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
      ctx.clearRect(0, 0, w, h);
      for (const b of blobs) {
        if (!reduce) {
          b.x += b.vx;
          b.y += b.vy;
          b.x += (heat.x - b.x) * 0.0005 * heat.power;
          b.y += (heat.y - b.y) * 0.0005 * heat.power;
          if (b.x < -b.r) b.x = w + b.r;
          if (b.x > w + b.r) b.x = -b.r;
          if (b.y < -b.r) b.y = h + b.r;
          if (b.y > h + b.r) b.y = -b.r;
        }
        drawBlob(b.x, b.y, b.r, b.color, blobAlpha);
      }
      heat.x += (heat.tx - heat.x) * 0.08;
      heat.y += (heat.ty - heat.y) * 0.08;
      if (heat.power > 0) {
        drawBlob(heat.x, heat.y, Math.max(w, h) * 0.18, colors[1], 0.16 * heat.power);
        heat.power = Math.max(0, heat.power - 0.012);
      }
    };

    let raf = 0;
    let running = true;
    const loop = () => {
      if (running) render();
      raf = requestAnimationFrame(loop);
    };

    if (reduce) render();
    else raf = requestAnimationFrame(loop);

    const onVisibility = () => { running = document.visibilityState === "visible"; };
    const onResize = () => resize();

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
  }, [variant, reduce, blobAlpha]);

  const showVideo = allowVideo;

  return (
    <div className="pointer-events-none fixed inset-0 -z-10 overflow-hidden" aria-hidden="true">
      {/* Charcoal floor so letterboxing / load never flashes white */}
      <div className="absolute inset-0" style={{ background: BASE }} />

      {showVideo ? (
        <video
          ref={videoRef}
          className="absolute inset-0 h-full w-full object-cover"
          style={{
            opacity: playing ? 0.28 : 0.36,
            filter: playing ? "blur(2px) saturate(0.85)" : "blur(1.5px) saturate(0.9)",
            transform: "scale(1.06)",
          }}
          muted
          loop
          playsInline
          autoPlay
          preload="metadata"
          poster={SITE_BACKDROP.poster}
          onError={() => setVideoOk(false)}
        >
          <source src={SITE_BACKDROP.webm} type="video/webm" />
          <source src={SITE_BACKDROP.mp4} type="video/mp4" />
        </video>
      ) : (
        <img
          src={SITE_BACKDROP.poster}
          alt=""
          className="absolute inset-0 h-full w-full object-cover"
          style={{
            opacity: mode === "static" ? 0.28 : 0.36,
            filter: "blur(2px) saturate(0.85)",
            transform: "scale(1.06)",
          }}
        />
      )}

      {/* Readability stack — keeps type/panels legible over motion */}
      <div
        className="absolute inset-0"
        style={{ background: `rgba(10, 14, 24, ${mode === "static" ? 0.72 : playing ? 0.62 : 0.55})` }}
      />
      <div
        className="absolute inset-0"
        style={{
          background:
            "linear-gradient(180deg, rgba(10,14,24,0.72) 0%, rgba(10,14,24,0.35) 38%, rgba(10,14,24,0.4) 62%, rgba(10,14,24,0.78) 100%)",
        }}
      />
      <div
        className="absolute inset-0"
        style={{
          background:
            "radial-gradient(ellipse 75% 60% at 50% 40%, transparent 0%, rgba(10,14,24,0.45) 100%)",
        }}
      />

      <canvas
        ref={canvasRef}
        className="absolute inset-0 h-full w-full"
        style={{ filter: "blur(28px)", transform: "scale(1.04)", opacity: playing ? 0.55 : 0.7 }}
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

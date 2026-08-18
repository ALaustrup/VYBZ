import { useEffect, useRef } from "react";
import { bgVariant } from "@/lib/backgrounds";
import { useReduceFx, useFxScale } from "@/lib/display";
import { readBands, usePlayer } from "@/lib/audioBus";
import { SITE_BACKDROP } from "@/lib/siteBackdrop";
import { DEFAULT_BACKDROP_VISUAL_ID, resolveVdockVisual } from "@/lib/vdockVisualResolve";

interface DynamicBackgroundProps {
  variant?: string;
  /** `static` for auth/boot; `live` faded film + reactive bloom. */
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

const BASE = "#02040a";

/**
 * Soft luminous atmosphere — faded Vizualz film, mouse parallax, audio bloom.
 * The film is decorative and muted. It never touches the dry play element.
 */
export function DynamicBackground({ variant, mode = "live" }: DynamicBackgroundProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const filmWrapRef = useRef<HTMLDivElement>(null);
  const pointerRef = useRef({ x: 0, y: 0 });
  const reduce = useReduceFx();
  const fxScale = useFxScale();
  const { playing } = usePlayer();
  const film = resolveVdockVisual(DEFAULT_BACKDROP_VISUAL_ID);
  const auditMode =
    typeof window !== "undefined" &&
    new URLSearchParams(window.location.search).get("audit") === "1";
  const effectiveMode = auditMode ? "static" : mode;
  const blobAlpha =
    (effectiveMode === "static" ? 0.04 : 0.1) * (reduce || auditMode ? 0.45 : 0.75 + 0.1 * fxScale);

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
      // Center bloom — restrained glass light
      drawBlob(w * 0.5, h * 0.35, Math.max(w, h) * (0.2 + bands.level * 0.05), "#7ec8ff", 0.06 + bands.high * 0.05);
      drawBlob(w * 0.72, h * 0.62, Math.max(w, h) * 0.14, "#00D68F", 0.035 + bands.mid * 0.04);
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
    const onPointer = (e: PointerEvent) => {
      const nx = window.innerWidth ? e.clientX / window.innerWidth - 0.5 : 0;
      const ny = window.innerHeight ? e.clientY / window.innerHeight - 0.5 : 0;
      pointerRef.current = { x: nx, y: ny };
    };
    const onResize = () => resize();
    window.addEventListener("resize", onResize);
    window.addEventListener("pointermove", onPointer, { passive: true });
    document.addEventListener("visibilitychange", onVisibility);

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", onResize);
      window.removeEventListener("pointermove", onPointer);
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, [variant, reduce, blobAlpha, playing]);

  useEffect(() => {
    const video = videoRef.current;
    const wrap = filmWrapRef.current;
    if (!video || !wrap || reduce || effectiveMode === "static" || auditMode) return;
    let raf = 0;
    let running = true;
    const tick = () => {
      if (!running) return;
      const bands = playing ? readBands() : { bass: 0, mid: 0, high: 0, level: 0.06 };
      const p = pointerRef.current;
      const ox = p.x * 28;
      const oy = p.y * 20;
      const scale = 1.12 + bands.bass * 0.06;
      const opacity = 0.1 + bands.level * 0.16;
      wrap.style.opacity = String(opacity);
      wrap.style.transform = `translate3d(${ox}px, ${oy}px, 0) scale(${scale})`;
      wrap.style.filter = `blur(18px) saturate(${0.9 + bands.mid * 0.35}) brightness(${0.5 + bands.bass * 0.22})`;
      if (video.paused) void video.play().catch(() => undefined);
      raf = requestAnimationFrame(tick);
    };
    video.muted = true;
    video.loop = true;
    video.playsInline = true;
    void video.play().catch(() => undefined);
    raf = requestAnimationFrame(tick);
    return () => {
      running = false;
      cancelAnimationFrame(raf);
      if (!video.paused) video.pause();
    };
  }, [playing, reduce, effectiveMode, auditMode, film?.id]);

  const stillOpacity = effectiveMode === "static" || auditMode ? 0.06 : playing ? 0.08 : 0.1;

  return (
    <div className="pointer-events-none fixed inset-0 -z-10 overflow-hidden" aria-hidden="true">
      <div className="absolute inset-0 nexus-hex-grid opacity-[0.06]" />
      <div className="absolute inset-0" style={{ background: BASE }} />
      <img
        src={film?.poster ?? SITE_BACKDROP.poster}
        alt=""
        className="absolute inset-0 h-full w-full object-cover"
        style={{
          opacity: stillOpacity,
          filter: "blur(28px) saturate(0.85) brightness(0.55)",
          transform: "scale(1.12)",
        }}
      />
      {film && effectiveMode === "live" && !auditMode && !reduce ? (
        <div
          ref={filmWrapRef}
          className="absolute inset-[-8%] will-change-transform"
          style={{ opacity: 0.12 }}
        >
          <video
            ref={videoRef}
            className="h-full w-full object-cover"
            muted
            playsInline
            loop
            preload="metadata"
            poster={film.poster}
          >
            <source src={film.webm} type="video/webm" />
            <source src={film.mp4} type="video/mp4" />
          </video>
        </div>
      ) : null}
      <div
        className="absolute inset-0"
        style={{
          background:
            "linear-gradient(180deg, rgba(0,60,110,0.12) 0%, rgba(2,4,10,0.72) 38%, rgba(1,2,5,0.94) 100%)",
        }}
      />
      <canvas
        ref={canvasRef}
        className="absolute inset-0 h-full w-full"
        style={{ filter: "blur(36px) saturate(1.05)", transform: "scale(1.05)", opacity: 0.55 }}
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

import { useEffect, useRef } from "react";
import { frequencyBinCount, readFrequencies, usePlayerShell } from "@/lib/audioBus";
import { useReduceFx } from "@/lib/display";
import { vdockVisual } from "@/lib/vdockVisualManifest";

/**
 * Frequency bars for the music dock.
 * Track Vizualz / custom video live on NowPlayingStage only — decoding the same
 * clip twice was starving AudioBus playback on some browsers.
 */
export function DockVisualizer({ className }: { className?: string }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const { playing, track } = usePlayerShell();
  const reduce = useReduceFx();
  const accent = track?.accent ?? "#00C2FF";
  const catalog = vdockVisual(track?.playback?.vdockVisualId);
  const customUrl = track?.playback?.backdropUrl;
  const hasStageVisual = !!(catalog || customUrl);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let raf = 0;
    let running = true;
    let cssW = 0;
    let cssH = 0;
    let lastIdle = 0;
    const buf = new Uint8Array(Math.max(frequencyBinCount(), 512));

    const resize = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      cssW = canvas.clientWidth;
      cssH = canvas.clientHeight;
      canvas.width = Math.max(1, Math.floor(cssW * dpr));
      canvas.height = Math.max(1, Math.floor(cssH * dpr));
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };
    resize();
    const ro = new ResizeObserver(resize);
    ro.observe(canvas);

    const hexToRgb = (hex: string) => {
      const h = hex.replace("#", "");
      const n = parseInt(h.length === 3 ? h.split("").map((c) => c + c).join("") : h, 16);
      return { r: (n >> 16) & 255, g: (n >> 8) & 255, b: n & 255 };
    };
    const { r, g, b } = hexToRgb(accent);
    const barFill = `rgba(${r},${g},${b},0.55)`;
    const barFillLo = `rgba(${r},${g},${b},0.28)`;
    const mint = "rgba(0,214,143,0.38)";

    const draw = (now: number) => {
      if (!running) return;
      if (document.hidden) {
        raf = requestAnimationFrame(draw);
        return;
      }

      const idle = !playing;
      // Idle / paused: ~12 fps. Playing: full RAF.
      if (idle && now - lastIdle < 80) {
        raf = requestAnimationFrame(draw);
        return;
      }
      lastIdle = now;

      const w = cssW;
      const h = cssH;
      ctx.clearRect(0, 0, w, h);

      const hasAudio = readFrequencies(buf);
      const bars = w < 420 ? 32 : 48;
      const gap = 2;
      const barW = (w - gap * (bars - 1)) / bars;
      const dim = playing ? 1 : 0.48;
      const barAlpha = hasStageVisual ? 0.85 : 1;

      ctx.fillStyle = `rgba(${r},${g},${b},${0.14 * dim * barAlpha})`;
      ctx.fillRect(0, 0, w, h);

      ctx.fillStyle = barFill;
      for (let i = 0; i < bars; i++) {
        let level = 0.08;
        if (hasAudio && !reduce) {
          const bin = Math.floor((i / bars) * (buf.length * 0.55));
          level = Math.max(0.06, Math.min(1, (buf[bin] / 255) ** 0.85));
        } else if (!reduce && playing) {
          level = 0.12 + 0.08 * Math.sin(now / 400 + i * 0.35);
        } else if (!reduce) {
          level = 0.1 + 0.04 * Math.sin(now / 1800 + i * 0.28);
        } else {
          level = 0.1 + (i % 5) * 0.02;
        }

        const bh = level * h * 0.96 * dim;
        const x = i * (barW + gap);
        const y = (h - bh) / 2;
        // Two solid fills instead of per-bar linear gradients.
        ctx.fillStyle = i % 3 === 0 ? mint : i % 2 === 0 ? barFill : barFillLo;
        const radius = Math.min(3.5, barW / 2);
        roundRect(ctx, x, y, barW, Math.max(1, bh), radius);
        ctx.globalAlpha = barAlpha * dim;
        ctx.fill();
        ctx.globalAlpha = 1;
      }

      raf = requestAnimationFrame(draw);
    };

    raf = requestAnimationFrame(draw);
    const onVisibility = () => {
      if (document.visibilityState === "visible" && running) {
        cancelAnimationFrame(raf);
        raf = requestAnimationFrame(draw);
      }
    };
    document.addEventListener("visibilitychange", onVisibility);

    return () => {
      running = false;
      cancelAnimationFrame(raf);
      ro.disconnect();
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, [accent, playing, reduce, track?.id, hasStageVisual]);

  return (
    <div
      className={className ?? "pointer-events-none absolute inset-0 h-full w-full"}
      style={{ contain: "paint" }}
    >
      <canvas
        ref={canvasRef}
        aria-hidden
        className="absolute inset-0 h-full w-full"
      />
    </div>
  );
}

function roundRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number,
) {
  const rr = Math.min(r, w / 2, h / 2);
  ctx.beginPath();
  ctx.moveTo(x + rr, y);
  ctx.arcTo(x + w, y, x + w, y + h, rr);
  ctx.arcTo(x + w, y + h, x, y + h, rr);
  ctx.arcTo(x, y + h, x, y, rr);
  ctx.arcTo(x, y, x + w, y, rr);
  ctx.closePath();
}

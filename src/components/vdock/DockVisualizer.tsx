import { useEffect, useRef } from "react";
import { frequencyBinCount, readFrequencies, usePlayer } from "@/lib/audioBus";
import { useReduceFx } from "@/lib/display";
import { vdockVisual } from "@/lib/vdockVisualManifest";

/**
 * Frequency bars for the music dock.
 * Track Vizualz / custom video live on NowPlayingStage only — decoding the same
 * clip twice was starving AudioBus playback on some browsers.
 */
export function DockVisualizer({ className }: { className?: string }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const { playing, track } = usePlayer();
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
    const buf = new Uint8Array(Math.max(frequencyBinCount(), 512));

    const resize = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      const w = canvas.clientWidth;
      const h = canvas.clientHeight;
      canvas.width = Math.max(1, Math.floor(w * dpr));
      canvas.height = Math.max(1, Math.floor(h * dpr));
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

    const draw = () => {
      if (!running) return;
      const w = canvas.clientWidth;
      const h = canvas.clientHeight;
      ctx.clearRect(0, 0, w, h);

      const hasAudio = readFrequencies(buf);
      const bars = 64;
      const gap = 2;
      const barW = (w - gap * (bars - 1)) / bars;
      const dim = playing ? 1 : 0.48;
      const barAlpha = hasStageVisual ? 0.85 : 1;

      const wash = ctx.createLinearGradient(0, 0, w, 0);
      wash.addColorStop(0, `rgba(${r},${g},${b},${0.08 * dim * barAlpha})`);
      wash.addColorStop(0.45, `rgba(${r},${g},${b},${0.2 * dim * barAlpha})`);
      wash.addColorStop(0.75, `rgba(0,214,143,${0.12 * dim * barAlpha})`);
      wash.addColorStop(1, `rgba(${r},${g},${b},${0.06 * dim * barAlpha})`);
      ctx.fillStyle = wash;
      ctx.fillRect(0, 0, w, h);

      for (let i = 0; i < bars; i++) {
        let level = 0.08;
        if (hasAudio && !reduce) {
          const bin = Math.floor((i / bars) * (buf.length * 0.55));
          level = Math.max(0.06, Math.min(1, (buf[bin] / 255) ** 0.85));
        } else if (!reduce && playing) {
          level = 0.12 + 0.08 * Math.sin(Date.now() / 400 + i * 0.35);
        } else if (!reduce) {
          level = 0.1 + 0.04 * Math.sin(Date.now() / 1800 + i * 0.28);
        } else {
          level = 0.1 + (i % 5) * 0.02;
        }

        const bh = level * h * 0.96 * dim;
        const x = i * (barW + gap);
        const y = (h - bh) / 2;
        const grad = ctx.createLinearGradient(x, y, x, y + bh);
        grad.addColorStop(0, `rgba(${r},${g},${b},${0.7 * dim * barAlpha})`);
        grad.addColorStop(0.45, `rgba(${r},${g},${b},${0.32 * dim * barAlpha})`);
        grad.addColorStop(1, `rgba(0,214,143,${0.42 * dim * barAlpha})`);
        ctx.fillStyle = grad;
        const radius = Math.min(4, barW / 2);
        roundRect(ctx, x, y, barW, bh, radius);
        ctx.fill();
      }

      raf = requestAnimationFrame(draw);
    };

    raf = requestAnimationFrame(draw);
    return () => {
      running = false;
      cancelAnimationFrame(raf);
      ro.disconnect();
    };
  }, [accent, playing, reduce, track?.id, hasStageVisual]);

  return (
    <div className={className ?? "pointer-events-none absolute inset-0 h-full w-full"}>
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

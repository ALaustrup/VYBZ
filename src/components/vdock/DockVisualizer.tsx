import { useEffect, useRef, useSyncExternalStore } from "react";
import { frequencyBinCount, getSnapshot, readBands, readFrequencies, usePlayerShell } from "@/lib/audioBus";
import { useReduceFx } from "@/lib/display";
import { bindStageVideo } from "@/lib/stageVideoSync";
import { getVdockVizMode, subscribeVdockVizMode, type VdockVizMode } from "@/lib/vdockVizMode";
import { getVdockVisualId, subscribeVdockVisualId } from "@/lib/vdockVisualChoice";
import { resolveVdockVisual } from "@/lib/vdockVisualResolve";
import { vdockVisual } from "@/lib/vdockVisualManifest";

/**
 * Audio-reactive dock visualizer — Vizualz film plus the meter from vybz.vdock.vizMode.
 * Track-bound visuals win; otherwise the listener's picked film plays.
 */
export function DockVisualizer({ className }: { className?: string }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const { playing, track } = usePlayerShell();
  const reduce = useReduceFx();
  const mode = useSyncExternalStore(subscribeVdockVizMode, getVdockVizMode, getVdockVizMode);
  const pickedId = useSyncExternalStore(subscribeVdockVisualId, getVdockVisualId, getVdockVisualId);
  const accent = track?.accent ?? "#00C2FF";
  const catalog = vdockVisual(track?.playback?.vdockVisualId);
  const customUrl = track?.playback?.backdropUrl;
  const film = resolveVdockVisual(catalog?.id ?? pickedId);
  const hasStageVisual = !!(film || customUrl);

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

    const sampleLevel = (i: number, bars: number, now: number, hasAudio: boolean) => {
      if (hasAudio && !reduce) {
        const bin = Math.floor((i / bars) * (buf.length * 0.55));
        return Math.max(0.06, Math.min(1, (buf[bin] / 255) ** 0.85));
      }
      if (!reduce && playing) return 0.12 + 0.08 * Math.sin(now / 400 + i * 0.35);
      if (!reduce) return 0.1 + 0.04 * Math.sin(now / 1800 + i * 0.28);
      return 0.1 + (i % 5) * 0.02;
    };

    const drawBars = (
      w: number,
      h: number,
      now: number,
      hasAudio: boolean,
      dim: number,
      barAlpha: number,
      mirror: boolean,
    ) => {
      const bars = w < 420 ? 32 : 48;
      const gap = 2;
      const barW = (w - gap * (bars - 1)) / bars;
      ctx.fillStyle = `rgba(${r},${g},${b},${0.14 * dim * barAlpha})`;
      ctx.fillRect(0, 0, w, h);
      for (let i = 0; i < bars; i++) {
        const level = sampleLevel(i, bars, now, hasAudio);
        const bh = level * h * (mirror ? 0.46 : 0.96) * dim;
        const x = i * (barW + gap);
        ctx.fillStyle = i % 3 === 0 ? mint : i % 2 === 0 ? barFill : barFillLo;
        ctx.globalAlpha = barAlpha * dim;
        if (mirror) {
          roundRect(ctx, x, h / 2 - bh, barW, Math.max(1, bh), Math.min(3.5, barW / 2));
          ctx.fill();
          roundRect(ctx, x, h / 2, barW, Math.max(1, bh), Math.min(3.5, barW / 2));
          ctx.fill();
        } else {
          const y = (h - bh) / 2;
          roundRect(ctx, x, y, barW, Math.max(1, bh), Math.min(3.5, barW / 2));
          ctx.fill();
        }
        ctx.globalAlpha = 1;
      }
    };

    const drawWave = (w: number, h: number, now: number, hasAudio: boolean, dim: number, barAlpha: number) => {
      const pts = w < 420 ? 48 : 72;
      ctx.fillStyle = `rgba(${r},${g},${b},${0.1 * dim * barAlpha})`;
      ctx.fillRect(0, 0, w, h);
      ctx.beginPath();
      ctx.moveTo(0, h / 2);
      for (let i = 0; i < pts; i++) {
        const level = sampleLevel(i, pts, now, hasAudio);
        const x = (i / (pts - 1)) * w;
        const y = h / 2 - (level - 0.5) * h * 0.85 * dim;
        ctx.lineTo(x, y);
      }
      ctx.strokeStyle = `rgba(${r},${g},${b},${0.75 * dim * barAlpha})`;
      ctx.lineWidth = 2;
      ctx.stroke();
      ctx.lineTo(w, h);
      ctx.lineTo(0, h);
      ctx.closePath();
      ctx.fillStyle = `rgba(${r},${g},${b},${0.12 * dim * barAlpha})`;
      ctx.fill();
    };

    const drawPulse = (w: number, h: number, now: number, hasAudio: boolean, dim: number, barAlpha: number) => {
      let avg = 0.15;
      if (hasAudio && !reduce) {
        let sum = 0;
        for (let i = 0; i < 64; i++) sum += buf[i] ?? 0;
        avg = Math.max(0.08, Math.min(1, sum / (64 * 255)));
      } else if (!reduce && playing) {
        avg = 0.35 + 0.15 * Math.sin(now / 280);
      }
      ctx.fillStyle = `rgba(${r},${g},${b},${0.08 * dim * barAlpha})`;
      ctx.fillRect(0, 0, w, h);
      const cx = w / 2;
      const cy = h / 2;
      const radius = Math.min(w, h) * (0.18 + avg * 0.32) * dim;
      const grad = ctx.createRadialGradient(cx, cy, 0, cx, cy, radius);
      grad.addColorStop(0, `rgba(${r},${g},${b},${0.55 * barAlpha})`);
      grad.addColorStop(0.55, `rgba(0,214,143,${0.22 * barAlpha})`);
      grad.addColorStop(1, "transparent");
      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.arc(cx, cy, radius, 0, Math.PI * 2);
      ctx.fill();
    };

    const draw = (now: number) => {
      if (!running) return;
      if (document.hidden) {
        raf = requestAnimationFrame(draw);
        return;
      }

      const idle = !playing;
      if (idle && now - lastIdle < 80) {
        raf = requestAnimationFrame(draw);
        return;
      }
      lastIdle = now;

      const w = cssW;
      const h = cssH;
      ctx.clearRect(0, 0, w, h);

      const hasAudio = readFrequencies(buf);
      const dim = playing ? 1 : 0.48;
      const barAlpha = hasStageVisual ? 0.85 : 1;
      const m: VdockVizMode = mode;

      if (m === "wave") drawWave(w, h, now, hasAudio, dim, barAlpha);
      else if (m === "pulse") drawPulse(w, h, now, hasAudio, dim, barAlpha);
      else drawBars(w, h, now, hasAudio, dim, barAlpha, m === "mirror");

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
  }, [accent, playing, reduce, track?.id, hasStageVisual, mode, film?.id]);

  useEffect(() => {
    const v = videoRef.current;
    if (!v || !film || reduce) return;
    const tick = () => {
      const snap = getSnapshot();
      bindStageVideo(v, {
        playing: snap.playing && !snap.loading,
        mode: "loop",
      });
      const bands = snap.playing ? readBands() : { bass: 0, mid: 0, high: 0, level: 0 };
      const pulse = 0.08 + bands.level * 0.12;
      v.style.opacity = String(snap.playing ? 0.16 + pulse : 0.1);
      v.style.filter = `saturate(${0.85 + bands.mid * 0.2}) brightness(${0.38 + bands.bass * 0.16})`;
    };
    tick();
    const id = window.setInterval(tick, 180);
    return () => window.clearInterval(id);
  }, [film?.id, reduce, playing]);

  return (
    <div
      className={className ?? "pointer-events-none absolute inset-0 h-full w-full"}
      style={{ contain: "paint" }}
    >
      {film && !reduce ? (
        <video
          ref={videoRef}
          key={film.id}
          className="absolute inset-0 h-full w-full object-cover"
          muted
          playsInline
          loop
          preload="metadata"
          poster={film.poster}
          aria-hidden
        >
          <source src={film.webm} type="video/webm" />
          <source src={film.mp4} type="video/mp4" />
        </video>
      ) : film ? (
        <img
          src={film.poster}
          alt=""
          className="absolute inset-0 h-full w-full object-cover opacity-10"
        />
      ) : null}
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-ink-950/80 via-ink-950/45 to-ink-950/30" />
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

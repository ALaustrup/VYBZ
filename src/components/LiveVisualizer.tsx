import { useEffect, useRef } from "react";
import { useFxScale, useReduceFx } from "@/lib/display";
import { cx } from "@/lib/utils";

/**
 * Elite live audio reactive layer for a MediaStream (host/viewer audio).
 * Own analyser graph (muted sink) — does not fight the main AudioBus player.
 * Soft / Max / Off + reduce-motion respected.
 */
export function LiveVisualizer({
  stream,
  accent = "#34f5a0",
  className,
  mode = "bars",
}: {
  stream: MediaStream | null;
  accent?: string;
  className?: string;
  /** bars = strip; stage = full-bleed field for watch chrome */
  mode?: "bars" | "stage";
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const reduce = useReduceFx();
  const fxScale = useFxScale();

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !stream || stream.getAudioTracks().length === 0) return;
    if (reduce || fxScale < 0.02) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const AC = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!AC) return;
    const ac = new AC();
    void ac.resume();
    const srcNode = ac.createMediaStreamSource(stream);
    const analyser = ac.createAnalyser();
    analyser.fftSize = fxScale >= 1 ? 2048 : 1024;
    analyser.smoothingTimeConstant = 0.55;
    srcNode.connect(analyser);
    const sink = ac.createGain();
    sink.gain.value = 0;
    analyser.connect(sink);
    sink.connect(ac.destination);

    const bins = analyser.frequencyBinCount;
    const data = new Uint8Array(bins);
    let prev = new Float32Array(bins);
    let beatEnv = 0;
    let bassEma = 0;

    let w = 0;
    let h = 0;
    const resize = () => {
      const p = canvas.parentElement;
      w = p?.clientWidth ?? 280;
      h = p?.clientHeight ?? 56;
      const dpr = Math.min(2, window.devicePixelRatio || 1);
      canvas.width = w * dpr;
      canvas.height = h * dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };
    resize();
    window.addEventListener("resize", resize);

    let raf = 0;
    let t = 0;
    const N = mode === "stage" ? (fxScale >= 1 ? 64 : 40) : 40;

    const draw = () => {
      t += 0.016;
      analyser.getByteFrequencyData(data as unknown as Uint8Array<ArrayBuffer>);

      let bass = 0;
      let mid = 0;
      let high = 0;
      let flux = 0;
      const bEnd = Math.floor(bins * 0.09);
      const mEnd = Math.floor(bins * 0.4);
      for (let i = 0; i < bins; i++) {
        const v = data[i] / 255;
        if (i < bEnd) bass += v;
        else if (i < mEnd) mid += v;
        else high += v;
        const d = v - prev[i];
        if (d > 0) flux += d;
        prev[i] = v;
      }
      bass /= Math.max(1, bEnd);
      mid /= Math.max(1, mEnd - bEnd);
      high /= Math.max(1, bins - mEnd);
      flux = Math.min(1, flux / (bins * 0.08));
      bassEma += (bass - bassEma) * 0.12;
      const kick = Math.max(0, bass - bassEma * 1.12);
      beatEnv = Math.max(beatEnv * 0.88, kick * 1.4 + flux * 0.8);
      const amp = Math.min(1.35, fxScale);

      ctx.clearRect(0, 0, w, h);
      ctx.globalCompositeOperation = "lighter";

      if (mode === "stage") {
        // Soft radial wash + corona spokes
        const cx = w / 2;
        const cy = h * 0.55;
        const R = Math.min(w, h) * (0.22 + bass * 0.08 * amp + beatEnv * 0.06);
        const wash = ctx.createRadialGradient(cx, cy, R * 0.2, cx, cy, Math.max(w, h) * 0.55);
        wash.addColorStop(0, hexA(accent, 0.12 + beatEnv * 0.18 * amp));
        wash.addColorStop(0.55, hexA(accent, 0.05));
        wash.addColorStop(1, "rgba(0,0,0,0)");
        ctx.fillStyle = wash;
        ctx.fillRect(0, 0, w, h);

        const spokes = fxScale >= 1 ? 56 : 32;
        for (let i = 0; i < spokes; i++) {
          const a = (i / spokes) * Math.PI * 2 - Math.PI / 2;
          const bin = Math.floor((i / spokes) * bins * 0.85);
          const v = (data[bin] || 0) / 255;
          const len = v * Math.min(w, h) * 0.28 * amp;
          if (len < 1) continue;
          ctx.strokeStyle = hexA(accent, (0.12 + v * 0.45) * amp);
          ctx.lineWidth = fxScale >= 1 ? 1.4 : 1.05;
          ctx.beginPath();
          ctx.moveTo(cx + Math.cos(a) * R, cy + Math.sin(a) * R);
          ctx.lineTo(cx + Math.cos(a) * (R + len), cy + Math.sin(a) * (R + len));
          ctx.stroke();
        }

        if (beatEnv > 0.2) {
          ctx.strokeStyle = hexA(accent, beatEnv * 0.45 * amp);
          ctx.lineWidth = 1.5 + beatEnv * 2;
          ctx.beginPath();
          ctx.arc(cx, cy, R * (1.15 + beatEnv * 0.35), 0, Math.PI * 2);
          ctx.stroke();
        }

        // Mid filament
        ctx.strokeStyle = hexA(accent, 0.2 + mid * 0.35);
        ctx.lineWidth = 1.1;
        ctx.beginPath();
        for (let i = 0; i <= 36; i++) {
          const a = (i / 36) * Math.PI * 2 + t * (1 + high);
          const bin = Math.floor((i / 36) * bins);
          const v = (data[bin] || 0) / 255;
          const rr = R * (0.45 + v * 0.4 * amp);
          const x = cx + Math.cos(a) * rr;
          const y = cy + Math.sin(a * 1.05) * rr * 0.75;
          if (i === 0) ctx.moveTo(x, y);
          else ctx.lineTo(x, y);
        }
        ctx.closePath();
        ctx.stroke();
      } else {
        const bw = w / N;
        for (let i = 0; i < N; i++) {
          const bin = Math.floor(Math.pow(i / N, 1.45) * bins * 0.75);
          const v = (data[bin] || 0) / 255;
          const bh = Math.max(2, (v * 0.85 + beatEnv * 0.15) * h * Math.min(1.2, amp));
          const g = ctx.createLinearGradient(0, h, 0, h - bh);
          g.addColorStop(0, hexA(accent, 0.12));
          g.addColorStop(1, hexA(accent, 0.85));
          ctx.fillStyle = g;
          ctx.fillRect(i * bw + 1, h - bh, bw - 2, bh);
        }
      }

      ctx.globalCompositeOperation = "source-over";
      raf = requestAnimationFrame(draw);
    };
    raf = requestAnimationFrame(draw);

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", resize);
      try {
        srcNode.disconnect();
        void ac.close();
      } catch { /* ignore */ }
    };
  }, [stream, accent, reduce, fxScale, mode]);

  return <canvas ref={canvasRef} className={cx("h-full w-full", className)} aria-hidden />;
}

function hexA(hex: string, a: number): string {
  const m = hex.replace("#", "");
  if (m.length < 6) return `rgba(52,245,160,${a})`;
  const r = parseInt(m.slice(0, 2), 16);
  const g = parseInt(m.slice(2, 4), 16);
  const b = parseInt(m.slice(4, 6), 16);
  return `rgba(${r}, ${g}, ${b}, ${Math.max(0, Math.min(1, a))})`;
}

import { useEffect, useRef } from "react";
import { useReduceFx } from "@/lib/display";
import { cx } from "@/lib/utils";

/** Real-time frequency bars for a live MediaStream (the incoming/host audio). */
export function LiveVisualizer({ stream, accent = "#a87cf8", className }: { stream: MediaStream | null; accent?: string; className?: string }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const reduce = useReduceFx();

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !stream || stream.getAudioTracks().length === 0) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const AC = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!AC) return;
    const ac = new AC();
    const srcNode = ac.createMediaStreamSource(stream);
    const analyser = ac.createAnalyser();
    analyser.fftSize = 512;
    srcNode.connect(analyser);
    const bins = analyser.frequencyBinCount;
    const data = new Uint8Array(bins);

    let w = 0, h = 0;
    const resize = () => {
      const p = canvas.parentElement;
      w = p?.clientWidth ?? 280; h = p?.clientHeight ?? 56;
      const dpr = Math.min(2, window.devicePixelRatio || 1);
      canvas.width = w * dpr; canvas.height = h * dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };
    resize();
    window.addEventListener("resize", resize);

    let raf = 0;
    const N = 40;
    const draw = () => {
      analyser.getByteFrequencyData(data as unknown as Uint8Array<ArrayBuffer>);
      ctx.clearRect(0, 0, w, h);
      const bw = w / N;
      for (let i = 0; i < N; i++) {
        const bin = Math.floor(Math.pow(i / N, 1.5) * bins * 0.7);
        const v = data[bin] / 255;
        const bh = Math.max(2, v * h);
        const g = ctx.createLinearGradient(0, h, 0, h - bh);
        g.addColorStop(0, hexA(accent, 0.15));
        g.addColorStop(1, hexA(accent, 0.9));
        ctx.fillStyle = g;
        ctx.fillRect(i * bw + 1, h - bh, bw - 2, bh);
      }
      if (!reduce) raf = requestAnimationFrame(draw);
    };
    draw();

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", resize);
      try { srcNode.disconnect(); void ac.close(); } catch { /* ignore */ }
    };
  }, [stream, accent, reduce]);

  return <canvas ref={canvasRef} className={cx("h-full w-full", className)} aria-hidden />;
}

function hexA(hex: string, a: number): string {
  const m = hex.replace("#", "");
  const r = parseInt(m.slice(0, 2), 16), g = parseInt(m.slice(2, 4), 16), b = parseInt(m.slice(4, 6), 16);
  return `rgba(${r}, ${g}, ${b}, ${a})`;
}

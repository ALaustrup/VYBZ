import { useEffect, useRef } from "react";
import { readBands, usePlayer } from "@/lib/audioBus";
import { useReduceFx } from "@/lib/display";
import { cx } from "@/lib/utils";

/**
 * Audio-reactive backdrop for landing / auth — uses AudioBus readBands (Law 5:
 * no MediaElementSource on the dry play element).
 */
export function VibesRadioVisualizer({ className }: { className?: string }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const { playing } = usePlayer();
  const reduce = useReduceFx();

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let raf = 0;
    let w = 0;
    let h = 0;

    const resize = () => {
      const parent = canvas.parentElement;
      w = parent?.clientWidth ?? window.innerWidth;
      h = parent?.clientHeight ?? window.innerHeight;
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = Math.floor(w * dpr);
      canvas.height = Math.floor(h * dpr);
      canvas.style.width = `${w}px`;
      canvas.style.height = `${h}px`;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };
    resize();
    window.addEventListener("resize", resize);

    const draw = () => {
      ctx.clearRect(0, 0, w, h);
      const bands = playing && !reduce ? readBands() : { bass: 0.12, mid: 0.08, high: 0.06, level: 0.1 };
      const cx0 = w * 0.5;
      const cy0 = h * 0.42;
      const base = Math.min(w, h) * 0.18;

      const rings = [
        { r: base * (1 + bands.bass * 0.55), a: 0.14 + bands.bass * 0.35, hue: 190 },
        { r: base * (1.35 + bands.mid * 0.45), a: 0.1 + bands.mid * 0.28, hue: 165 },
        { r: base * (1.7 + bands.high * 0.4), a: 0.06 + bands.high * 0.22, hue: 210 },
      ];

      for (const ring of rings) {
        const g = ctx.createRadialGradient(cx0, cy0, ring.r * 0.2, cx0, cy0, ring.r);
        g.addColorStop(0, `hsla(${ring.hue}, 80%, 55%, ${ring.a})`);
        g.addColorStop(1, `hsla(${ring.hue}, 70%, 40%, 0)`);
        ctx.fillStyle = g;
        ctx.beginPath();
        ctx.arc(cx0, cy0, ring.r, 0, Math.PI * 2);
        ctx.fill();
      }

      // Soft floor wash
      const floor = ctx.createLinearGradient(0, h * 0.55, 0, h);
      floor.addColorStop(0, "transparent");
      floor.addColorStop(1, `rgba(0, 194, 255, ${0.04 + bands.level * 0.08})`);
      ctx.fillStyle = floor;
      ctx.fillRect(0, 0, w, h);

      raf = requestAnimationFrame(draw);
    };
    draw();

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", resize);
    };
  }, [playing, reduce]);

  return (
    <canvas
      ref={canvasRef}
      aria-hidden
      className={cx("pointer-events-none absolute inset-0 z-0", className)}
      data-testid="vibes-radio-visualizer"
    />
  );
}

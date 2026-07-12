import { useEffect, useRef } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { useSession } from "@/store/session";

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  rot: number;
  vr: number;
  color: string;
  life: number;
}

const COLORS = ["#c77dff", "#8b4ff2", "#34f5a0", "#ff5d8f", "#ffd166", "#5b8cff"];

/**
 * Canvas confetti tied to the global celebration trigger. Drawing on a single
 * canvas (rather than many DOM nodes) keeps the burst buttery at 60fps even on
 * mid-range phones. A short banner announces the milestone alongside it.
 */
export function Confetti() {
  const { celebration, clearCelebration } = useSession();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const rafRef = useRef<number | undefined>(undefined);

  useEffect(() => {
    if (!celebration) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const w = window.innerWidth;
    const h = window.innerHeight;
    canvas.width = w * dpr;
    canvas.height = h * dpr;
    ctx.scale(dpr, dpr);

    // Two emitters near the bottom corners for a celebratory upward fountain.
    const particles: Particle[] = [];
    const spawn = (originX: number) => {
      for (let i = 0; i < 70; i++) {
        const angle = -Math.PI / 2 + (Math.random() - 0.5) * 1.1;
        const speed = 9 + Math.random() * 13;
        particles.push({
          x: originX,
          y: h + 10,
          vx: Math.cos(angle) * speed,
          vy: Math.sin(angle) * speed,
          size: 5 + Math.random() * 7,
          rot: Math.random() * Math.PI,
          vr: (Math.random() - 0.5) * 0.4,
          color: COLORS[Math.floor(Math.random() * COLORS.length)],
          life: 1,
        });
      }
    };
    spawn(w * 0.2);
    spawn(w * 0.8);

    const gravity = 0.32;
    let frame = 0;

    const tick = () => {
      frame++;
      ctx.clearRect(0, 0, w, h);
      let alive = false;
      for (const p of particles) {
        p.vy += gravity;
        p.x += p.vx;
        p.y += p.vy;
        p.rot += p.vr;
        p.life -= 0.008;
        if (p.life <= 0 || p.y > h + 40) continue;
        alive = true;
        ctx.save();
        ctx.globalAlpha = Math.max(0, p.life);
        ctx.translate(p.x, p.y);
        ctx.rotate(p.rot);
        ctx.fillStyle = p.color;
        ctx.fillRect(-p.size / 2, -p.size / 2, p.size, p.size * 0.6);
        ctx.restore();
      }
      if (alive && frame < 240) {
        rafRef.current = requestAnimationFrame(tick);
      } else {
        ctx.clearRect(0, 0, w, h);
      }
    };
    tick();

    const timeout = setTimeout(clearCelebration, 2600);
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      clearTimeout(timeout);
    };
  }, [celebration, clearCelebration]);

  return (
    <>
      <canvas
        ref={canvasRef}
        className="pointer-events-none fixed inset-0 z-[60]"
        style={{ width: "100%", height: "100%" }}
      />
      <AnimatePresence>
        {celebration && (
          <motion.div
            key={celebration.token}
            initial={{ opacity: 0, y: -24, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -24, scale: 0.9 }}
            transition={{ type: "spring", stiffness: 320, damping: 22 }}
            className="pointer-events-none fixed left-1/2 top-24 z-[61] -translate-x-1/2"
          >
            <div className="glass flex items-center gap-2 rounded-full px-5 py-2.5 shadow-glow">
              <span className="text-lg">✦</span>
              <span className="font-display text-sm font-semibold text-gradient">
                {celebration.label}
              </span>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}

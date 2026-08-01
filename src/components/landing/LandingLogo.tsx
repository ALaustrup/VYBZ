import { motion, useMotionTemplate, useMotionValue, useSpring } from "framer-motion";
import { useRef } from "react";
import { BrandMark } from "@/components/Brand";

/**
 * Hero brand lockup — matte specular ring, slow orbit, precise tilt on pointer.
 * Pro-audio futurist; no rainbow gradient slop.
 */
export function LandingLogo() {
  const ref = useRef<HTMLDivElement>(null);
  const mx = useMotionValue(0);
  const my = useMotionValue(0);
  const sx = useSpring(mx, { stiffness: 90, damping: 22 });
  const sy = useSpring(my, { stiffness: 90, damping: 22 });
  const rotate = useMotionTemplate`rotateX(${sy}deg) rotateY(${sx}deg)`;

  function onMove(e: React.MouseEvent) {
    const el = ref.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    mx.set(((e.clientX - r.left) / r.width - 0.5) * 10);
    my.set(((e.clientY - r.top) / r.height - 0.5) * -8);
  }

  function onLeave() {
    mx.set(0);
    my.set(0);
  }

  return (
    <div
      ref={ref}
      onMouseMove={onMove}
      onMouseLeave={onLeave}
      className="relative flex flex-col items-center gap-6 perspective-[900px]"
    >
      <motion.span
        aria-hidden
        className="pointer-events-none absolute -inset-20 rounded-full"
        style={{
          background:
            "radial-gradient(circle at 50% 50%, rgb(var(--accent-rgb) / 0.18), transparent 62%)",
        }}
        animate={{ scale: [0.92, 1.06, 0.92], opacity: [0.45, 0.85, 0.45] }}
        transition={{ duration: 6.5, repeat: Infinity, ease: "easeInOut" }}
      />
      <motion.div
        style={{ transform: rotate, transformStyle: "preserve-3d" }}
        className="relative"
        whileHover={{ scale: 1.04 }}
        transition={{ type: "spring", stiffness: 260, damping: 24 }}
      >
        <motion.div
          className="absolute -inset-5 rounded-full opacity-80 blur-xl"
          style={{
            background:
              "conic-gradient(from 210deg, rgb(var(--accent-rgb) / 0.55), rgba(255,255,255,0.08), rgb(var(--accent-rgb) / 0.35), rgba(255,255,255,0.04), rgb(var(--accent-rgb) / 0.55))",
          }}
          animate={{ rotate: 360 }}
          transition={{ duration: 22, repeat: Infinity, ease: "linear" }}
        />
        <div className="relative grid place-items-center rounded-full border border-white/12 bg-[#05080f]/90 p-6 shadow-[0_0_48px_-12px_rgb(var(--accent-rgb)/0.55)]">
          <BrandMark className="h-[4.5rem] w-[4.5rem] sm:h-20 sm:w-20" reactive={false} />
        </div>
      </motion.div>
      <motion.img
        src="/brand/logo-white.svg"
        alt="VYBZ"
        className="h-8 w-auto opacity-90 sm:h-9"
        initial={{ opacity: 0, y: 6 }}
        animate={{ opacity: 0.9, y: 0 }}
        transition={{ delay: 0.12 }}
        draggable={false}
      />
    </div>
  );
}

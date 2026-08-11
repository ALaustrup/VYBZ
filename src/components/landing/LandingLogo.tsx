import { motion, useMotionTemplate, useMotionValue, useSpring } from "framer-motion";
import { useRef } from "react";
import { BrandMark } from "@/components/Brand";
import { AppBarWordmark } from "@/components/shell/AppBarWordmark";

/**
 * Hero brand lockup — matte specular ring, slow orbit, pointer tilt + hover bloom.
 * Landing gate: mark + lettermark only (no marketing copy). The mark does not react
 * to audio — the brand stays still while the featured player carries the motion.
 */
export function LandingLogo() {
  const ref = useRef<HTMLDivElement>(null);
  const mx = useMotionValue(0);
  const my = useMotionValue(0);
  const sx = useSpring(mx, { stiffness: 110, damping: 20 });
  const sy = useSpring(my, { stiffness: 110, damping: 20 });
  const rotate = useMotionTemplate`rotateX(${sy}deg) rotateY(${sx}deg)`;

  function onMove(e: React.MouseEvent) {
    const el = ref.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    mx.set(((e.clientX - r.left) / r.width - 0.5) * 14);
    my.set(((e.clientY - r.top) / r.height - 0.5) * -12);
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
      className="landing-logo relative flex flex-col items-center gap-7 perspective-[1000px]"
      data-testid="landing-logo"
    >
      <motion.span
        aria-hidden
        className="pointer-events-none absolute -inset-24 rounded-full"
        style={{
          background:
            "radial-gradient(circle at 50% 45%, rgb(var(--accent-rgb) / 0.28), transparent 58%)",
        }}
        animate={{ scale: [0.88, 1.1, 0.88], opacity: [0.4, 0.95, 0.4] }}
        transition={{ duration: 5.2, repeat: Infinity, ease: "easeInOut" }}
      />
      <motion.div
        style={{ transform: rotate, transformStyle: "preserve-3d" }}
        className="relative"
        whileHover={{ scale: 1.07 }}
        transition={{ type: "spring", stiffness: 280, damping: 22 }}
      >
        <motion.div
          className="absolute -inset-6 rounded-full opacity-90 blur-2xl"
          style={{
            background:
              "conic-gradient(from 200deg, rgb(var(--accent-rgb) / 0.7), rgba(255,255,255,0.12), rgb(0 214 143 / 0.45), rgba(255,255,255,0.06), rgb(var(--accent-rgb) / 0.7))",
          }}
          animate={{ rotate: 360 }}
          transition={{ duration: 16, repeat: Infinity, ease: "linear" }}
        />
        <div className="landing-logo-mark relative grid place-items-center rounded-full border border-white/14 bg-[#05080f]/92 p-7 shadow-[0_0_64px_-10px_rgb(var(--accent-rgb)/0.7)] sm:p-8">
          <BrandMark className="h-20 w-20 sm:h-[5.5rem] sm:w-[5.5rem]" />
        </div>
      </motion.div>
      <motion.div
        className="landing-logo-wordmark"
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
      >
        <AppBarWordmark className="[&_.app-bar-wordmark-img]:!h-9 sm:[&_.app-bar-wordmark-img]:!h-10" />
      </motion.div>
    </div>
  );
}

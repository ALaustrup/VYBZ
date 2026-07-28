import { motion, useMotionTemplate, useMotionValue, useSpring } from "framer-motion";
import { useRef } from "react";
import { BrandMark, Wordmark } from "@/components/Brand";

/**
 * Hero brand lockup — idle orbit + hover chromatic scale.
 * Stage black / cyan / magenta / amber (club energy, not purple slop).
 */
export function LandingLogo() {
  const ref = useRef<HTMLDivElement>(null);
  const mx = useMotionValue(0);
  const my = useMotionValue(0);
  const sx = useSpring(mx, { stiffness: 120, damping: 18 });
  const sy = useSpring(my, { stiffness: 120, damping: 18 });
  const rotate = useMotionTemplate`rotateX(${sy}deg) rotateY(${sx}deg)`;

  function onMove(e: React.MouseEvent) {
    const el = ref.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    const px = (e.clientX - r.left) / r.width - 0.5;
    const py = (e.clientY - r.top) / r.height - 0.5;
    mx.set(px * 14);
    my.set(py * -10);
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
      className="relative flex flex-col items-center gap-5 perspective-[900px]"
    >
      {/* Soft orbit particles */}
      <motion.span
        aria-hidden
        className="pointer-events-none absolute -inset-16 rounded-full"
        style={{
          background:
            "radial-gradient(circle at 30% 40%, rgba(34,211,238,0.22), transparent 55%), radial-gradient(circle at 70% 60%, rgba(236,72,153,0.18), transparent 50%), radial-gradient(circle at 50% 80%, rgba(251,191,36,0.12), transparent 45%)",
        }}
        animate={{ rotate: 360 }}
        transition={{ duration: 28, repeat: Infinity, ease: "linear" }}
      />
      <motion.div
        style={{ transform: rotate, transformStyle: "preserve-3d" }}
        className="relative"
        whileHover={{ scale: 1.06 }}
        transition={{ type: "spring", stiffness: 280, damping: 22 }}
      >
        <motion.div
          className="absolute -inset-6 rounded-full opacity-70 blur-2xl"
          style={{
            background:
              "conic-gradient(from 120deg, #22d3ee, #ec4899, #fbbf24, #22d3ee)",
          }}
          animate={{ rotate: -360 }}
          transition={{ duration: 16, repeat: Infinity, ease: "linear" }}
        />
        <div className="relative grid place-items-center rounded-full bg-ink-950/80 p-5 ring-1 ring-white/15">
          <BrandMark className="h-20 w-20 sm:h-24 sm:w-24" reactive={false} />
        </div>
      </motion.div>
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.15 }}
      >
        <Wordmark className="text-4xl font-bold tracking-wide sm:text-5xl" />
      </motion.div>
    </div>
  );
}

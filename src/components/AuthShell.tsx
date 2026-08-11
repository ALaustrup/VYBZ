import type { ReactNode } from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { GeometricBackdrop } from "@/components/GeometricBackdrop";
import { BrandMark } from "@/components/Brand";
import { FeaturedMiniPlayer } from "@/features/featured/FeaturedMiniPlayer";
import { staggerContainer, staggerItem, withReduce } from "@/lib/motion";
import { useReduceFx } from "@/lib/display";

/**
 * Premium auth frame — matte glass card on geometric void.
 * Featured platform mini-player sits fixed at the bottom (not over login controls).
 */
export function AuthShell({
  title,
  subtitle,
  children,
  footer,
}: {
  title: string;
  subtitle?: string;
  children: ReactNode;
  footer?: ReactNode;
}) {
  const reduce = useReduceFx();

  return (
    <div
      className="public-scroll-frame public-ops-shell nexus-void relative z-10 flex flex-col items-center px-5 py-10 pb-[max(5.5rem,env(safe-area-inset-bottom))]"
      data-public-shell="auth"
      data-testid="public-auth-shell"
    >
      <GeometricBackdrop intensity="subtle" />
      <motion.div
        className="forge-glass relative z-[1] my-auto w-full max-w-[22rem] p-7 sm:max-w-sm"
        initial={{ opacity: 0, y: 20, scale: 0.97 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={withReduce(reduce, { type: "spring", stiffness: 320, damping: 32 })}
      >
        <span className="forge-glass-edge" aria-hidden />
        <motion.div
          variants={staggerContainer}
          initial="hidden"
          animate="visible"
          className="relative z-[1] flex flex-col gap-5"
        >
          <motion.div variants={staggerItem} className="flex flex-col items-center gap-3 text-center">
            <div className="relative grid place-items-center">
              <span
                className="absolute inset-0 rounded-full blur-2xl"
                style={{ background: "rgb(var(--accent-rgb) / 0.25)" }}
                aria-hidden
              />
              <BrandMark className="relative h-14 w-14" reactive />
            </div>
            <div>
              <p className="nexus-eyebrow mb-1.5">VYBZ</p>
              <h1 className="font-display text-xl font-bold tracking-tight text-white">{title}</h1>
              {subtitle ? <p className="mt-1.5 text-sm text-white/50">{subtitle}</p> : null}
            </div>
          </motion.div>
          <motion.div variants={staggerItem}>{children}</motion.div>
        </motion.div>
      </motion.div>
      {footer ?? (
        <p className="relative z-[1] mt-6 text-center text-[11px] text-white/38">
          <Link to="/" className="hover:text-white/65">Home</Link>
          <span className="px-1.5">·</span>
          <Link to="/codex" className="hover:text-white/65">Codex</Link>
          <span className="px-1.5">·</span>
          <Link to="/legal/terms" className="hover:text-white/65">Terms</Link>
        </p>
      )}
      <FeaturedMiniPlayer />
    </div>
  );
}

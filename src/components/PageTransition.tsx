import { motion, useReducedMotion } from "framer-motion";
import type { ReactNode } from "react";
import { geometricPageVariants, geometricPageTransition } from "@/lib/motion";

/**
 * Geometric route enter — diagonal clip reveal instead of generic fade-up.
 */
export function PageTransition({ routeKey, children }: { routeKey: string; children: ReactNode }) {
  const reduce = useReducedMotion();

  if (reduce) {
    return <div key={routeKey} className="w-full min-h-0">{children}</div>;
  }

  return (
    <motion.div
      key={routeKey}
      className="w-full min-h-0"
      variants={geometricPageVariants}
      initial="initial"
      animate="animate"
      exit="exit"
      transition={geometricPageTransition}
      style={{ willChange: "opacity, transform" }}
    >
      {children}
    </motion.div>
  );
}

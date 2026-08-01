import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { useReduceFx } from "@/lib/display";
import { GeometricBackdrop } from "@/components/GeometricBackdrop";

/**
 * Cold-load intro — geometric logo reveal on a matte void with a diagonal slice wipe.
 * Once per session; tap to skip; shortened under reduced motion.
 */
export function IntroSplash() {
  const reduce = useReduceFx();
  const [show, setShow] = useState(() => {
    try { return sessionStorage.getItem("vybz.intro") !== "1"; } catch { return true; }
  });

  useEffect(() => {
    if (!show) return;
    try { sessionStorage.setItem("vybz.intro", "1"); } catch { /* ignore */ }
    const ms = reduce ? 700 : 3200;
    const t = setTimeout(() => setShow(false), ms);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [show]);

  return (
    <AnimatePresence>
      {show && (
        <motion.div
          className="nexus-intro"
          onClick={() => setShow(false)}
          initial={{ opacity: 1 }}
          exit={{ opacity: 0, transition: { duration: 0.55, ease: [0.22, 1, 0.28, 1] } }}
          role="presentation"
        >
          <GeometricBackdrop intensity="hero" />
          <div className="nexus-intro-grid nexus-hex-grid" aria-hidden />
          {!reduce && <div className="nexus-intro-scanline" aria-hidden />}
          <div className="nexus-intro-logo-wrap">
            <span className="nexus-intro-slice" aria-hidden />
            <img
              src="/brand/logo-white.svg"
              className="nexus-intro-logo"
              alt="VYBZ"
              draggable={false}
            />
          </div>
          <p className="nexus-intro-tagline">Release intelligence</p>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { useReduceFx } from "@/lib/display";

/**
 * Cold-load intro: the official VYBZ mark revealed with a neon "neochrome" glow
 * and a brief RGB glitch, then a smooth fade into the app. Shown once per session
 * (tap to skip); shortened under reduced-motion.
 */
export function IntroSplash() {
  const reduce = useReduceFx();
  const [show, setShow] = useState(() => {
    try { return sessionStorage.getItem("vybz.intro") !== "1"; } catch { return true; }
  });

  useEffect(() => {
    if (!show) return;
    try { sessionStorage.setItem("vybz.intro", "1"); } catch { /* ignore */ }
    const t = setTimeout(() => setShow(false), reduce ? 800 : 2800);
    return () => clearTimeout(t);
  }, [show, reduce]);

  return (
    <AnimatePresence>
      {show && (
        <motion.div
          className="vybz-intro"
          onClick={() => setShow(false)}
          initial={{ opacity: 1 }}
          exit={{ opacity: 0, transition: { duration: 0.5, ease: "easeOut" } }}
        >
          <img src="/brand/logo-white.svg" className="vybz-intro-logo" alt="VYBZ" draggable={false} />
          <div className="vybz-intro-tag">Find Yours.</div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

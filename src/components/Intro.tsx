import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";

const SEEN_KEY = "veiled.introSeen";
const LOGO = "/brand/wordmark.png";
const HOLD_MS = 3200; // on-stage time before it dissolves
const EXIT_MS = 850;

function prefersReducedMotion(): boolean {
  return (
    typeof window !== "undefined" &&
    window.matchMedia?.("(prefers-reduced-motion: reduce)").matches
  );
}

/**
 * Brand intro: the MYVYB logo glitches onto a black stage, glows, then dissolves
 * away to reveal the app. Shown once per session; tap to skip. Reduced-motion
 * collapses to a clean fade.
 */
export function Intro() {
  const [visible, setVisible] = useState(() => {
    try {
      return !sessionStorage.getItem(SEEN_KEY);
    } catch {
      return true;
    }
  });
  const [leaving, setLeaving] = useState(false);
  const reduced = prefersReducedMotion();

  useEffect(() => {
    if (!visible) return;
    try {
      sessionStorage.setItem(SEEN_KEY, "1");
    } catch {
      /* non-fatal */
    }
    const t = setTimeout(() => setLeaving(true), reduced ? 1400 : HOLD_MS);
    return () => clearTimeout(t);
  }, [visible, reduced]);

  useEffect(() => {
    if (!leaving) return;
    const t = setTimeout(() => setVisible(false), EXIT_MS);
    return () => clearTimeout(t);
  }, [leaving]);

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          key="intro"
          onClick={() => setLeaving(true)}
          initial={{ opacity: 1 }}
          animate={
            leaving
              ? { opacity: 0, scale: 1.18, filter: "blur(16px)" }
              : { opacity: 1, scale: 1, filter: "blur(0px)" }
          }
          transition={{ duration: EXIT_MS / 1000, ease: [0.16, 1, 0.3, 1] }}
          className="fixed inset-0 z-[100] flex items-center justify-center overflow-hidden bg-ink-950"
        >
          {/* Glow that blooms behind the logo. */}
          <motion.div
            aria-hidden
            className="pointer-events-none absolute h-[70vmin] w-[70vmin] rounded-full"
            style={{
              background:
                "radial-gradient(circle, rgba(45,212,191,0.22), rgba(124,58,237,0.10) 45%, transparent 66%)",
            }}
            initial={{ opacity: 0, scale: 0.7 }}
            animate={{ opacity: [0, 0, 1, 0.85], scale: [0.7, 0.7, 1.05, 1] }}
            transition={{ duration: 2.4, ease: "easeOut", times: [0, 0.22, 0.6, 1] }}
          />

          <div className="relative flex w-[80vw] max-w-[520px] items-center justify-center">
            {reduced ? (
              <motion.img
                src={LOGO}
                alt="MYVYB"
                draggable={false}
                className="w-full select-none"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.6 }}
              />
            ) : (
              <>
                {/* Chromatic ghosts — visible only during the glitch-in. */}
                <motion.img
                  src={LOGO}
                  alt=""
                  aria-hidden
                  draggable={false}
                  className="absolute w-full select-none mix-blend-screen"
                  style={{ filter: "hue-rotate(-60deg) saturate(2)" }}
                  initial={{ x: -14, opacity: 0.9 }}
                  animate={{ x: [-14, 9, -5, 0], opacity: [0.9, 0.7, 0.3, 0] }}
                  transition={{ duration: 0.62, ease: "easeOut", times: [0, 0.4, 0.7, 1] }}
                />
                <motion.img
                  src={LOGO}
                  alt=""
                  aria-hidden
                  draggable={false}
                  className="absolute w-full select-none mix-blend-screen"
                  style={{ filter: "hue-rotate(120deg) saturate(2)" }}
                  initial={{ x: 14, opacity: 0.9 }}
                  animate={{ x: [14, -9, 5, 0], opacity: [0.9, 0.7, 0.3, 0] }}
                  transition={{ duration: 0.62, ease: "easeOut", times: [0, 0.4, 0.7, 1] }}
                />
                {/* The logo: glitch in → settle → glow pulse. */}
                <motion.img
                  src={LOGO}
                  alt="MYVYB"
                  draggable={false}
                  className="relative w-full select-none"
                  initial={{ opacity: 0, x: -10, filter: "blur(8px)" }}
                  animate={{
                    opacity: [0, 1, 0.35, 1, 0.7, 1],
                    x: [-10, 8, -4, 3, 0, 0],
                    filter: [
                      "blur(8px) drop-shadow(0 0 0 rgba(45,212,191,0))",
                      "blur(0px) drop-shadow(0 0 0 rgba(45,212,191,0))",
                      "blur(2px) drop-shadow(0 0 0 rgba(45,212,191,0))",
                      "blur(0px) drop-shadow(0 0 26px rgba(45,212,191,0.55))",
                      "blur(0px) drop-shadow(0 0 14px rgba(124,58,237,0.45))",
                      "blur(0px) drop-shadow(0 0 22px rgba(45,212,191,0.4))",
                    ],
                  }}
                  transition={{
                    duration: 2.6,
                    ease: "easeOut",
                    times: [0, 0.18, 0.26, 0.55, 0.8, 1],
                  }}
                />
                {/* Scanline sweep during the glitch. */}
                <motion.div
                  aria-hidden
                  className="pointer-events-none absolute inset-x-0 h-[3px] bg-white/70 mix-blend-overlay"
                  initial={{ top: "0%", opacity: 0 }}
                  animate={{ top: ["0%", "100%"], opacity: [0, 0.8, 0] }}
                  transition={{ duration: 0.6, ease: "linear" }}
                />
              </>
            )}
          </div>

          {!reduced && (
            <motion.span
              initial={{ opacity: 0 }}
              animate={{ opacity: leaving ? 0 : 0.4 }}
              transition={{ delay: 2.6, duration: 0.7 }}
              className="absolute bottom-[8%] text-[10px] uppercase tracking-[0.3em] text-white/40"
            >
              tap to enter
            </motion.span>
          )}
        </motion.div>
      )}
    </AnimatePresence>
  );
}

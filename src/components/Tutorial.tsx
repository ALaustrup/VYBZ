import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  ArrowRight,
  Flame,
  Heart,
  Radio,
  Sparkles,
  type LucideIcon,
} from "lucide-react";
import { haptic } from "@/lib/utils";

const SEEN_KEY = "veiled.tutorialSeen";

interface Step {
  icon: LucideIcon;
  accent: string;
  title: string;
  body: string;
}

// Minimal, benefit-first copy — one idea per screen.
const STEPS: Step[] = [
  {
    icon: Sparkles,
    accent: "#ff8c3d",
    title: "Welcome to VYBZ",
    body: "Anonymous by default. Express freely.",
  },
  {
    icon: Heart,
    accent: "#34f5a0",
    title: "A feed you control",
    body: "Vyb what moves you. Fail what doesn't.",
  },
  {
    icon: Radio,
    accent: "#5b8cff",
    title: "Go live, meet now",
    body: "Stream nearby or drop into random chat.",
  },
  {
    icon: Flame,
    accent: "#ff5d8f",
    title: "Match by vibe",
    body: "Swipe to spark — by interest, not just looks.",
  },
];

/** A one-time, minimal intro with subtle motion. */
export function Tutorial() {
  const [visible, setVisible] = useState(() => {
    try {
      return !localStorage.getItem(SEEN_KEY);
    } catch {
      return true;
    }
  });
  const [i, setI] = useState(0);

  function dismiss() {
    try {
      localStorage.setItem(SEEN_KEY, "1");
    } catch {
      /* non-fatal */
    }
    setVisible(false);
  }

  function next() {
    haptic(10);
    if (i < STEPS.length - 1) setI((n) => n + 1);
    else dismiss();
  }

  const step = STEPS[i];
  const Icon = step.icon;
  const last = i === STEPS.length - 1;

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[70] mx-auto flex max-w-md flex-col bg-ink-950/95 backdrop-blur-xl"
        >
          {/* Animated ambient orbs that drift behind the content. */}
          <div className="pointer-events-none absolute inset-0 overflow-hidden">
            <motion.div
              aria-hidden
              className="absolute left-1/2 top-1/3 h-72 w-72 -translate-x-1/2 rounded-full blur-[120px]"
              animate={{
                backgroundColor: `${step.accent}33`,
                scale: [1, 1.15, 1],
                opacity: [0.6, 0.9, 0.6],
              }}
              transition={{
                backgroundColor: { duration: 0.6 },
                scale: { duration: 8, repeat: Infinity, ease: "easeInOut" },
                opacity: { duration: 8, repeat: Infinity, ease: "easeInOut" },
              }}
            />
          </div>

          <div className="relative flex items-center justify-end p-5">
            <button
              onClick={dismiss}
              className="text-sm font-medium text-white/40 transition active:scale-95"
            >
              Skip
            </button>
          </div>

          <div className="relative flex flex-1 flex-col items-center justify-center px-8 text-center">
            <AnimatePresence mode="wait">
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 18 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -14 }}
                transition={{ duration: 0.34, ease: [0.16, 1, 0.3, 1] }}
                className="flex flex-col items-center"
              >
                {/* Floating, breathing icon badge. */}
                <motion.div
                  className="mb-7 flex h-20 w-20 items-center justify-center rounded-3xl"
                  style={{
                    backgroundColor: `${step.accent}1f`,
                    boxShadow: `0 0 44px -8px ${step.accent}`,
                  }}
                  animate={{ y: [0, -8, 0] }}
                  transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
                >
                  <motion.div
                    initial={{ scale: 0.6, rotate: -8 }}
                    animate={{ scale: 1, rotate: 0 }}
                    transition={{ type: "spring", stiffness: 260, damping: 16 }}
                  >
                    <Icon className="h-9 w-9" style={{ color: step.accent }} />
                  </motion.div>
                </motion.div>

                <motion.h2
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.06, duration: 0.3 }}
                  className="font-display text-3xl font-bold text-white"
                >
                  {step.title}
                </motion.h2>
                <motion.p
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.12, duration: 0.3 }}
                  className="mt-2.5 max-w-[15rem] text-[15px] leading-relaxed text-white/55"
                >
                  {step.body}
                </motion.p>
              </motion.div>
            </AnimatePresence>
          </div>

          <div className="relative px-8 pb-[max(2rem,env(safe-area-inset-bottom))]">
            {/* Animated progress pills. */}
            <div className="mb-5 flex items-center justify-center gap-2">
              {STEPS.map((_, idx) => (
                <motion.span
                  key={idx}
                  layout
                  transition={{ type: "spring", stiffness: 400, damping: 30 }}
                  className="h-1.5 rounded-full"
                  style={{
                    width: idx === i ? 26 : 6,
                    backgroundColor: idx === i ? step.accent : "rgba(255,255,255,0.2)",
                  }}
                />
              ))}
            </div>
            <button onClick={next} className="btn btn-primary w-full py-4 text-base">
              {last ? "Enter VYBZ" : "Next"}
              <ArrowRight className="h-4 w-4" />
            </button>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

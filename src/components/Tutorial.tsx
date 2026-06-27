import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  ArrowRight,
  EyeOff,
  Heart,
  MessagesSquare,
  PenLine,
  Sparkles,
  type LucideIcon,
} from "lucide-react";

const SEEN_KEY = "veiled.tutorialSeen";

interface Step {
  icon: LucideIcon;
  accent: string;
  title: string;
  body: string;
}

const STEPS: Step[] = [
  {
    icon: Sparkles,
    accent: "#c77dff",
    title: "Welcome to MYVYB",
    body: "Anonymous confessions from people near you. Read what others would never say out loud — and share what you can't.",
  },
  {
    icon: Heart,
    accent: "#34f5a0",
    title: "Feel it or Veil it",
    body: "Swipe right to Feel a confession — it boosts it. Swipe left to Veil it: if enough people do, it fades into the dark for everyone.",
  },
  {
    icon: MessagesSquare,
    accent: "#5b8cff",
    title: "Connect with anyone",
    body: "Every post is open — read the comments, leave your own, or message the poster privately. Photos are clear; anything sensitive is tucked behind a tap.",
  },
  {
    icon: PenLine,
    accent: "#ff5d8f",
    title: "Share your own",
    body: "Tap + to confess. Add a photo if you like — anything sensitive is auto-flagged and tucked behind a tap. You stay anonymous, always.",
  },
];

/** A one-time, swipeable intro that explains how MYVYB works. */
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
      // Non-fatal.
    }
    setVisible(false);
  }

  function next() {
    if (i < STEPS.length - 1) setI((n) => n + 1);
    else dismiss();
  }

  const step = STEPS[i];
  const Icon = step.icon;

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[70] mx-auto flex max-w-md flex-col bg-ink-950/95 backdrop-blur-xl"
        >
          {/* Ambient glow. */}
          <div className="pointer-events-none absolute inset-0 bg-veil-radial opacity-80" />

          <div className="relative flex items-center justify-end p-5">
            <button
              onClick={dismiss}
              className="text-sm font-medium text-white/45 transition active:scale-95"
            >
              Skip
            </button>
          </div>

          <div className="relative flex flex-1 flex-col items-center justify-center px-8 text-center">
            <AnimatePresence mode="wait">
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -16 }}
                transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
                className="flex flex-col items-center"
              >
                <div
                  className="mb-6 flex h-20 w-20 items-center justify-center rounded-3xl"
                  style={{
                    backgroundColor: `${step.accent}1f`,
                    boxShadow: `0 0 40px -8px ${step.accent}`,
                  }}
                >
                  <Icon className="h-9 w-9" style={{ color: step.accent }} />
                </div>
                <h2 className="font-display text-3xl font-bold text-white">
                  {step.title}
                </h2>
                <p className="mt-3 max-w-xs text-base leading-relaxed text-white/60">
                  {step.body}
                </p>
              </motion.div>
            </AnimatePresence>

            {/* Live mini-legend for the swipe step. */}
            {i === 1 && (
              <div className="mt-8 flex items-center gap-6">
                <div className="flex flex-col items-center gap-1 text-shroud">
                  <EyeOff className="h-6 w-6" />
                  <span className="text-[11px] font-semibold">← Fail</span>
                </div>
                <div className="flex flex-col items-center gap-1 text-feel">
                  <Heart className="h-6 w-6" />
                  <span className="text-[11px] font-semibold">Vyb →</span>
                </div>
              </div>
            )}
          </div>

          <div className="relative px-8 pb-[max(2rem,env(safe-area-inset-bottom))]">
            <div className="mb-5 flex items-center justify-center gap-2">
              {STEPS.map((_, idx) => (
                <span
                  key={idx}
                  className={
                    idx === i
                      ? "h-1.5 w-6 rounded-full bg-veil-400"
                      : "h-1.5 w-1.5 rounded-full bg-white/20"
                  }
                />
              ))}
            </div>
            <button
              onClick={next}
              className="flex w-full items-center justify-center gap-2 rounded-2xl bg-veil-500 py-4 font-display text-base font-semibold text-white shadow-glow transition active:scale-[0.98]"
            >
              {i < STEPS.length - 1 ? "Next" : "Start confessing"}
              <ArrowRight className="h-4 w-4" />
            </button>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

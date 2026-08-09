import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Sparkles } from "lucide-react";
import {
  ALPHA_GUIDE_STEPS,
  hasCompletedAlphaWelcome,
  markAlphaWelcomeComplete,
} from "@/lib/alphaWelcome";
import { useReduceFx } from "@/lib/display";
import { cx } from "@/lib/utils";

const OPEN_FEEDBACK_EVENT = "vybz:open-feedback";
const PULSE_FAB_EVENT = "vybz:pulse-feedback-fab";

export function requestOpenFeedback(): void {
  window.dispatchEvent(new CustomEvent(OPEN_FEEDBACK_EVENT));
}

export function requestPulseFeedbackFab(): void {
  window.dispatchEvent(new CustomEvent(PULSE_FAB_EVENT));
}

export { OPEN_FEEDBACK_EVENT, PULSE_FAB_EVENT };

/**
 * First-run Alpha welcome + brief suite guide. Shown once per signed-in user
 * after they clear the invite gate (Suite shell only).
 */
export function AlphaWelcomeTour({ userId }: { userId: string }) {
  const reduce = useReduceFx();
  const [open, setOpen] = useState(() => !hasCompletedAlphaWelcome(userId));
  const [step, setStep] = useState(0);

  useEffect(() => {
    setOpen(!hasCompletedAlphaWelcome(userId));
    setStep(0);
  }, [userId]);

  function finish() {
    markAlphaWelcomeComplete(userId);
    setOpen(false);
    requestPulseFeedbackFab();
  }

  function next() {
    if (step >= ALPHA_GUIDE_STEPS.length - 1) {
      finish();
      return;
    }
    setStep((s) => s + 1);
  }

  const current = ALPHA_GUIDE_STEPS[step]!;
  const isLast = step === ALPHA_GUIDE_STEPS.length - 1;

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-0 z-[85] flex items-end justify-center sm:items-center"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          data-testid="alpha-welcome-tour"
        >
          <div className="absolute inset-0 bg-ink-950/75 backdrop-blur-sm" aria-hidden />
          <motion.div
            role="dialog"
            aria-modal="true"
            aria-labelledby="alpha-welcome-title"
            initial={reduce ? { opacity: 0 } : { y: 28, opacity: 0, scale: 0.97 }}
            animate={{ y: 0, opacity: 1, scale: 1 }}
            exit={reduce ? { opacity: 0 } : { y: 20, opacity: 0, scale: 0.98 }}
            transition={{ type: "spring", stiffness: 320, damping: 30 }}
            className="forge-glass relative z-10 m-3 w-full max-w-md rounded-3xl p-5 sm:m-0"
          >
            <span className="forge-glass-edge" aria-hidden />
            <div className="relative z-[1]">
              <div className="mb-3 flex items-center gap-2 text-[rgb(var(--accent-rgb)/0.95)]">
                <Sparkles className="h-5 w-5" aria-hidden />
                <span className="text-[11px] font-semibold uppercase tracking-[0.14em] text-white/45">
                  Alpha · step {step + 1} of {ALPHA_GUIDE_STEPS.length}
                </span>
              </div>
              <h2 id="alpha-welcome-title" className="font-display text-xl font-bold tracking-tight text-white">
                {current.title}
              </h2>
              <p className="mt-2 text-sm leading-relaxed text-white/60">{current.body}</p>

              {"highlights" in current && current.highlights ? (
                <ul className="mt-4 space-y-2" data-testid="alpha-welcome-highlights">
                  {current.highlights.map((h) => (
                    <li
                      key={h.label}
                      className="rounded-2xl border border-white/10 bg-white/[0.04] px-3 py-2.5"
                    >
                      <p className="font-display text-[13px] font-semibold text-white">{h.label}</p>
                      <p className="mt-0.5 text-[12px] text-white/50">{h.blurb}</p>
                    </li>
                  ))}
                </ul>
              ) : null}

              {isLast ? (
                <p className="mt-4 rounded-2xl border border-[rgb(var(--accent-rgb)/0.35)] bg-[rgb(var(--accent-rgb)/0.1)] px-3 py-2.5 text-[12px] text-white/75">
                  The glowing <span className="font-semibold text-white">bug</span> button stays on screen —
                  open it whenever something feels off or you have an idea.
                </p>
              ) : null}

              <div className="mt-5 flex items-center gap-2">
                <div className="flex flex-1 gap-1.5" aria-hidden>
                  {ALPHA_GUIDE_STEPS.map((s, i) => (
                    <span
                      key={s.id}
                      className={cx(
                        "h-1 flex-1 rounded-full transition",
                        i <= step ? "bg-[rgb(var(--accent-rgb)/0.85)]" : "bg-white/12",
                      )}
                    />
                  ))}
                </div>
                <button
                  type="button"
                  onClick={finish}
                  className="text-xs text-white/40 transition hover:text-white/70"
                >
                  Skip
                </button>
                <button
                  type="button"
                  onClick={next}
                  className="forge-cta min-h-[2.5rem] px-4 text-sm"
                  data-testid="alpha-welcome-next"
                >
                  {isLast ? "Got it" : "Next"}
                </button>
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Loader2, Sparkles, UserRound } from "lucide-react";
import {
  ALPHA_GUIDE_STEPS,
  hasCompletedAlphaWelcome,
  isValidUsername,
  markAlphaWelcomeComplete,
  withName,
} from "@/lib/alphaWelcome";
import { useSession } from "@/store/session";
import * as api from "@/lib/api";
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
 * First-run Alpha welcome, and the place a new account picks its artist name.
 *
 * Step 2 collects the username and cannot be skipped. It replaces the old
 * full-page `UsernameSetup` blocker, so the first thing after sign-in is a
 * welcome rather than a form. The tour re-opens on every load while the name is
 * still missing, so dismissing it cannot strand an account without one.
 */
export function AlphaWelcomeTour({
  userId,
  username,
}: {
  userId: string;
  username: string | null;
}) {
  const reduce = useReduceFx();
  const { refreshProfile, showToast } = useSession();
  const needsUsername = !username?.trim();
  const [open, setOpen] = useState(() => needsUsername || !hasCompletedAlphaWelcome(userId));
  const [step, setStep] = useState(0);

  const [nameDraft, setNameDraft] = useState("");
  const [savingName, setSavingName] = useState(false);
  const [nameError, setNameError] = useState<string | null>(null);

  useEffect(() => {
    setOpen(needsUsername || !hasCompletedAlphaWelcome(userId));
    setStep(0);
  }, [userId, needsUsername]);

  function finish() {
    // Never let the tour close over a missing name.
    if (needsUsername) {
      setStep(ALPHA_GUIDE_STEPS.findIndex((s) => s.id === "username"));
      return;
    }
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

  async function saveUsername(e: React.FormEvent) {
    e.preventDefault();
    const value = nameDraft.trim();
    if (!isValidUsername(value)) {
      setNameError("3–24 characters: letters, numbers, _ or .");
      return;
    }
    setSavingName(true);
    setNameError(null);
    const free = await api.usernameAvailable(value);
    if (!free) {
      setSavingName(false);
      setNameError("That name is taken.");
      return;
    }
    const { error } = await api.updateMyProfile({ username: value, displayName: value });
    setSavingName(false);
    if (error) {
      setNameError(error);
      return;
    }
    showToast(`Welcome to VYBZ, ${value}`);
    await refreshProfile();
    setStep((s) => s + 1);
  }

  const current = ALPHA_GUIDE_STEPS[step]!;
  const isLast = step === ALPHA_GUIDE_STEPS.length - 1;
  const isUsernameStep = "kind" in current && current.kind === "username";
  // The name step gates the tour; everything after it may be skipped.
  const blocked = isUsernameStep && needsUsername;

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
                {withName(current.title, username)}
              </h2>
              <p className="mt-2 text-sm leading-relaxed text-white/60">
                {withName(current.body, username)}
              </p>

              {isUsernameStep ? (
                needsUsername ? (
                  <form onSubmit={saveUsername} className="mt-4" data-testid="alpha-username-step">
                    <label className="forge-field !py-2">
                      <UserRound className="h-4 w-4 shrink-0 text-white/35" aria-hidden />
                      <input
                        value={nameDraft}
                        onChange={(e) => {
                          setNameDraft(e.target.value.replace(/\s/g, ""));
                          if (nameError) setNameError(null);
                        }}
                        placeholder="yourname"
                        aria-label="Artist or producer name"
                        autoFocus
                        data-testid="alpha-username-input"
                      />
                    </label>
                    {nameError ? (
                      <p className="mt-2 text-xs font-medium text-wild" role="alert">
                        {nameError}
                      </p>
                    ) : null}
                    <button
                      type="submit"
                      disabled={savingName || !isValidUsername(nameDraft)}
                      className="forge-cta mt-3 w-full disabled:opacity-40"
                      data-testid="alpha-username-save"
                    >
                      {savingName ? <Loader2 className="h-4 w-4 animate-spin" /> : "Claim this name"}
                    </button>
                  </form>
                ) : (
                  <p
                    className="mt-4 rounded-2xl border border-[rgb(var(--accent-rgb)/0.35)] bg-[rgb(var(--accent-rgb)/0.1)] px-3 py-2.5 text-[13px] text-white/80"
                    data-testid="alpha-username-claimed"
                  >
                    You are <span className="font-semibold text-white">{username}</span> on VYBZ.
                  </p>
                )
              ) : null}

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
                {blocked ? null : (
                  <button
                    type="button"
                    onClick={finish}
                    className="text-xs text-white/40 transition hover:text-white/70"
                  >
                    Skip
                  </button>
                )}
                {blocked ? null : (
                  <button
                    type="button"
                    onClick={next}
                    className="forge-cta min-h-[2.5rem] px-4 text-sm"
                    data-testid="alpha-welcome-next"
                  >
                    {isLast ? "Got it" : "Next"}
                  </button>
                )}
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

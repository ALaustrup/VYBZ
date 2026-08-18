import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { AnimatePresence, motion } from "framer-motion";
import { Fingerprint, Loader2, Lock, Sparkles, UserRound } from "lucide-react";
import {
  ALPHA_GUIDE_STEPS,
  hasCompletedAlphaWelcome,
  isValidUsername,
  markAlphaWelcomeComplete,
  withName,
} from "@/lib/alphaWelcome";
import { useSession } from "@/store/session";
import * as api from "@/lib/api";
import { passkeysSupported, registerPasskey } from "@/lib/passkey";
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
  const navigate = useNavigate();
  const { refreshProfile, showToast } = useSession();
  const needsUsername = !username?.trim();
  const [open, setOpen] = useState(() => needsUsername || !hasCompletedAlphaWelcome(userId));
  const [step, setStep] = useState(0);

  const [nameDraft, setNameDraft] = useState("");
  const [savingName, setSavingName] = useState(false);
  const [nameError, setNameError] = useState<string | null>(null);
  const [securityDone, setSecurityDone] = useState(() => !needsUsername);
  const [securityBusy, setSecurityBusy] = useState<null | "passkey" | "password">(null);
  const [securityError, setSecurityError] = useState<string | null>(null);
  const [newPassword, setNewPassword] = useState("");
  const [pk] = useState(() => passkeysSupported());

  useEffect(() => {
    setOpen(needsUsername || !hasCompletedAlphaWelcome(userId));
  }, [userId, needsUsername]);

  useEffect(() => {
    setStep(0);
    setSecurityDone(!!username?.trim());
    // username is sampled at account switch only — claiming a name must not skip security.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId]);

  function finish() {
    // Never let the tour close over a missing name.
    if (needsUsername) {
      setStep(ALPHA_GUIDE_STEPS.findIndex((s) => s.id === "username"));
      return;
    }
    if (!securityDone) {
      setStep(ALPHA_GUIDE_STEPS.findIndex((s) => s.id === "security"));
      return;
    }
    markAlphaWelcomeComplete(userId);
    setOpen(false);
    navigate("/live", { replace: true });
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
    setStep(ALPHA_GUIDE_STEPS.findIndex((s) => s.id === "security"));
  }

  async function addPasskey() {
    setSecurityBusy("passkey");
    setSecurityError(null);
    try {
      const { verified } = await registerPasskey();
      if (!verified) {
        setSecurityError("Couldn’t add that passkey. Try again or set a password.");
        return;
      }
      setSecurityDone(true);
      showToast("Passkey added");
    } catch (e) {
      const name = (e as { name?: string }).name;
      if (name !== "NotAllowedError" && name !== "AbortError") {
        setSecurityError("Couldn’t add that passkey. Try a password.");
      }
    } finally {
      setSecurityBusy(null);
    }
  }

  async function savePassword(e: React.FormEvent) {
    e.preventDefault();
    if (newPassword.trim().length < 8) {
      setSecurityError("Password needs at least 8 characters.");
      return;
    }
    setSecurityBusy("password");
    setSecurityError(null);
    const { error } = await api.setAccountPassword(newPassword);
    setSecurityBusy(null);
    if (error) {
      setSecurityError(error);
      return;
    }
    setSecurityDone(true);
    showToast("Password saved");
  }

  const current = ALPHA_GUIDE_STEPS[step]!;
  const isLast = step === ALPHA_GUIDE_STEPS.length - 1;
  const isUsernameStep = "kind" in current && current.kind === "username";
  const isSecurityStep = "kind" in current && current.kind === "security";
  const blocked = (isUsernameStep && needsUsername) || (isSecurityStep && !securityDone);

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
                        aria-label="Your name"
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

              {isSecurityStep ? (
                <div className="mt-4 space-y-3" data-testid="alpha-security-step">
                  {securityDone ? (
                    <p className="rounded-2xl border border-[rgb(var(--accent-rgb)/0.35)] bg-[rgb(var(--accent-rgb)/0.1)] px-3 py-2.5 text-[13px] text-white/80">
                      You can get back in with a passkey or password on this email.
                    </p>
                  ) : (
                    <>
                      {pk ? (
                        <button
                          type="button"
                          onClick={() => void addPasskey()}
                          disabled={!!securityBusy}
                          className="forge-cta w-full disabled:opacity-40"
                          data-testid="alpha-security-passkey"
                        >
                          {securityBusy === "passkey"
                            ? <Loader2 className="h-4 w-4 animate-spin" />
                            : <><Fingerprint className="h-4 w-4" /> Add a passkey</>}
                        </button>
                      ) : (
                        <p className="text-[12px] text-white/45">This device does not support passkeys. Set a password.</p>
                      )}
                      <form onSubmit={savePassword} className="space-y-2">
                        <label className="forge-field !py-2">
                          <Lock className="h-4 w-4 shrink-0 text-white/35" aria-hidden />
                          <input
                            type="password"
                            value={newPassword}
                            onChange={(e) => {
                              setNewPassword(e.target.value);
                              if (securityError) setSecurityError(null);
                            }}
                            placeholder="Password (8+ characters)"
                            autoComplete="new-password"
                            minLength={8}
                            data-testid="alpha-security-password"
                          />
                        </label>
                        <button
                          type="submit"
                          disabled={securityBusy === "password" || newPassword.trim().length < 8}
                          className="forge-cta-ghost w-full min-h-[2.5rem] disabled:opacity-40"
                          data-testid="alpha-security-password-save"
                        >
                          {securityBusy === "password"
                            ? <Loader2 className="h-4 w-4 animate-spin" />
                            : "Save password"}
                        </button>
                      </form>
                    </>
                  )}
                  {securityError ? (
                    <p className="text-xs font-medium text-wild" role="alert">{securityError}</p>
                  ) : null}
                </div>
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

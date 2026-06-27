import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowLeft, Fingerprint, Loader2, Mail, Sparkles } from "lucide-react";
import { useApp } from "@/store/AppStore";
import { BrandMark, Wordmark } from "@/components/Brand";
import { passkeysSupported, signInWithPasskey } from "@/lib/passkey";

type Step = "welcome" | "login";
const EMAIL_RE = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;

/**
 * One-button entry. New visitors tap "Find Yours" and are dropped straight in
 * with an auto-issued guest username — zero forms. Returning users are restored
 * automatically before this screen ever shows (see App's authLoading gate); the
 * quiet "Log in" link recovers an existing account on a new device. Creating a
 * real account (email verification) now happens later, inside Settings.
 */
export function Onboarding() {
  const { findYours, signInWithEmail, showToast } = useApp();
  const [step, setStep] = useState<Step>("welcome");
  const [email, setEmail] = useState("");
  const [busy, setBusy] = useState(false);

  async function find() {
    if (busy) return;
    setBusy(true);
    try {
      await findYours();
    } finally {
      setBusy(false);
    }
  }

  async function loginPasskey() {
    setBusy(true);
    const ok = await signInWithPasskey().catch(() => false);
    setBusy(false);
    if (!ok) showToast("Passkey sign-in was cancelled or unavailable.");
  }

  async function loginEmail() {
    if (!EMAIL_RE.test(email)) {
      showToast("Enter your email to get a sign-in link.");
      return;
    }
    setBusy(true);
    const { error } = await signInWithEmail(email.trim());
    setBusy(false);
    showToast(error ? error : "Check your email for a sign-in link.");
  }

  return (
    <div className="relative mx-auto flex h-[100dvh] max-w-md flex-col overflow-hidden bg-ink-950">
      {/* Ambient backdrop. */}
      <div className="pointer-events-none absolute inset-0">
        <motion.div
          className="absolute -left-24 -top-24 h-80 w-80 rounded-full bg-veil-600/15 blur-[120px]"
          animate={{ x: [0, 24, 0], y: [0, 16, 0] }}
          transition={{ duration: 16, repeat: Infinity, ease: "easeInOut" }}
        />
        <motion.div
          className="absolute -bottom-24 -right-24 h-96 w-96 rounded-full bg-glow/10 blur-[140px]"
          animate={{ x: [0, -18, 0], y: [0, -12, 0] }}
          transition={{ duration: 18, repeat: Infinity, ease: "easeInOut" }}
        />
      </div>

      <div className="no-scrollbar relative flex-1 overflow-y-auto">
        <div className="flex min-h-full flex-col items-center justify-center px-8 py-10 pb-[calc(env(safe-area-inset-bottom,0px)+2.5rem)] text-center">
          <AnimatePresence mode="wait">
            {step === "welcome" && (
              <motion.div
                key="welcome"
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -16 }}
                className="flex w-full flex-col items-center"
              >
                <BrandMark className="mb-5 h-16 w-16" />
                <Wordmark imgClassName="h-10 w-auto" textClassName="text-4xl" />
                <p className="mt-5 max-w-[17rem] text-[15px] leading-relaxed text-white/60">
                  Anonymous confessions — a feed you control. Vyb what you love,
                  Fail what you don't.
                </p>

                <button
                  onClick={find}
                  disabled={busy}
                  className="mt-9 flex w-full items-center justify-center gap-2 rounded-2xl bg-veil-500 py-4 font-display text-lg font-bold text-white shadow-glow transition active:scale-[0.98] disabled:opacity-60"
                >
                  {busy ? (
                    <Loader2 className="h-5 w-5 animate-spin" />
                  ) : (
                    <>
                      <Sparkles className="h-5 w-5" /> Find Yours
                    </>
                  )}
                </button>
                <p className="mt-3 max-w-[18rem] text-[12px] leading-relaxed text-white/40">
                  Jump straight in with an instant anonymous username. Make it
                  yours and verify your email later in Settings.
                </p>
                <button
                  onClick={() => setStep("login")}
                  className="mt-6 text-[13px] font-medium text-white/45 underline-offset-2 transition hover:text-white/70"
                >
                  Already have an account? Log in
                </button>
              </motion.div>
            )}

            {step === "login" && (
              <motion.div
                key="login"
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -16 }}
                className="flex w-full flex-col items-center"
              >
                <BackButton onClick={() => setStep("welcome")} />
                <h1 className="font-display text-2xl font-bold text-white">Welcome back</h1>
                <p className="mt-1.5 text-sm text-white/55">Sign in to your MYVYB account.</p>

                {passkeysSupported() && (
                  <button
                    onClick={loginPasskey}
                    disabled={busy}
                    className="mt-6 flex w-full items-center justify-center gap-2 rounded-2xl bg-veil-500 py-4 font-semibold text-white shadow-glow transition active:scale-[0.98]"
                  >
                    <Fingerprint className="h-5 w-5" /> Sign in with a passkey
                  </button>
                )}

                <div className="mt-4 flex w-full items-center gap-2 rounded-2xl border border-white/10 bg-white/[0.04] px-3">
                  <Mail className="h-4 w-4 shrink-0 text-white/40" />
                  <input
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    type="email"
                    inputMode="email"
                    placeholder="you@email.com"
                    className="w-full bg-transparent py-3.5 text-sm text-white placeholder:text-white/30 focus:outline-none"
                  />
                </div>
                <button
                  onClick={loginEmail}
                  disabled={busy}
                  className="mt-3 w-full rounded-2xl border border-white/10 bg-white/[0.03] py-3.5 font-semibold text-white/80 transition active:scale-[0.98]"
                >
                  Email me a sign-in link
                </button>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}

function BackButton({ onClick }: { onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      aria-label="Back"
      className="mb-4 flex h-9 w-9 items-center justify-center self-start rounded-full glass active:scale-90"
    >
      <ArrowLeft className="h-4 w-4" />
    </button>
  );
}

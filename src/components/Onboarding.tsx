import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  ArrowLeft,
  ArrowRight,
  Check,
  Fingerprint,
  Loader2,
  Mail,
  MapPin,
  Sparkles,
} from "lucide-react";
import { useApp } from "@/store/AppStore";
import { BrandMark, Wordmark } from "@/components/Brand";
import { passkeysSupported, signInWithPasskey } from "@/lib/passkey";
import { cx } from "@/lib/utils";
import type { Gender } from "@/types";

type Step = "welcome" | "register" | "login";
const EMAIL_RE = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;

/**
 * One-button entry. New visitors tap "Find Yours" and are dropped straight in
 * with an auto-issued guest username — zero forms. Returning users are restored
 * automatically before this screen ever shows (see App's authLoading gate); the
 * quiet "Log in" link recovers an existing account on a new device. Creating a
 * real account (email verification) now happens later, inside Settings.
 */
export function Onboarding() {
  const { findYours, registerQuick, signInWithEmail, showToast } = useApp();
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
                <p className="mt-5 max-w-[16rem] text-[15px] leading-relaxed text-white/60">
                  Anonymous social, your way. Express, swipe, meet by vibe.
                </p>

                <button
                  onClick={() => setStep("register")}
                  disabled={busy}
                  className="btn btn-primary mt-9 w-full py-4 text-lg"
                >
                  <Sparkles className="h-5 w-5" /> Get started
                </button>
                <p className="mt-3 max-w-[18rem] text-[12px] leading-relaxed text-white/40">
                  Age, sex &amp; location only. ~10 seconds, no email.
                </p>

                <button
                  onClick={find}
                  disabled={busy}
                  className="btn btn-ghost mt-5 w-full py-3.5"
                >
                  {busy ? (
                    <Loader2 className="h-5 w-5 animate-spin" />
                  ) : (
                    <>Just browse for now</>
                  )}
                </button>

                <button
                  onClick={() => setStep("login")}
                  className="mt-6 text-[13px] font-medium text-white/45 underline-offset-2 transition hover:text-white/70"
                >
                  Already have an account? Log in
                </button>
              </motion.div>
            )}

            {step === "register" && (
              <motion.div
                key="register"
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -16 }}
                className="flex w-full flex-col items-center"
              >
                <RegisterStep
                  onBack={() => setStep("welcome")}
                  onDone={(identity) => registerQuick(identity, true)}
                  onShowToast={showToast}
                />
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
                    className="btn btn-primary mt-6 w-full py-4"
                  >
                    <Fingerprint className="h-5 w-5" /> Sign in with a passkey
                  </button>
                )}

                <div className="mt-4 flex w-full items-center gap-2 rounded-xl border border-white/10 bg-white/[0.04] px-3 focus-within:border-veil-400/60">
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
                  className="btn btn-ghost mt-3 w-full py-3.5"
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

/**
 * The entire required registration: Age, Sex & Location + accepting the terms.
 * Nothing leaves the app — no email round-trip, no external pages. Age & sex are
 * permanent once set (they anchor the safety/age-layer rules); location can be
 * refined later and powers nearby discovery.
 */
function RegisterStep({
  onBack,
  onDone,
  onShowToast,
}: {
  onBack: () => void;
  onDone: (identity: { gender: Gender; age: number; location: string }) => void;
  onShowToast: (m: string) => void;
}) {
  const [gender, setGender] = useState<Gender | null>(null);
  const [age, setAge] = useState<string>("");
  const [location, setLocation] = useState("");
  const [agreed, setAgreed] = useState(false);

  const ageNum = parseInt(age || "0", 10);
  const ageOk = ageNum >= 13 && ageNum <= 120;
  const ready = gender != null && ageOk && location.trim().length >= 2 && agreed;

  function submit() {
    if (!ready || gender == null) {
      if (!ageOk) onShowToast("Enter a valid age (13+).");
      else if (!location.trim()) onShowToast("Add your location.");
      else if (!agreed) onShowToast("Please accept the terms to continue.");
      return;
    }
    onDone({ gender, age: ageNum, location: location.trim() });
  }

  return (
    <div className="w-full text-left">
      <BackButton onClick={onBack} />
      <BrandMark className="mb-3 h-12 w-12" />
      <h1 className="font-display text-2xl font-bold text-gradient">
        Create your profile
      </h1>
      <p className="mt-1.5 text-sm text-white/55">
        Three quick things and you're in. This is all we need.
      </p>

      {/* Sex (permanent). */}
      <p className="eyebrow mt-6 mb-2">Sex</p>
      <div className="flex gap-2">
        {(["M", "F"] as const).map((g) => (
          <button
            key={g}
            onClick={() => setGender(g)}
            className={cx(
              "btn flex-1 py-3.5",
              gender === g ? "btn-primary" : "btn-ghost"
            )}
          >
            {g === "M" ? "Male" : "Female"}
          </button>
        ))}
      </div>

      {/* Age (permanent). */}
      <p className="eyebrow mt-5 mb-2">Age</p>
      <input
        value={age}
        onChange={(e) => setAge(e.target.value.replace(/[^0-9]/g, "").slice(0, 3))}
        inputMode="numeric"
        placeholder="Your age"
        className="w-full rounded-xl border border-white/10 bg-white/[0.04] px-4 py-3.5 text-sm text-white placeholder:text-white/30 focus:border-veil-400/60 focus:outline-none"
      />

      {/* Location. */}
      <p className="eyebrow mt-5 mb-2">Location</p>
      <div className="flex items-center gap-2 rounded-xl border border-white/10 bg-white/[0.04] px-3 focus-within:border-veil-400/60">
        <MapPin className="h-4 w-4 shrink-0 text-white/40" />
        <input
          value={location}
          onChange={(e) => setLocation(e.target.value.slice(0, 60))}
          placeholder="City, country"
          className="w-full bg-transparent py-3.5 text-sm text-white placeholder:text-white/30 focus:outline-none"
        />
      </div>

      {/* Terms + transparency consent. */}
      <button
        type="button"
        onClick={() => setAgreed((v) => !v)}
        className="mt-6 flex w-full items-start gap-3 rounded-xl border border-white/10 bg-white/[0.02] p-4 text-left active:scale-[0.99]"
      >
        <span
          className={cx(
            "mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-md border transition",
            agreed ? "border-veil-400 bg-veil-500" : "border-white/25"
          )}
        >
          {agreed && <Check className="h-3.5 w-3.5 text-white" />}
        </span>
        <span className="text-[13px] leading-snug text-white/70">
          I agree to the{" "}
          <a
            href="/legal/terms"
            target="_blank"
            rel="noreferrer"
            onClick={(e) => e.stopPropagation()}
            className="font-semibold text-veil-200 underline-offset-2 hover:underline"
          >
            Terms
          </a>
          ,{" "}
          <a
            href="/legal/privacy"
            target="_blank"
            rel="noreferrer"
            onClick={(e) => e.stopPropagation()}
            className="font-semibold text-veil-200 underline-offset-2 hover:underline"
          >
            Privacy
          </a>{" "}
          &amp;{" "}
          <a
            href="/legal/transparency"
            target="_blank"
            rel="noreferrer"
            onClick={(e) => e.stopPropagation()}
            className="font-semibold text-veil-200 underline-offset-2 hover:underline"
          >
            Transparency
          </a>{" "}
          terms.
        </span>
      </button>

      <button
        onClick={submit}
        disabled={!ready}
        className="btn btn-primary mt-6 w-full py-4 text-base"
      >
        Enter MYVYB <ArrowRight className="h-5 w-5" />
      </button>
      <p className="mt-3 text-center text-[11px] leading-relaxed text-white/40">
        Add an email later in Settings to secure your account and unlock your
        wallet.
      </p>
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

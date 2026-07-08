import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  ArrowLeft,
  ArrowRight,
  Check,
  Fingerprint,
  Loader2,
  LogIn,
  Mail,
  MapPin,
  Plus,
  UserRound,
} from "lucide-react";
import { useApp } from "@/store/AppStore";
import { BrandMark, Wordmark } from "@/components/Brand";
import { passkeysSupported, signInWithPasskey } from "@/lib/passkey";
import { cx } from "@/lib/utils";
import type { Gender } from "@/types";

type Step = "welcome" | "register" | "login";
const EMAIL_RE = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;

/** "Welcome back" hint cached for recoverable accounts (see AppStore). */
interface LastIdentity {
  name: string | null;
  avatarUrl: string | null;
}
function readLastIdentity(): LastIdentity | null {
  try {
    const raw = window.localStorage.getItem("veiled.lastIdentity");
    if (!raw) return null;
    const v = JSON.parse(raw) as LastIdentity;
    return v && (v.name || v.avatarUrl) ? v : null;
  } catch {
    return null;
  }
}

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
  const [last, setLast] = useState<LastIdentity | null>(() => readLastIdentity());
  const [imgOk, setImgOk] = useState(true);
  const returning = !!last;

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

  // Tapping the entry circle: returning members with a passkey sign in directly;
  // everyone else lands on the account login form.
  function enterTap() {
    if (busy) return;
    if (returning && passkeysSupported()) {
      void loginPasskey();
      return;
    }
    setStep("login");
  }

  // "Not you?" — forget this device's cached face and reset to the new-visitor
  // entry (the account itself is untouched and still recoverable via login).
  function forget() {
    try {
      window.localStorage.removeItem("veiled.lastIdentity");
    } catch {
      /* ignore */
    }
    setLast(null);
    setImgOk(true);
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
                <p className="text-gradient mt-4 font-display text-lg font-semibold tracking-tightish">
                  Social Evolved.
                </p>

                {/* The front door: a single entry avatar. Returning members see
                    their own face and tap to sign in; new visitors see a neutral
                    mark that opens the login form. */}
                <button
                  onClick={enterTap}
                  disabled={busy}
                  aria-label={
                    returning
                      ? `Sign in${last?.name ? ` as ${last.name}` : ""}`
                      : "Sign in to VYBZ"
                  }
                  className="group relative mt-9 flex flex-col items-center outline-none"
                >
                  <span className="relative flex h-28 w-28 items-center justify-center">
                    {/* Orange accent ring + glow. */}
                    <span className="absolute inset-0 rounded-full ring-2 ring-veil-500/55 shadow-glow transition group-hover:ring-veil-400/80 group-active:scale-95" />
                    <span className="relative flex h-full w-full items-center justify-center overflow-hidden rounded-full glass">
                      {busy ? (
                        <Loader2 className="h-8 w-8 animate-spin text-white/85" />
                      ) : returning && last?.avatarUrl && imgOk ? (
                        <img
                          src={last.avatarUrl}
                          alt=""
                          onError={() => setImgOk(false)}
                          className="h-full w-full object-cover"
                        />
                      ) : (
                        <UserRound
                          className="h-12 w-12 text-white/85"
                          strokeWidth={2}
                        />
                      )}
                    </span>
                    {/* Corner badge — sign-in arrow for returning, "+" for new. */}
                    <span className="btn btn-primary absolute -bottom-1 -right-1 h-9 w-9 rounded-full !p-0">
                      {returning ? (
                        <LogIn className="h-4 w-4" />
                      ) : (
                        <Plus className="h-4 w-4" />
                      )}
                    </span>
                  </span>

                  <span className="mt-5 text-[15px] font-semibold text-white">
                    {returning
                      ? `Welcome back${last?.name ? `, ${last.name}` : ""}`
                      : "Tap to sign in"}
                  </span>
                  <span className="mt-1 text-[12px] leading-relaxed text-white/45">
                    {returning
                      ? "Tap your photo to continue"
                      : "Sign in to your VYBZ account"}
                  </span>
                </button>

                {/* Join + secondary affordances. */}
                <div className="mt-8 flex flex-col items-center gap-3.5">
                  <button
                    onClick={() => setStep("register")}
                    className="text-[13px] font-medium text-white/55 transition hover:text-white/80"
                  >
                    {returning ? "Use a different account · " : "New here? "}
                    <span className="font-semibold text-veil-200 underline-offset-2 hover:underline">
                      Join VYBZ
                    </span>
                  </button>

                  {returning && (
                    <button
                      onClick={forget}
                      className="text-[12px] text-white/40 underline-offset-2 transition hover:text-white/60"
                    >
                      Not you? Forget this device
                    </button>
                  )}

                  <button
                    onClick={find}
                    disabled={busy}
                    className="text-[12px] text-white/35 underline-offset-2 transition hover:text-white/55"
                  >
                    Just browse for now
                  </button>
                </div>
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
                <p className="mt-1.5 text-sm text-white/55">Sign in to your VYBZ account.</p>

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

                <button
                  onClick={() => setStep("register")}
                  className="mt-6 text-[13px] font-medium text-white/50 transition hover:text-white/80"
                >
                  New to VYBZ?{" "}
                  <span className="font-semibold text-veil-200 underline-offset-2 hover:underline">
                    Join VYBZ
                  </span>
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
        Enter VYBZ <ArrowRight className="h-5 w-5" />
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

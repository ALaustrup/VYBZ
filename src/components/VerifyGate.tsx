import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Check, Loader2, Mail, ShieldAlert, ShieldCheck, X } from "lucide-react";
import { useApp } from "@/store/AppStore";
import * as backend from "@/lib/backend";
import { cx } from "@/lib/utils";
import type { Gender } from "@/types";

interface VerifyGateProps {
  open: boolean;
  onClose: () => void;
  /** "nsfw" requires 18+; "chat" routes by age layer (13–17 / 18+). */
  mode: "nsfw" | "chat";
  /** Called once the gate is satisfied (verified + age/sex set + consent). */
  onComplete?: () => void;
}

/**
 * Progressive verification gate for the two age-sensitive features: sensitive
 * (NSFW) content and random chat. Both require (1) a verified email — which also
 * upgrades a guest into a member — and (2) a permanent age + sex tied to that
 * email. The user is encouraged to read the Terms before consenting; age and sex
 * can never be changed once entered.
 */
export function VerifyGate({ open, onClose, mode, onComplete }: VerifyGateProps) {
  const {
    contactVerified,
    refreshContactVerified,
    unlockNsfw,
    identity,
    updateIdentity,
    identityPublic,
    showToast,
  } = useApp();

  const [email, setEmail] = useState("");
  const [linkedEmail, setLinkedEmail] = useState<string | null>(null);
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);
  const [checking, setChecking] = useState(false);

  const lockedAge = identity.age ?? null;
  const lockedGender = (identity.gender as Gender | undefined) ?? null;
  const [age, setAge] = useState<number>(lockedAge ?? 18);
  const [gender, setGender] = useState<Gender | null>(lockedGender);
  const [consent, setConsent] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    setSent(false);
    setConsent(false);
    setAge(identity.age ?? 18);
    setGender((identity.gender as Gender | undefined) ?? null);
    void backend.getLinkedEmail().then((e) => {
      setLinkedEmail(e);
      if (e) setEmail(e);
    });
    void refreshContactVerified();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const ageSexSet = lockedAge != null && lockedGender != null;
  const effAge = ageSexSet ? (lockedAge as number) : age;
  const effGender = ageSexSet ? lockedGender : gender;
  const adult = effAge >= 18;
  const ageSexReady = effGender != null && effAge >= 13 && effAge <= 120;
  const nsfwAgeOk = mode === "nsfw" ? adult : true;
  const ready = contactVerified && ageSexReady && nsfwAgeOk && consent;

  async function sendLink() {
    const value = email.trim();
    if (!/^\S+@\S+\.\S+$/.test(value)) {
      showToast("Enter a valid email address.");
      return;
    }
    setSending(true);
    const { error } = await backend.linkEmail(value);
    setSending(false);
    if (error) {
      showToast(error);
      return;
    }
    setSent(true);
    showToast("Verification link sent — check your inbox.");
  }

  async function recheck() {
    setChecking(true);
    const ok = await refreshContactVerified();
    setChecking(false);
    if (!ok) showToast("Not verified yet — tap the link in your email.");
  }

  async function complete() {
    if (!ready || saving) return;
    setSaving(true);
    try {
      // Persist age + sex permanently (first save is locked by the DB trigger).
      if (!ageSexSet && effGender != null) {
        updateIdentity(
          { gender: effGender, age: effAge, location: identity.location },
          identityPublic
        );
      }
      if (mode === "nsfw") {
        if (!unlockNsfw()) {
          showToast("Verify your email first.");
          setSaving(false);
          return;
        }
        showToast("Sensitive content unlocked.");
      }
      onComplete?.();
      onClose();
    } finally {
      setSaving(false);
    }
  }

  const title = mode === "nsfw" ? "Unlock sensitive content" : "Set up random chat";

  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 z-[61] bg-black/80 backdrop-blur-sm"
          />
          <motion.div
            initial={{ y: "100%" }}
            animate={{ y: 0 }}
            exit={{ y: "100%" }}
            transition={{ type: "spring", stiffness: 320, damping: 34 }}
            className="fixed inset-x-0 bottom-0 z-[61] mx-auto flex max-h-[94%] max-w-md flex-col rounded-t-3xl border-t border-white/10 bg-ink-900"
          >
            <div className="mx-auto mt-3 h-1.5 w-12 rounded-full bg-white/20" />
            <div className="flex items-center justify-between px-5 py-3">
              <h2 className="flex items-center gap-2 font-display text-lg font-bold text-white">
                <ShieldAlert className="h-5 w-5 text-wild" />
                {title}
              </h2>
              <button
                onClick={onClose}
                aria-label="Close"
                className="flex h-9 w-9 items-center justify-center rounded-full glass active:scale-90"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="no-scrollbar overflow-y-auto px-5 pb-[max(1.5rem,env(safe-area-inset-bottom))]">
              <p className="mb-4 text-sm leading-relaxed text-white/60">
                {mode === "nsfw"
                  ? "Sensitive content stays off for everyone by default. To turn it on, verify your email and confirm your age and sex."
                  : "Random chat matches you safely within your own age layer. Verify your email and set your age and sex to begin."}
              </p>

              {/* Step 1 — verified email (also creates your account). */}
              <Step n="1" done={contactVerified} label="Verify your email">
                {contactVerified ? (
                  <p className="flex items-center gap-1.5 text-sm text-feel">
                    <ShieldCheck className="h-4 w-4" />
                    Verified{linkedEmail ? ` as ${linkedEmail}` : ""}.
                  </p>
                ) : (
                  <>
                    <div className="flex gap-2">
                      <div className="flex flex-1 items-center gap-2 rounded-xl border border-white/10 bg-white/[0.03] px-3">
                        <Mail className="h-4 w-4 text-white/40" />
                        <input
                          value={email}
                          onChange={(e) => setEmail(e.target.value)}
                          inputMode="email"
                          placeholder="you@email.com"
                          className="w-full bg-transparent py-2.5 text-sm text-white placeholder:text-white/30 focus:outline-none"
                        />
                      </div>
                      <button
                        onClick={sendLink}
                        disabled={sending}
                        className="rounded-xl bg-veil-500 px-3 text-sm font-semibold text-white active:scale-95 disabled:opacity-50"
                      >
                        {sending ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : sent ? (
                          "Resend"
                        ) : (
                          "Send link"
                        )}
                      </button>
                    </div>
                    {sent && (
                      <button
                        onClick={recheck}
                        disabled={checking}
                        className="mt-2 flex w-full items-center justify-center gap-1.5 rounded-xl border border-white/10 py-2 text-xs font-semibold text-white/70 active:scale-95"
                      >
                        {checking && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                        I've tapped the link — check again
                      </button>
                    )}
                  </>
                )}
              </Step>

              {/* Step 2 — permanent age + sex. */}
              <Step n="2" done={ageSexSet} label="Confirm age & sex (permanent)">
                {ageSexSet ? (
                  <p className="flex items-center gap-1.5 text-sm text-feel">
                    <ShieldCheck className="h-4 w-4" />
                    Age {lockedAge} · {lockedGender === "M" ? "Male" : "Female"} — locked.
                  </p>
                ) : (
                  <div className="space-y-3">
                    <div className="flex items-center gap-2">
                      {(["M", "F"] as const).map((g) => (
                        <button
                          key={g}
                          onClick={() => setGender(g)}
                          className={cx(
                            "flex-1 rounded-xl border py-2.5 text-sm font-semibold transition active:scale-95",
                            gender === g
                              ? "border-veil-400 bg-veil-500/20 text-white"
                              : "border-white/10 bg-white/[0.03] text-white/60"
                          )}
                        >
                          {g === "M" ? "Male" : "Female"}
                        </button>
                      ))}
                    </div>
                    <label className="flex items-center justify-between gap-3 rounded-xl border border-white/10 bg-white/[0.03] px-3 py-2.5">
                      <span className="text-sm text-white/70">Age</span>
                      <input
                        type="number"
                        min={13}
                        max={120}
                        value={age}
                        onChange={(e) => setAge(parseInt(e.target.value || "0", 10))}
                        className="w-20 rounded-lg border border-white/10 bg-white/[0.04] px-2 py-1.5 text-center text-sm text-white focus:outline-none"
                      />
                    </label>
                    <p className="text-[11px] text-white/35">
                      Your age and sex are permanently tied to your email and can
                      never be changed.
                    </p>
                  </div>
                )}
              </Step>

              {/* Step 3 — terms + consent. */}
              <a
                href="/legal/terms"
                target="_blank"
                rel="noreferrer"
                className="mb-2 inline-block text-[13px] font-semibold text-veil-200 underline-offset-2 hover:underline"
              >
                Read the Terms before you continue →
              </a>
              <button
                type="button"
                onClick={() => setConsent((v) => !v)}
                className="mb-4 flex w-full items-start gap-3 rounded-2xl border border-white/8 bg-white/[0.02] p-4 text-left active:scale-[0.99]"
              >
                <span
                  className={cx(
                    "mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-md border transition",
                    consent ? "border-veil-400 bg-veil-500" : "border-white/25"
                  )}
                >
                  {consent && <Check className="h-3.5 w-3.5 text-white" />}
                </span>
                <span className="text-[13px] leading-snug text-white/70">
                  I have read the Terms and confirm I am{" "}
                  <span className="font-semibold text-white">
                    {mode === "nsfw" ? "at least 18 years old" : "the age I entered above"}
                  </span>
                  . I understand I should not share private or personal
                  information, and that VYBZ is{" "}
                  <span className="font-semibold text-white">not liable</span> for
                  anything I provide or share through the platform.
                </span>
              </button>

              {mode === "nsfw" && ageSexReady && !adult && (
                <p className="mb-3 text-[12px] font-semibold text-wild">
                  Sensitive content is 18+ only.
                </p>
              )}

              <button
                onClick={complete}
                disabled={!ready || saving}
                className="flex w-full items-center justify-center gap-2 rounded-2xl bg-wild py-3.5 font-display font-semibold text-white shadow-glow-wild transition active:scale-[0.98] disabled:cursor-not-allowed disabled:bg-white/5 disabled:text-white/30 disabled:shadow-none"
              >
                {saving ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <ShieldAlert className="h-4 w-4" />
                )}
                {mode === "nsfw" ? "Enable sensitive content" : "Start random chat"}
              </button>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}

function Step({
  n,
  done,
  label,
  children,
}: {
  n: string;
  done: boolean;
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="mb-3 rounded-2xl border border-white/8 bg-white/[0.02] p-4">
      <div className="mb-2 flex items-center gap-2 text-sm font-semibold text-white">
        <span
          className={cx(
            "flex h-5 w-5 items-center justify-center rounded-full text-[11px]",
            done ? "bg-feel text-black" : "bg-white/15 text-white"
          )}
        >
          {done ? <Check className="h-3 w-3" /> : n}
        </span>
        {label}
      </div>
      {children}
    </div>
  );
}

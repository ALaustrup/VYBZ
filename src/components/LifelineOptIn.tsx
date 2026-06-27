import { useEffect, useState } from "react";
import { Check, Heart, Loader2, ShieldAlert } from "lucide-react";
import { useApp } from "@/store/AppStore";
import {
  becomeLifeline,
  setLifelineAvailable,
  BACKEND_ENABLED,
  supabase,
} from "@/lib/backend";
import { cx } from "@/lib/utils";

/**
 * Become a Lifeline — opt-in peer-support volunteer card for the Settings sheet.
 *
 * Eligibility (mirrored server-side by become_lifeline): verified email, age 18+,
 * sex set, not banned, not anonymous. Volunteers accept a clear code of conduct
 * before opting in.
 */
export function LifelineOptIn() {
  const { contactVerified, identity, account, showToast } = useApp();
  const [optedIn, setOptedIn] = useState<boolean>(false);
  const [available, setAvailable] = useState<boolean>(false);
  const [completed, setCompleted] = useState<number>(0);
  const [consent, setConsent] = useState<boolean>(false);
  const [busy, setBusy] = useState(false);
  const [loaded, setLoaded] = useState(false);

  const eligible =
    !!account &&
    !account.anonymous &&
    contactVerified &&
    (identity.age ?? 0) >= 18 &&
    identity.gender != null;

  // Read my Lifeline flags from my profile.
  useEffect(() => {
    if (!BACKEND_ENABLED || !supabase || !account || account.anonymous) {
      setLoaded(true);
      return;
    }
    let alive = true;
    void (async () => {
      const { data } = await supabase.rpc("my_profile");
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const me = ((data as any[] | null) ?? [])[0];
      if (!alive) return;
      setOptedIn(!!me?.lifeline);
      setAvailable(!!me?.lifeline_available);
      setCompleted(me?.lifeline_completed ?? 0);
      setLoaded(true);
    })();
    return () => {
      alive = false;
    };
  }, [account]);

  async function optIn() {
    if (!eligible || !consent || busy) return;
    setBusy(true);
    const ok = await becomeLifeline("en");
    setBusy(false);
    if (ok) {
      setOptedIn(true);
      showToast("Welcome, Lifeline. Thank you for showing up.");
    } else {
      showToast("Couldn't opt in. Make sure your email + age + sex are set.");
    }
  }

  async function toggleAvailable() {
    const next = !available;
    setAvailable(next);
    setBusy(true);
    try {
      await setLifelineAvailable(next);
      if (next) showToast("You're on shift. We'll match you when someone needs you.");
      else showToast("Off shift — take your time.");
    } finally {
      setBusy(false);
    }
  }

  if (!loaded) {
    return (
      <div className="rounded-2xl border border-white/8 bg-white/[0.02] p-4 text-center text-xs text-white/40">
        <Loader2 className="mx-auto h-4 w-4 animate-spin" />
      </div>
    );
  }

  // Verified Lifeline — show the simple on-shift toggle + recognition.
  if (optedIn) {
    return (
      <div className="rounded-2xl border border-feel/25 bg-feel/[0.06] p-4">
        <div className="mb-1 flex items-center gap-2">
          <Heart className="h-4 w-4 text-feel" />
          <h3 className="font-display text-sm font-semibold text-white">You're a Lifeline</h3>
          <span className="ml-auto rounded-full bg-feel/20 px-2 py-0.5 text-[10px] font-bold text-feel">
            {completed} {completed === 1 ? "session" : "sessions"}
          </span>
        </div>
        <p className="text-xs leading-relaxed text-white/55">
          Toggle on when you're around to listen. We match the longest-waiting
          person in your age layer and language.
        </p>
        <button
          onClick={toggleAvailable}
          disabled={busy}
          className={cx(
            "mt-3 flex w-full items-center justify-between rounded-2xl border p-3.5 text-left",
            available
              ? "border-feel/40 bg-feel/15"
              : "border-white/10 bg-white/[0.03]"
          )}
        >
          <span className="text-sm font-semibold text-white">
            {available ? "On shift — accepting requests" : "Off shift"}
          </span>
          <span
            className={cx(
              "relative h-6 w-11 shrink-0 rounded-full transition-colors",
              available ? "bg-feel" : "bg-white/15"
            )}
          >
            <span
              className={cx(
                "absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-all",
                available ? "left-[22px]" : "left-0.5"
              )}
            />
          </span>
        </button>
        <p className="mt-3 text-[11px] leading-relaxed text-white/40">
          Lifelines are peer support, not therapy. If a conversation suggests
          immediate danger, gently encourage the person to call 988 (US) — or
          send the resource yourself.
        </p>
      </div>
    );
  }

  // Not yet opted in — show the eligibility check + code-of-conduct + claim.
  return (
    <div className="rounded-2xl border border-white/8 bg-white/[0.02] p-4">
      <div className="mb-1 flex items-center gap-2">
        <Heart className="h-4 w-4 text-feel" />
        <h3 className="font-display text-sm font-semibold text-white">Become a Lifeline</h3>
      </div>
      <p className="text-xs leading-relaxed text-white/55">
        Volunteer to listen to MYVYB members reaching out for support. Anonymous
        on both sides, ephemeral (nothing recorded). You decide when you're on
        shift.
      </p>

      {!eligible && (
        <div className="mt-3 flex items-start gap-2 rounded-xl border border-amber-300/25 bg-amber-300/[0.06] p-3 text-[12px] text-amber-100/80">
          <ShieldAlert className="mt-0.5 h-4 w-4 shrink-0 text-amber-300" />
          <span>
            You'll need a verified email and a permanent age (18+) &amp; sex first
            — set them in Settings above.
          </span>
        </div>
      )}

      <button
        type="button"
        onClick={() => setConsent((v) => !v)}
        className="mt-3 flex w-full items-start gap-3 rounded-2xl border border-white/8 bg-white/[0.02] p-3 text-left active:scale-[0.99]"
      >
        <span
          className={cx(
            "mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-md border transition",
            consent ? "border-feel bg-feel" : "border-white/25"
          )}
        >
          {consent && <Check className="h-3.5 w-3.5 text-black" />}
        </span>
        <span className="text-[12px] leading-snug text-white/70">
          I agree to listen with kindness, never share private info I receive,
          never offer medical or legal advice, and to encourage anyone in
          immediate danger to call <span className="font-semibold text-white">988</span>{" "}
          (US) or their local emergency number.
        </span>
      </button>

      <button
        onClick={optIn}
        disabled={!eligible || !consent || busy}
        className={cx(
          "mt-3 flex w-full items-center justify-center gap-2 rounded-2xl py-3 font-display font-bold transition active:scale-[0.98]",
          eligible && consent && !busy
            ? "bg-feel text-black shadow-glow"
            : "bg-white/10 text-white/40"
        )}
      >
        {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Heart className="h-4 w-4" />}
        Become a Lifeline
      </button>
    </div>
  );
}

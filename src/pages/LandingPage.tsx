import { useState, type FormEvent } from "react";
import { Link, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { KeyRound, Loader2 } from "lucide-react";
import { GeometricBackdrop } from "@/components/GeometricBackdrop";
import { LandingLogo } from "@/components/landing/LandingLogo";
import { BuildStamp } from "@/components/BuildStamp";
import { VibesRadioHost } from "@/features/radio/VibesRadioHost";
import { VibesRadioNowPlaying } from "@/features/radio/VibesRadioNowPlaying";
import { VibesRadioVisualizer } from "@/features/radio/VibesRadioVisualizer";
import { normalizeInviteCode } from "@/lib/alphaAccess";
import { stashPendingInviteKey } from "@/lib/pendingInviteKey";
import { useReduceFx } from "@/lib/display";
import { cx } from "@/lib/utils";

/**
 * Signed-out alpha gate — brand + invite key only (Masterplan §13 progressive disclosure).
 * Vibes Radio plays immediately for guests (track 2 interstitials only — never track 1).
 */
export function LandingPage() {
  const navigate = useNavigate();
  const reduce = useReduceFx();
  const [code, setCode] = useState("");
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  function onEnter(e: FormEvent) {
    e.preventDefault();
    const normalized = normalizeInviteCode(code);
    if (normalized.length < 10) {
      setErr("Enter your full invite key.");
      return;
    }
    setBusy(true);
    setErr(null);
    stashPendingInviteKey(normalized);
    navigate("/enter");
  }

  return (
    <div
      className="public-scroll-frame public-ops-shell nexus-void relative flex min-h-[100dvh] flex-col text-white"
      data-public-shell="landing"
      data-testid="public-landing"
    >
      <GeometricBackdrop intensity="hero" />
      <VibesRadioVisualizer />
      <VibesRadioHost audience="guest" />

      <main className="relative z-10 flex flex-1 flex-col items-center justify-center px-5 py-12">
        <LandingLogo />

        <VibesRadioNowPlaying className="mt-6 w-full max-w-sm" />

        <motion.form
          onSubmit={onEnter}
          className="landing-invite-panel forge-glass relative mt-8 flex w-full max-w-sm flex-col items-stretch gap-3 !rounded-2xl p-5"
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.18 }}
          data-testid="landing-invite-gate"
        >
          <span className="forge-glass-edge pointer-events-none" aria-hidden />
          <label className="relative z-[1] sr-only" htmlFor="landing-invite-code">
            Invite key
          </label>
          <div className="landing-key-field relative z-[1]">
            <KeyRound className="landing-key-field-icon" aria-hidden />
            <input
              id="landing-invite-code"
              name="invite-code"
              autoComplete="off"
              spellCheck={false}
              value={code}
              onChange={(e) => {
                setCode(e.target.value);
                if (err) setErr(null);
              }}
              placeholder="VYBZ-A1-····-········"
              className="landing-key-input"
              data-testid="landing-invite-input"
            />
          </div>

          <button
            type="submit"
            disabled={busy}
            className={cx("relative z-[1] landing-neon-cta", !reduce && "landing-neon-cta--pulse")}
            data-testid="landing-invite-enter"
          >
            {busy ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              "Enter"
            )}
          </button>

          {err ? (
            <p className="relative z-[1] text-center text-xs text-rose-300" role="alert">
              {err}
            </p>
          ) : null}

          <Link
            to="/enter"
            className={cx("relative z-[1] landing-neon-cta-ghost", !reduce && "landing-neon-cta-ghost--pulse")}
            data-testid="landing-signin"
          >
            Already in? Sign in
          </Link>
        </motion.form>
      </main>

      <footer className="relative z-10 px-5 pb-[max(1.5rem,env(safe-area-inset-bottom))] pt-2 text-center text-[11px] text-white/30">
        <Link to="/legal/privacy" className="hover:text-white/55">
          Privacy
        </Link>
        <span className="px-2">·</span>
        <Link to="/legal/terms" className="hover:text-white/55">
          Terms
        </Link>
        <BuildStamp className="mt-1.5 opacity-70" />
      </footer>
    </div>
  );
}

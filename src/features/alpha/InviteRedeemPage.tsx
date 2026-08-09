import { useEffect, useRef, useState } from "react";
import { Loader2, LogOut } from "lucide-react";
import { Link } from "react-router-dom";
import { GeometricBackdrop } from "@/components/GeometricBackdrop";
import { LandingLogo } from "@/components/landing/LandingLogo";
import { useSession } from "@/store/session";
import * as api from "@/lib/api";
import { normalizeInviteCode, redeemInviteErrorMessage } from "@/lib/alphaAccess";
import { peekPendingInviteKey, takePendingInviteKey } from "@/lib/pendingInviteKey";
import { useReduceFx } from "@/lib/display";
import { cx } from "@/lib/utils";

/** Hard-gate screen: signed-in users without alpha_access_at redeem here. */
export function InviteRedeemPage() {
  const { email, refreshProfile, signOut, showToast } = useSession();
  const reduce = useReduceFx();
  const [code, setCode] = useState(() => peekPendingInviteKey() ?? "");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const autoTried = useRef(false);

  async function redeem(raw: string) {
    const normalized = normalizeInviteCode(raw);
    if (normalized.length < 10) {
      setErr("Enter your full invite key.");
      return;
    }
    setBusy(true);
    setErr(null);
    const res = await api.redeemInviteKey(normalized);
    setBusy(false);
    if (!res.ok) {
      setErr(redeemInviteErrorMessage(res.reason));
      return;
    }
    takePendingInviteKey();
    showToast(res.already ? "Alpha access already active" : "Invite accepted — welcome to alpha");
    await refreshProfile();
  }

  useEffect(() => {
    if (autoTried.current) return;
    const pending = peekPendingInviteKey();
    if (!pending || pending.length < 10) return;
    autoTried.current = true;
    setCode(pending);
    void redeem(pending);
  }, []);

  return (
    <div className="public-scroll-frame nexus-void relative flex min-h-[100dvh] flex-col text-white">
      <GeometricBackdrop intensity="hero" />
      <main className="relative z-10 flex flex-1 flex-col items-center justify-center px-5 py-12">
        <LandingLogo />
        <form
          onSubmit={(e) => {
            e.preventDefault();
            void redeem(code);
          }}
          className="mt-10 flex w-full max-w-sm flex-col gap-3"
          data-testid="invite-redeem"
        >
          {email ? (
            <p className="sr-only">Signed in as {email}</p>
          ) : null}
          <label className="sr-only" htmlFor="invite-code">
            Invite key
          </label>
          <div className="landing-key-field">
            <input
              id="invite-code"
              name="invite-code"
              autoComplete="off"
              spellCheck={false}
              value={code}
              onChange={(e) => setCode(e.target.value)}
              placeholder="VYBZ-A1-····-········"
              className="landing-key-input !pl-4"
              data-testid="invite-code-input"
            />
          </div>
          <button
            type="submit"
            disabled={busy}
            className={cx("landing-neon-cta", !reduce && "landing-neon-cta--pulse")}
            data-testid="invite-redeem-submit"
          >
            {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : "Enter"}
          </button>
          {err ? (
            <p className="text-center text-xs text-rose-300" role="alert">
              {err}
            </p>
          ) : null}
          <button
            type="button"
            onClick={() => void signOut()}
            className="inline-flex items-center justify-center gap-1.5 pt-2 text-xs text-white/40 transition hover:text-white/70"
          >
            <LogOut className="h-3.5 w-3.5" /> Sign out
          </button>
          <p className="text-center text-[11px] text-white/28">
            <Link to="/codex" className="hover:text-white/50">
              Codex
            </Link>
          </p>
        </form>
      </main>
    </div>
  );
}

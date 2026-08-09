import { useState } from "react";
import { KeyRound, Loader2, LogOut } from "lucide-react";
import { Link } from "react-router-dom";
import { DynamicBackground } from "@/components/DynamicBackground";
import { BrandLockup } from "@/components/Brand";
import { BRAND_BG } from "@/lib/surfaceTheme";
import { useSession } from "@/store/session";
import * as api from "@/lib/api";
import { normalizeInviteCode, redeemInviteErrorMessage } from "@/lib/alphaAccess";

/** Hard-gate screen: signed-in users without alpha_access_at redeem here. */
export function InviteRedeemPage() {
  const { email, refreshProfile, signOut, showToast } = useSession();
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    const normalized = normalizeInviteCode(code);
    if (normalized.length < 10) {
      setErr("Enter a full invite key (VYBZ-A1-…).");
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
    showToast(res.already ? "Alpha access already active" : "Invite accepted — welcome to alpha");
    await refreshProfile();
  }

  return (
    <>
      <DynamicBackground variant={BRAND_BG} mode="static" />
      <div className="relative z-10 flex min-h-[100dvh] flex-col items-center justify-center px-6 py-12">
        <BrandLockup className="mb-8" variant="white" />
        <div className="w-full max-w-md">
          <div className="mb-6 text-center">
            <p className="inline-flex items-center gap-2 font-display text-xl font-semibold text-white">
              <KeyRound className="h-5 w-5 text-cyan-300" aria-hidden />
              Invite-only alpha
            </p>
            <p className="mt-2 text-sm text-white/55">
              VYBZ is invite-gated while we test with producers. Enter the key you were given.
              {email ? (
                <>
                  {" "}
                  Signed in as <span className="text-white/75">{email}</span>.
                </>
              ) : null}
            </p>
          </div>

          <form onSubmit={(e) => void submit(e)} className="space-y-3">
            <label className="sr-only" htmlFor="invite-code">Invite key</label>
            <input
              id="invite-code"
              name="invite-code"
              autoComplete="off"
              spellCheck={false}
              value={code}
              onChange={(e) => setCode(e.target.value)}
              placeholder="VYBZ-A1-XXXX-XXXXXXXX"
              className="w-full rounded-2xl border border-white/15 bg-black/40 px-4 py-3 font-mono text-[15px] tracking-wide text-white placeholder:text-white/30 outline-none focus:border-cyan-400/50 focus:ring-2 focus:ring-cyan-400/25"
            />
            <button
              type="submit"
              disabled={busy}
              className="flex w-full items-center justify-center gap-2 rounded-full bg-gradient-to-r from-cyan-400 via-fuchsia-400 to-amber-300 px-5 py-3 font-display text-sm font-bold text-ink-950 transition hover:brightness-110 active:scale-[0.98] disabled:opacity-60"
            >
              {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : "Redeem invite"}
            </button>
            {err ? <p className="text-center text-xs text-rose-300">{err}</p> : null}
          </form>

          <div className="mt-8 space-y-3 text-center text-sm text-white/45">
            <p>
              No key yet? Sign out to join the waitlist on the landing page.
              {" · "}
              <Link to="/codex" className="text-cyan-300/90 underline-offset-4 hover:underline">
                Read the Codex
              </Link>
            </p>
            <button
              type="button"
              onClick={() => void signOut()}
              className="inline-flex items-center gap-1.5 text-white/50 transition hover:text-white/80"
            >
              <LogOut className="h-3.5 w-3.5" /> Sign out
            </button>
          </div>
        </div>
      </div>
    </>
  );
}

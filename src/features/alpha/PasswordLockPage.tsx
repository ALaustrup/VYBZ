import { useState } from "react";
import { KeyRound, Loader2, LogOut } from "lucide-react";
import { DynamicBackground } from "@/components/DynamicBackground";
import { BrandLockup } from "@/components/Brand";
import { BRAND_BG } from "@/lib/surfaceTheme";
import { useSession } from "@/store/session";
import * as api from "@/lib/api";
import { MASTER_EMAIL, passwordLockErrorMessage } from "@/lib/passwordLock";

/**
 * One-time master password lock — email is fixed; password is set via Supabase Auth
 * then marked locked so this screen never returns.
 */
export function PasswordLockPage() {
  const { email, refreshProfile, signOut, showToast } = useSession();
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const displayEmail = (email ?? MASTER_EMAIL).trim();

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (password.length < 10) {
      setErr(passwordLockErrorMessage("too_short"));
      return;
    }
    if (password !== confirm) {
      setErr(passwordLockErrorMessage("mismatch"));
      return;
    }
    setBusy(true);
    setErr(null);
    const res = await api.lockAccountPassword(password);
    setBusy(false);
    // Clear local fields immediately — never keep the value in React state longer than needed.
    setPassword("");
    setConfirm("");
    if (!res.ok) {
      setErr(passwordLockErrorMessage(res.reason));
      return;
    }
    showToast(res.already ? "Password already locked" : "Password locked");
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
              Set master password
            </p>
            <p className="mt-2 text-sm text-white/55">
              One-time lock for this account. Enter a new password — it is saved to Auth and this
              screen will not appear again.
            </p>
          </div>

          <form onSubmit={(e) => void submit(e)} className="space-y-3" autoComplete="off">
            <label className="block text-[12px] text-white/50">
              Email
              <input
                type="email"
                readOnly
                value={displayEmail}
                className="mt-1 w-full cursor-not-allowed rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-3 text-[15px] text-white/80"
              />
            </label>
            <label className="block text-[12px] text-white/50">
              New password
              <input
                type="password"
                name="new-password"
                autoComplete="new-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                minLength={10}
                required
                className="mt-1 w-full rounded-2xl border border-white/15 bg-black/40 px-4 py-3 text-[15px] text-white outline-none focus:border-cyan-400/50 focus:ring-2 focus:ring-cyan-400/25"
              />
            </label>
            <label className="block text-[12px] text-white/50">
              Confirm password
              <input
                type="password"
                name="confirm-password"
                autoComplete="new-password"
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
                minLength={10}
                required
                className="mt-1 w-full rounded-2xl border border-white/15 bg-black/40 px-4 py-3 text-[15px] text-white outline-none focus:border-cyan-400/50 focus:ring-2 focus:ring-cyan-400/25"
              />
            </label>
            <button
              type="submit"
              disabled={busy}
              className="flex w-full items-center justify-center gap-2 rounded-full bg-gradient-to-r from-cyan-400 via-fuchsia-400 to-amber-300 px-5 py-3 font-display text-sm font-bold text-ink-950 transition hover:brightness-110 active:scale-[0.98] disabled:opacity-60"
            >
              {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : "Lock password"}
            </button>
            {err ? <p className="text-center text-xs text-rose-300">{err}</p> : null}
          </form>

          <div className="mt-8 text-center">
            <button
              type="button"
              onClick={() => void signOut()}
              className="inline-flex items-center gap-1.5 text-sm text-white/50 transition hover:text-white/80"
            >
              <LogOut className="h-3.5 w-3.5" /> Sign out
            </button>
          </div>
        </div>
      </div>
    </>
  );
}

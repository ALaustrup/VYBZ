import { useState } from "react";
import { Lock, Loader2 } from "lucide-react";
import * as api from "@/lib/api";
import { useSession } from "@/store/session";

/**
 * Signed-in password set/update. Passkeys stay bound to the current origin;
 * a password is what signs you in on preview hosts.
 */
export function PasswordCard() {
  const { showToast } = useSession();
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function save(e: React.FormEvent) {
    e.preventDefault();
    const next = password.trim();
    if (next.length < 8) {
      setErr("Use at least 8 characters.");
      return;
    }
    if (next !== confirm.trim()) {
      setErr("Those passwords don’t match.");
      return;
    }
    setBusy(true);
    setErr(null);
    const { error } = await api.setAccountPassword(next);
    setBusy(false);
    if (error) {
      setErr(error);
      return;
    }
    setPassword("");
    setConfirm("");
    showToast("Password saved");
  }

  return (
    <div className="mb-5">
      <div className="mb-1 flex items-center gap-2.5">
        <Lock className="h-4 w-4 shrink-0 text-white/35" />
        <div className="min-w-0 flex-1">
          <p className="text-sm font-medium text-white">Password</p>
          <p className="text-[11px] text-white/40">
            Passkeys only work on this site. A password works on preview hosts too.
          </p>
        </div>
      </div>
      <div className="mt-3 h-px w-full bg-[var(--hairline)]" />

      <form onSubmit={save} className="mt-3 flex flex-col gap-2" data-testid="profile-set-password">
        <input
          type="password"
          autoComplete="new-password"
          minLength={8}
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="New password (8+ characters)"
          className="h-10 rounded-xl bg-white/[0.03] px-3 text-sm text-white placeholder:text-white/30 focus:outline-none focus:ring-1 focus:ring-white/20"
        />
        <input
          type="password"
          autoComplete="new-password"
          minLength={8}
          value={confirm}
          onChange={(e) => setConfirm(e.target.value)}
          placeholder="Confirm password"
          className="h-10 rounded-xl bg-white/[0.03] px-3 text-sm text-white placeholder:text-white/30 focus:outline-none focus:ring-1 focus:ring-white/20"
        />
        {err && <p className="text-xs font-medium text-wild">{err}</p>}
        <button type="submit" disabled={busy} className="btn btn-primary h-8 w-fit px-3 py-0 text-xs disabled:opacity-60">
          {busy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : "Save password"}
        </button>
      </form>
    </div>
  );
}

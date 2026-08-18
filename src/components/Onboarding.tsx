import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { Loader2, Mail, Lock, KeyRound, UserRound, ArrowRight } from "lucide-react";
import { useSession } from "@/store/session";
import * as api from "@/lib/api";
import { AuthShell } from "@/components/AuthShell";
import {
  passkeysSupported,
  passkeyAutofillSupported,
  signInWithPasskey,
} from "@/lib/passkey";

/**
 * Map a raw WebAuthn/backend error to a calm, human message.
 * Returns null only when the user deliberately dismissed the OS prompt.
 */
function friendlyPasskeyError(e: unknown, opts: { conditional?: boolean } = {}): string | null {
  const err = e as { name?: string; message?: string; code?: string };
  const name = err?.name ?? "";
  const msg = err?.message ?? String(e);
  // Conditional autofill failing silently is expected when the user ignores it.
  if (opts.conditional && (name === "NotAllowedError" || name === "AbortError")) return null;
  if (name === "AbortError") return null;
  if (name === "NotAllowedError")
    return "No passkey found on this device, or the prompt was cancelled. Try a password, or go back for a key.";
  if (err?.code === "account_exists" || /account_exists/i.test(msg))
    return "You already have an account — sign in with your passkey, or use a password.";
  if (/no passkey|unknown passkey|not found/i.test(msg))
    return "No passkey found on this device. Use a password, or go back and get a key.";
  if (name === "InvalidStateError")
    return "A passkey already exists for this device. Try signing in instead.";
  if (/origin not allowed/i.test(msg))
    return "Passkeys aren't available on this domain yet.";
  if (/session|verifyOtp|token/i.test(msg))
    return "Passkey verified, but we couldn't start your session. Try again.";
  if (/Edge Function|non-2xx|Failed to send/i.test(msg))
    return "Couldn't reach the passkey service. Check your connection and try again.";
  // Prefer the backend's own message when it is already human-readable.
  if (msg && msg.length < 120 && !/Error:|Exception/i.test(msg)) return msg;
  return "Passkey didn't complete. Try again, or use a password.";
}

/**
 * Identity-first, passkey-first entry on the Nexus auth shell.
 */
export function Onboarding() {
  const { signIn } = useSession();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [usePassword, setUsePassword] = useState(false);
  const [busy, setBusy] = useState<null | "passkey" | "password">(null);
  const [err, setErr] = useState<string | null>(null);
  const [note, setNote] = useState<string | null>(null);
  const [pk] = useState(() => passkeysSupported());
  const conditionalArmed = useRef(false);

  useEffect(() => {
    if (!pk || conditionalArmed.current) return;
    // Conditional UI needs an email field with autocomplete="… webauthn".
    if (!usePassword) return;
    conditionalArmed.current = true;
    (async () => {
      if (!(await passkeyAutofillSupported())) return;
      await new Promise((r) => requestAnimationFrame(() => r(null)));
      if (!document.querySelector('input[autocomplete~="webauthn"]')) return;
      try {
        await signInWithPasskey({ conditional: true });
      } catch (e) {
        const m = friendlyPasskeyError(e, { conditional: true });
        if (m) setErr(m);
      }
    })();
  }, [pk, usePassword]);

  async function oneTapSignIn() {
    setBusy("passkey"); setErr(null); setNote(null);
    try {
      const ok = await signInWithPasskey();
      if (!ok) setErr("That passkey couldn't sign you in. Try again or use a password.");
    } catch (e) {
      const m = friendlyPasskeyError(e);
      if (m) setErr(m);
    } finally {
      setBusy(null);
    }
  }

  async function passwordSubmit(e: React.FormEvent) {
    e.preventDefault();
    setBusy("password"); setErr(null); setNote(null);
    const { error } = await signIn(email.trim(), password);
    setBusy(null);
    if (error) setErr(error);
  }

  return (
    <AuthShell
      title="Welcome back"
      subtitle="Passkey or password. No account yet? Go back and get a key."
    >
      {pk && !usePassword ? (
        <div className="flex flex-col gap-3">
          <button
            onClick={oneTapSignIn}
            disabled={!!busy}
            className="group mx-auto flex flex-col items-center gap-2.5 py-1"
            aria-label="Sign in with a passkey"
          >
            <span className="relative grid h-[5.25rem] w-[5.25rem] place-items-center rounded-full border border-white/12 bg-white/[0.04] transition group-hover:border-[rgb(var(--accent-rgb)/0.55)] group-active:scale-95">
              <span
                className="absolute inset-0 rounded-full opacity-0 blur-xl transition group-hover:opacity-100"
                style={{ background: "rgb(var(--accent-rgb) / 0.22)" }}
              />
              {busy === "passkey"
                ? <Loader2 className="h-7 w-7 animate-spin text-white/80" />
                : <UserRound className="h-9 w-9 text-white/88" />}
            </span>
            <span className="text-[13px] font-medium text-white/62 group-hover:text-white">
              Tap to sign in
            </span>
          </button>

          <button onClick={oneTapSignIn} disabled={!!busy} className="forge-cta w-full">
            {busy === "passkey"
              ? <Loader2 className="h-4 w-4 animate-spin" />
              : <><KeyRound className="h-4 w-4" /> Sign in with passkey</>}
          </button>

          {note && <p className="text-xs font-medium text-[rgb(var(--accent-rgb)/0.85)]">{note}</p>}
          {err && <p className="text-xs font-medium text-wild">{err}</p>}

          <button
            type="button"
            onClick={() => { setUsePassword(true); setErr(null); setNote(null); }}
            className="w-full text-center text-xs text-white/42 hover:text-white/72"
          >
            Use a password instead
          </button>
        </div>
      ) : (
        <form onSubmit={passwordSubmit} className="flex flex-col gap-3">
          <ForgeField icon={<Mail className="h-4 w-4" />}>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@email.com"
              autoComplete={pk ? "username webauthn" : "email"}
            />
          </ForgeField>
          <ForgeField icon={<Lock className="h-4 w-4" />}>
            <input
              type="password"
              required
              minLength={8}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Password (8+ characters)"
              autoComplete="current-password"
            />
          </ForgeField>
          {note && <p className="text-xs font-medium text-[rgb(var(--accent-rgb)/0.85)]">{note}</p>}
          {err && <p className="text-xs font-medium text-wild">{err}</p>}
          <button type="submit" disabled={!!busy} className="forge-cta mt-1 w-full">
            {busy === "password"
              ? <Loader2 className="h-4 w-4 animate-spin" />
              : <>Sign in <ArrowRight className="h-4 w-4" /></>}
          </button>
          {pk && (
            <button
              type="button"
              onClick={() => { setUsePassword(false); setErr(null); setNote(null); }}
              className="w-full text-center text-xs text-white/42 hover:text-white/72"
            >
              Use a passkey instead
            </button>
          )}
        </form>
      )}

      <Link
        to="/"
        className="w-full text-center text-xs text-white/48 hover:text-white/78"
        data-testid="login-go-back"
      >
        No account? Go back
      </Link>
    </AuthShell>
  );
}

function ForgeField({ icon, children }: { icon: React.ReactNode; children: React.ReactNode }) {
  return (
    <label className="forge-field">
      <span className="forge-field-icon">{icon}</span>
      {children}
    </label>
  );
}

/** Shown once signed in but before a username is chosen. */
export function UsernameSetup() {
  const { refreshProfile, showToast } = useSession();
  const [username, setUsername] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const valid = /^[a-zA-Z0-9_.]{3,24}$/.test(username);

  async function save(e: React.FormEvent) {
    e.preventDefault();
    if (!valid) { setErr("3–24 chars: letters, numbers, _ or ."); return; }
    setBusy(true); setErr(null);
    const free = await api.usernameAvailable(username);
    if (!free) { setBusy(false); setErr("That username is taken."); return; }
    const { error } = await api.updateMyProfile({ username, displayName: username });
    setBusy(false);
    if (error) { setErr(error); return; }
    showToast("Welcome to VYBZ");
    await refreshProfile();
  }

  return (
    <AuthShell title="Pick your name" subtitle="This is the name on your packs.">
      <form onSubmit={save} className="flex flex-col gap-3">
        <ForgeField icon={<UserRound className="h-4 w-4" />}>
          <input
            value={username}
            onChange={(e) => setUsername(e.target.value.replace(/\s/g, ""))}
            placeholder="yourname"
            autoFocus
          />
        </ForgeField>
        {err && <p className="text-xs font-medium text-wild">{err}</p>}
        <button type="submit" disabled={busy || !valid} className="forge-cta mt-1 w-full">
          {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <>Continue <ArrowRight className="h-4 w-4" /></>}
        </button>
      </form>
    </AuthShell>
  );
}

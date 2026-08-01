import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { Loader2, Mail, Lock, Fingerprint, KeyRound, UserRound, ArrowRight } from "lucide-react";
import { useSession } from "@/store/session";
import * as api from "@/lib/api";
import { AuthShell } from "@/components/AuthShell";
import {
  passkeysSupported,
  passkeyAutofillSupported,
  signInWithPasskey,
  signUpWithPasskey,
} from "@/lib/passkey";

/** Map a raw WebAuthn/backend error to a calm, human message (or null to ignore). */
function friendlyPasskeyError(e: unknown): string | null {
  const err = e as { name?: string; message?: string };
  const name = err?.name ?? "";
  const msg = err?.message ?? String(e);
  if (name === "NotAllowedError" || name === "AbortError") return null;
  if (/no passkey|unknown passkey|not found/i.test(msg))
    return "No passkey found on this device. Create an account to add one.";
  if (name === "InvalidStateError")
    return "A passkey already exists for this device.";
  if (/origin not allowed/i.test(msg))
    return "Passkeys aren't available on this domain yet.";
  return "Passkey didn't complete. Try again, or use a password.";
}

/**
 * Identity-first, passkey-first entry on the Nexus auth shell.
 */
export function Onboarding() {
  const { signUp, signIn } = useSession();
  const [mode, setMode] = useState<"join" | "signin">("signin");
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
    if (!(mode === "join" || usePassword)) return;
    conditionalArmed.current = true;
    (async () => {
      if (!(await passkeyAutofillSupported())) return;
      if (!document.querySelector('input[autocomplete~="webauthn"]')) return;
      try {
        await signInWithPasskey({ conditional: true });
      } catch (e) {
        const m = friendlyPasskeyError(e);
        if (m) setErr(m);
      }
    })();
  }, [pk, mode, usePassword]);

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

  async function passkeyJoin() {
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email.trim())) {
      setErr("Enter a valid email so we can help you recover your account.");
      return;
    }
    setBusy("passkey"); setErr(null); setNote(null);
    try {
      const ok = await signUpWithPasskey(email);
      if (!ok) setErr("Couldn't finish creating your passkey. Try again or use a password.");
    } catch (e) {
      if ((e as { code?: string }).code === "account_exists") {
        setMode("signin");
        setNote("You already have an account — tap to sign in with your passkey.");
      } else {
        const m = friendlyPasskeyError(e);
        setErr(m ?? "Sign-up didn't complete. Try again or use a password.");
      }
    } finally {
      setBusy(null);
    }
  }

  async function passwordSubmit(e: React.FormEvent) {
    e.preventDefault();
    setBusy("password"); setErr(null); setNote(null);
    const fn = mode === "join" ? signUp : signIn;
    const { error } = await fn(email.trim(), password);
    setBusy(null);
    if (error) setErr(error);
  }

  const isJoin = mode === "join";

  return (
    <AuthShell
      title={isJoin ? "Create your studio" : "Welcome back"}
      subtitle="Release intelligence for independent producers."
    >
      {pk && !usePassword ? (
        <div className="flex flex-col gap-3">
          {!isJoin && (
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
          )}

          {isJoin && (
            <ForgeField icon={<Mail className="h-4 w-4" />}>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@email.com"
                autoComplete="username webauthn"
              />
            </ForgeField>
          )}

          <button onClick={isJoin ? passkeyJoin : oneTapSignIn} disabled={!!busy} className="forge-cta w-full">
            {busy === "passkey"
              ? <Loader2 className="h-4 w-4 animate-spin" />
              : isJoin
                ? <><Fingerprint className="h-4 w-4" /> Create account with passkey</>
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
              autoComplete={isJoin ? "new-password" : "current-password"}
            />
          </ForgeField>
          {note && <p className="text-xs font-medium text-[rgb(var(--accent-rgb)/0.85)]">{note}</p>}
          {err && <p className="text-xs font-medium text-wild">{err}</p>}
          <button type="submit" disabled={!!busy} className="forge-cta mt-1 w-full">
            {busy === "password"
              ? <Loader2 className="h-4 w-4 animate-spin" />
              : <>{isJoin ? "Create account" : "Sign in"} <ArrowRight className="h-4 w-4" /></>}
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

      <button
        type="button"
        onClick={() => { setMode(isJoin ? "signin" : "join"); setErr(null); setNote(null); }}
        className="w-full text-center text-xs text-white/48 hover:text-white/78"
      >
        {isJoin ? "Already on VYBZ? Sign in" : "New to VYBZ? Create an account"}
      </button>

      <p className="text-center text-[11px] text-white/32">
        <Link to="/releases/new" className="hover:text-white/58">Try free scan first</Link>
      </p>
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
    <AuthShell title="Claim your name" subtitle="Your identity across releases and social.">
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

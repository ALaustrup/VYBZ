import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { ArrowRight, Loader2, Mail, Lock, AtSign, Fingerprint, KeyRound, UserRound } from "lucide-react";
import { useSession } from "@/store/session";
import * as api from "@/lib/api";
import { BrandLockup } from "@/components/Brand";
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
  // User dismissed the OS prompt — not an error worth shouting about.
  if (name === "NotAllowedError" || name === "AbortError") return null;
  if (/no passkey|unknown passkey|not found/i.test(msg))
    return "No passkey found on this device. Create an account to add one.";
  if (name === "InvalidStateError")
    return "A passkey already exists for this device.";
  if (/origin not allowed/i.test(msg))
    return "Passkeys aren’t available on this domain yet.";
  return "Passkey didn’t complete. Try again, or use a password.";
}

/**
 * Identity-first, passkey-first entry. A returning creator can tap to sign in
 * with a passkey (discoverable / usernameless); new creators enter an email and
 * register a passkey as their primary credential in one step. Email + password
 * remains a full fallback. There is no guest/anonymous path.
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

  // Conditional UI: quietly arm passkey autofill so the OS can offer a one-tap
  // sign-in from the email field. This REQUIRES a rendered input with an
  // autocomplete token of "webauthn"; we only arm it when that input exists
  // (join / password-fallback views), and at most once. Cancellations are benign.
  useEffect(() => {
    if (!pk || conditionalArmed.current) return;
    if (!(mode === "join" || usePassword)) return; // no anchored input in the avatar-tap view
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
      if (!ok) setErr("That passkey couldn’t sign you in. Try again or use a password.");
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
      if (!ok) setErr("Couldn’t finish creating your passkey. Try again or use a password.");
    } catch (e) {
      if ((e as { code?: string }).code === "account_exists") {
        setMode("signin");
        setNote("You already have an account — tap to sign in with your passkey.");
      } else {
        const m = friendlyPasskeyError(e);
        setErr(m ?? "Sign-up didn’t complete. Try again or use a password.");
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
    <div className="relative z-10 flex min-h-[100dvh] flex-col items-center justify-center px-6">
      <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}
        className="glass-panel w-full max-w-sm p-7 !bg-ink-950/88">
        <div className="mb-6 flex flex-col items-center gap-3 text-center">
          <BrandLockup height="h-10" />
          <p className="text-sm text-white/55">Find Yours. — listen · tip · live</p>
        </div>

        {/* Passkey-first path */}
        {pk && !usePassword ? (
          <div className="flex flex-col gap-3">
            {/* Tap-your-avatar one-tap sign-in */}
            {!isJoin && (
              <button onClick={oneTapSignIn} disabled={!!busy}
                className="group mx-auto flex flex-col items-center gap-2.5 py-1"
                aria-label="Sign in with a passkey">
                <span className="relative grid h-20 w-20 place-items-center rounded-full bg-gradient-to-br from-veil-500/30 to-wild/25 ring-1 ring-white/15 transition group-hover:ring-veil-400/60 group-active:scale-95">
                  <span className="absolute inset-0 rounded-full bg-veil-400/20 blur-xl opacity-0 transition group-hover:opacity-100" />
                  {busy === "passkey"
                    ? <Loader2 className="h-7 w-7 animate-spin text-white/80" />
                    : <UserRound className="h-9 w-9 text-white/85" />}
                </span>
                <span className="text-[13px] font-medium text-white/75 group-hover:text-white">
                  Tap to sign in
                </span>
              </button>
            )}

            {isJoin && (
              <Field icon={<Mail className="h-4 w-4" />}>
                <input type="email" required value={email} onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@email.com" autoComplete="username webauthn"
                  className="w-full bg-transparent text-[15px] text-white placeholder:text-white/35 focus:outline-none" />
              </Field>
            )}

            <button onClick={isJoin ? passkeyJoin : oneTapSignIn} disabled={!!busy}
              className="btn btn-primary w-full py-3.5">
              {busy === "passkey"
                ? <Loader2 className="h-4 w-4 animate-spin" />
                : isJoin
                  ? <><Fingerprint className="h-4 w-4" /> Create account with a passkey</>
                  : <><KeyRound className="h-4 w-4" /> Sign in with a passkey</>}
            </button>

            {note && <p className="text-xs font-medium text-veil-300">{note}</p>}
            {err && <p className="text-xs font-medium text-wild">{err}</p>}

            <button onClick={() => { setUsePassword(true); setErr(null); setNote(null); }}
              className="w-full text-center text-xs text-white/45 hover:text-white/75">
              Use a password instead
            </button>
          </div>
        ) : (
          /* Email + password fallback */
          <form onSubmit={passwordSubmit} className="flex flex-col gap-3">
            <Field icon={<Mail className="h-4 w-4" />}>
              <input type="email" required value={email} onChange={(e) => setEmail(e.target.value)}
                placeholder="you@email.com" autoComplete={pk ? "username webauthn" : "email"}
                className="w-full bg-transparent text-[15px] text-white placeholder:text-white/35 focus:outline-none" />
            </Field>
            <Field icon={<Lock className="h-4 w-4" />}>
              <input type="password" required minLength={8} value={password} onChange={(e) => setPassword(e.target.value)}
                placeholder="Password (8+ characters)" autoComplete={isJoin ? "new-password" : "current-password"}
                className="w-full bg-transparent text-[15px] text-white placeholder:text-white/35 focus:outline-none" />
            </Field>
            {note && <p className="text-xs font-medium text-veil-300">{note}</p>}
            {err && <p className="text-xs font-medium text-wild">{err}</p>}
            <button type="submit" disabled={!!busy} className="btn btn-primary mt-1 w-full py-3.5">
              {busy === "password" ? <Loader2 className="h-4 w-4 animate-spin" /> : <>{isJoin ? "Create account" : "Sign in"} <ArrowRight className="h-4 w-4" /></>}
            </button>
            {pk && (
              <button type="button" onClick={() => { setUsePassword(false); setErr(null); setNote(null); }}
                className="w-full text-center text-xs text-white/45 hover:text-white/75">
                Use a passkey instead
              </button>
            )}
          </form>
        )}

        <button onClick={() => { setMode(isJoin ? "signin" : "join"); setErr(null); setNote(null); }}
          className="mt-4 w-full text-center text-xs text-white/50 hover:text-white/80">
          {isJoin ? "Already on VYBZ? Sign in" : "New to VYBZ? Create an account"}
        </button>
      </motion.div>
      <p className="mt-5 text-center text-[11px] text-white/40">
        <Link to="/codex" className="hover:text-white/70">Codex</Link>
        <span className="px-1.5">·</span>
        <Link to="/legal/terms" className="hover:text-white/70">Terms</Link>
        <span className="px-1.5">·</span>
        <Link to="/legal/privacy" className="hover:text-white/70">Privacy</Link>
      </p>
    </div>
  );
}

function Field({ icon, children }: { icon: React.ReactNode; children: React.ReactNode }) {
  return (
    <label className="flex items-center gap-2.5 rounded-xl border border-white/10 bg-white/[0.03] px-3.5 py-3 focus-within:border-veil-400/60">
      <span className="text-white/40">{icon}</span>{children}
    </label>
  );
}

/** Shown once signed in but before a username is chosen — the identity anchor. */
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
    <div className="relative z-10 flex min-h-[100dvh] flex-col items-center justify-center px-6">
      <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} className="glass-panel w-full max-w-sm p-7 !bg-ink-950/88">
        <h1 className="font-display text-2xl font-bold text-gradient">Claim your name</h1>
        <p className="mb-5 mt-1 text-sm text-white/55">This is your identity across VYBZ — how collaborators find you.</p>
        <form onSubmit={save} className="flex flex-col gap-3">
          <label className="flex items-center gap-2.5 rounded-xl border border-white/10 bg-white/[0.03] px-3.5 py-3 focus-within:border-veil-400/60">
            <AtSign className="h-4 w-4 text-white/40" />
            <input value={username} onChange={(e) => setUsername(e.target.value.replace(/\s/g, ""))}
              placeholder="yourname" autoFocus
              className="w-full bg-transparent text-[15px] text-white placeholder:text-white/35 focus:outline-none" />
          </label>
          {err && <p className="text-xs font-medium text-wild">{err}</p>}
          <button type="submit" disabled={busy || !valid} className="btn btn-primary mt-1 w-full py-3.5">
            {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <>Continue <ArrowRight className="h-4 w-4" /></>}
          </button>
        </form>
      </motion.div>
    </div>
  );
}

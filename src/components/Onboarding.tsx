import { useState } from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { ArrowRight, Loader2, Mail, Lock, AtSign } from "lucide-react";
import { useSession } from "@/store/session";
import * as api from "@/lib/api";
import { BrandLockup } from "@/components/Brand";

/**
 * Identity-first entry: create a real account (email + password) or sign in.
 * There is no guest/anonymous path — VYBZ is a network of real creators.
 * (Passkey sign-in is a planned addition on top of this.)
 */
export function Onboarding() {
  const { signUp, signIn } = useSession();
  const [mode, setMode] = useState<"join" | "signin">("join");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true); setErr(null);
    const fn = mode === "join" ? signUp : signIn;
    const { error } = await fn(email.trim(), password);
    setBusy(false);
    if (error) setErr(error);
  }

  return (
    <div className="relative z-10 flex min-h-[100dvh] flex-col items-center justify-center px-6">
      <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}
        className="glass-panel w-full max-w-sm p-7">
        <div className="mb-6 flex flex-col items-center gap-3 text-center">
          <BrandLockup markClassName="h-9 w-9 text-veil-300" wordClassName="text-3xl" />
          <p className="text-sm text-white/55">Find Yours. — the network for music collaboration.</p>
        </div>

        <form onSubmit={submit} className="flex flex-col gap-3">
          <Field icon={<Mail className="h-4 w-4" />}>
            <input type="email" required value={email} onChange={(e) => setEmail(e.target.value)}
              placeholder="you@studio.com" autoComplete="email"
              className="w-full bg-transparent text-[15px] text-white placeholder:text-white/35 focus:outline-none" />
          </Field>
          <Field icon={<Lock className="h-4 w-4" />}>
            <input type="password" required minLength={8} value={password} onChange={(e) => setPassword(e.target.value)}
              placeholder="Password (8+ characters)" autoComplete={mode === "join" ? "new-password" : "current-password"}
              className="w-full bg-transparent text-[15px] text-white placeholder:text-white/35 focus:outline-none" />
          </Field>
          {err && <p className="text-xs font-medium text-wild">{err}</p>}
          <button type="submit" disabled={busy} className="btn btn-primary mt-1 w-full py-3.5">
            {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <>{mode === "join" ? "Create account" : "Sign in"} <ArrowRight className="h-4 w-4" /></>}
          </button>
        </form>

        <button onClick={() => { setMode(mode === "join" ? "signin" : "join"); setErr(null); }}
          className="mt-4 w-full text-center text-xs text-white/50 hover:text-white/80">
          {mode === "join" ? "Already on VYBZ? Sign in" : "New to VYBZ? Create an account"}
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
      <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} className="glass-panel w-full max-w-sm p-7">
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

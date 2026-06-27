import { useEffect, useState } from "react";
import { CheckCircle2, Loader2, Mail, ShieldCheck, Sparkles } from "lucide-react";
import { useApp } from "@/store/AppStore";
import { getLinkedEmail, linkEmail } from "@/lib/backend";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/**
 * Account card. MYVYB starts everyone as a guest; verifying an email IS creating
 * the account — it promotes the guest into a full member (V¢ wallet + perks) and
 * makes the account recoverable on any device. This card shows the current tier
 * and walks a guest through the one-step email verification.
 */
export function SecureAccount() {
  const { backendEnabled, account, contactVerified, refreshContactVerified, showToast } =
    useApp();
  const [email, setEmail] = useState("");
  const [linked, setLinked] = useState<string | null>(null);
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);
  const [checking, setChecking] = useState(false);

  useEffect(() => {
    if (!backendEnabled) return;
    void getLinkedEmail().then((e) => {
      setLinked(e);
      if (e) setEmail(e);
    });
  }, [backendEnabled]);

  if (!backendEnabled) return null;

  const isMember = !!account && !account.anonymous && contactVerified;
  const pending = !isMember && (sent || (!!linked && !contactVerified));

  async function send() {
    if (!EMAIL_RE.test(email) || sending) return;
    setSending(true);
    const { error } = await linkEmail(email.trim());
    setSending(false);
    if (error) {
      showToast(error);
      return;
    }
    setLinked(email.trim());
    setSent(true);
    showToast("Check your inbox to confirm and create your account.");
  }

  async function recheck() {
    setChecking(true);
    const ok = await refreshContactVerified();
    setChecking(false);
    if (!ok) showToast("Not confirmed yet — tap the link in your email.");
  }

  // Verified member.
  if (isMember) {
    return (
      <div className="mb-3 rounded-2xl border border-feel/25 bg-feel/[0.06] p-4">
        <div className="mb-1 flex items-center gap-2">
          <ShieldCheck className="h-4 w-4 text-feel" />
          <h3 className="font-display text-sm font-semibold text-white">
            Member account
          </h3>
          <span className="ml-auto rounded-full bg-feel/20 px-2 py-0.5 text-[10px] font-bold text-feel">
            VERIFIED
          </span>
        </div>
        <p className="flex items-center gap-1.5 text-xs text-feel">
          <CheckCircle2 className="h-3.5 w-3.5" />
          Recoverable {linked ? `via ${linked}` : "on any device"}.
        </p>
      </div>
    );
  }

  // Email added, awaiting confirmation.
  if (pending) {
    return (
      <div className="mb-3 rounded-2xl border border-amber-300/30 bg-amber-300/[0.06] p-4">
        <div className="mb-1 flex items-center gap-2">
          <Mail className="h-4 w-4 text-amber-300" />
          <h3 className="font-display text-sm font-semibold text-white">
            Confirm your email
          </h3>
        </div>
        <p className="mb-3 text-xs leading-relaxed text-white/55">
          We emailed a confirmation link{linked ? ` to ${linked}` : ""}. Tap it to
          finish creating your account and unlock your V¢ wallet.
        </p>
        <button
          onClick={recheck}
          disabled={checking}
          className="flex w-full items-center justify-center gap-1.5 rounded-xl bg-veil-500 py-2.5 text-sm font-semibold text-white shadow-glow active:scale-95 disabled:opacity-50"
        >
          {checking && <Loader2 className="h-4 w-4 animate-spin" />}
          I've tapped the link — check again
        </button>
        <button
          onClick={send}
          disabled={sending}
          className="mt-2 w-full text-center text-[12px] text-white/45 hover:text-white/70"
        >
          Resend link
        </button>
      </div>
    );
  }

  // Guest — invite to create an account.
  return (
    <div className="mb-3 rounded-2xl border border-veil-400/30 bg-veil-500/[0.07] p-4">
      <div className="mb-1 flex items-center gap-2">
        <Sparkles className="h-4 w-4 text-veil-200" />
        <h3 className="font-display text-sm font-semibold text-white">
          Create your free account
        </h3>
        <span className="ml-auto rounded-full bg-white/10 px-2 py-0.5 text-[10px] font-bold text-white/60">
          GUEST
        </span>
      </div>
      <p className="mb-3 text-xs leading-relaxed text-white/55">
        Verify an email to unlock your V¢ wallet, keep your username, and recover
        your account on any device. You stay anonymous — your email is never shown.
      </p>
      <div className="flex gap-2">
        <div className="relative flex-1">
          <Mail className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-white/35" />
          <input
            type="email"
            inputMode="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@example.com"
            className="w-full rounded-xl border border-white/10 bg-white/[0.04] py-2.5 pl-9 pr-3 text-sm text-white placeholder:text-white/30 focus:border-veil-400/60 focus:outline-none"
          />
        </div>
        <button
          onClick={send}
          disabled={!EMAIL_RE.test(email) || sending}
          className="rounded-xl bg-veil-500 px-4 text-sm font-semibold text-white transition active:scale-95 disabled:opacity-40"
        >
          {sending ? "…" : "Create"}
        </button>
      </div>
    </div>
  );
}

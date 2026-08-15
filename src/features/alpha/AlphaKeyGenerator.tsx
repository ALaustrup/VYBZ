import { useState } from "react";
import { Check, Copy, KeyRound, Loader2, Mail } from "lucide-react";
import {
  alphaKeyErrorMessage,
  isValidEmail,
  requestAlphaKey,
  type AlphaKeyFailure,
} from "@/features/alpha/alphaKeyRequest";

/**
 * Self-serve alpha key. A visitor enters an email and gets a key bound to it,
 * on screen and by email.
 *
 * The key is shown immediately rather than only mailed, so a delivery failure
 * never costs someone their access. The address is therefore attribution rather
 * than verification, and the copy says so instead of implying a check we do not
 * run.
 */
export function AlphaKeyGenerator({ compact = false }: { compact?: boolean }) {
  const [email, setEmail] = useState("");
  const [busy, setBusy] = useState(false);
  const [code, setCode] = useState<string | null>(null);
  const [error, setError] = useState<AlphaKeyFailure | null>(null);
  const [copied, setCopied] = useState(false);

  const valid = isValidEmail(email);

  async function generate(e: React.FormEvent) {
    e.preventDefault();
    if (!valid || busy) return;
    setBusy(true);
    setError(null);
    const res = await requestAlphaKey(email);
    setBusy(false);
    if (!res.ok) {
      setError(res.reason);
      return;
    }
    setCode(res.code);
  }

  async function copy() {
    if (!code) return;
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      // Clipboard can be blocked; the key stays selectable on screen.
    }
  }

  if (code) {
    return (
      <div
        className="forge-glass relative w-full rounded-2xl p-4"
        data-testid="alpha-key-result"
      >
        <span className="forge-glass-edge pointer-events-none" aria-hidden />
        <div className="relative z-[1]">
          <p className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-[0.14em] text-white/45">
            <KeyRound className="h-3.5 w-3.5 text-[rgb(var(--accent-rgb))]" aria-hidden />
            Your alpha key
          </p>
          <p
            className="mt-2 select-all break-all font-mono text-base tracking-[0.06em] text-[rgb(var(--accent-rgb))]"
            data-testid="alpha-key-code"
          >
            {code}
          </p>
          <div className="mt-3 flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => void copy()}
              className="forge-cta !min-h-9 !px-3 !text-xs"
              data-testid="alpha-key-copy"
            >
              {copied ? (
                <>
                  <Check className="h-3.5 w-3.5" aria-hidden /> Copied
                </>
              ) : (
                <>
                  <Copy className="h-3.5 w-3.5" aria-hidden /> Copy key
                </>
              )}
            </button>
            <span className="text-[11px] text-white/40">Also sent to {email}</span>
          </div>
          <p className="mt-3 text-[12px] leading-relaxed text-white/50">
            Sign in, then paste this where VYBZ asks for an invite key. It works once and
            expires in 30 days. You will choose your artist name straight after.
          </p>
        </div>
      </div>
    );
  }

  return (
    <form
      onSubmit={generate}
      className="w-full"
      data-testid="alpha-key-generator"
      aria-label="Generate an alpha access key"
    >
      {!compact && (
        <p className="mb-2 text-[12px] leading-relaxed text-white/50">
          The VYBZ alpha is open. Enter your email and we will generate an access key
          tied to it. We do not check the address — it just ties the key to you.
        </p>
      )}
      <div className="flex flex-col gap-2 sm:flex-row">
        <label className="forge-field min-w-0 flex-1 !py-2">
          <Mail className="h-4 w-4 shrink-0 text-white/35" aria-hidden />
          <input
            type="email"
            inputMode="email"
            autoComplete="email"
            value={email}
            onChange={(e) => {
              setEmail(e.target.value);
              setError(null);
            }}
            placeholder="you@example.com"
            aria-label="Email address"
            data-testid="alpha-key-email"
          />
        </label>
        <button
          type="submit"
          disabled={!valid || busy}
          className="forge-cta !min-h-10 shrink-0 !px-4 !text-sm disabled:opacity-40"
          data-testid="alpha-key-generate"
        >
          {busy ? (
            <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
          ) : (
            <>
              <KeyRound className="h-4 w-4" aria-hidden /> Generate Key
            </>
          )}
        </button>
      </div>
      {error && (
        <p className="mt-2 text-[12px] font-medium text-wild" data-testid="alpha-key-error">
          {alphaKeyErrorMessage(error)}
        </p>
      )}
    </form>
  );
}

import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { ArrowLeft, Check, Crown, Loader2, Mail, Sparkles, UserPlus, X } from "lucide-react";
import { useApp } from "@/store/AppStore";
import {
  BACKEND_ENABLED,
  requestEmailCode,
  usernameAvailable,
  verifyEmailCode,
} from "@/lib/backend";
import { isValidUsername, normalizeUsername } from "@/lib/username";
import { BrandMark } from "@/components/Brand";

const EMAIL_RE = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;

/**
 * Shown when a guest taps a members-only action. Registration is username-first
 * and email-verified — only then does the account get a V¢ wallet and member
 * perks. Guests can also jump straight to Godmode.
 */
export function AccountGate() {
  const { accountGateOpen, closeAccountGate, openPremium, godmodePrice, showToast } =
    useApp();
  const [mode, setMode] = useState<"choose" | "create" | "code">("choose");
  const [username, setUsername] = useState("");
  const [avail, setAvail] = useState<null | "checking" | boolean>(null);
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);
  const checkRef = useRef<number | null>(null);

  const cleanName = normalizeUsername(username);
  const nameValid = isValidUsername(cleanName);

  useEffect(() => {
    setAvail(null);
    if (!nameValid || !BACKEND_ENABLED) return;
    setAvail("checking");
    if (checkRef.current) clearTimeout(checkRef.current);
    checkRef.current = window.setTimeout(async () => {
      setAvail(await usernameAvailable(cleanName));
    }, 450);
    return () => {
      if (checkRef.current) clearTimeout(checkRef.current);
    };
  }, [cleanName, nameValid]);

  function reset() {
    setMode("choose");
    setUsername("");
    setEmail("");
    setCode("");
    setAvail(null);
    setBusy(false);
  }

  function close() {
    reset();
    closeAccountGate();
  }

  async function claim() {
    if (avail !== true || !EMAIL_RE.test(email) || busy) return;
    setBusy(true);
    const res = await requestEmailCode(email.trim(), cleanName);
    setBusy(false);
    if (res.ok) {
      setCode("");
      setMode("code");
    } else if (res.error === "username taken") {
      setAvail(false);
      showToast("That username was just taken — try another.");
    } else if (res.error === "email not configured") {
      showToast("Email isn't set up yet — contact support to enable codes.");
    } else {
      showToast(
        res.error && res.error !== "failed"
          ? `Couldn't send the code: ${res.error}`
          : "Couldn't send the code. Try again."
      );
    }
  }

  async function verify() {
    if (code.trim().length !== 4 || busy) return;
    setBusy(true);
    const res = await verifyEmailCode(email.trim(), code.trim());
    setBusy(false);
    if (res.ok) {
      try {
        localStorage.setItem("veiled.justJoined", "1");
      } catch {
        /* ignore */
      }
      close();
      // The auth listener establishes the identified session + wallet.
    } else {
      showToast(
        res.error === "expired"
          ? "That code expired — request a new one."
          : "Wrong code. Try again."
      );
      setCode("");
    }
  }

  return (
    <AnimatePresence>
      {accountGateOpen && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={close}
            className="fixed inset-0 z-[60] bg-black/80 backdrop-blur-sm"
          />
          <motion.div
            initial={{ y: "100%" }}
            animate={{ y: 0 }}
            exit={{ y: "100%" }}
            transition={{ type: "spring", stiffness: 320, damping: 34 }}
            className="fixed inset-x-0 bottom-0 z-[60] mx-auto flex max-h-[92%] max-w-md flex-col rounded-t-3xl border-t border-white/10 bg-ink-900 px-6 pb-[calc(env(safe-area-inset-bottom,0px)+1.5rem)] pt-5"
          >
            <button
              onClick={close}
              aria-label="Close"
              className="absolute right-4 top-4 flex h-9 w-9 items-center justify-center rounded-full glass active:scale-90"
            >
              <X className="h-4 w-4" />
            </button>

            {mode === "choose" && (
              <>
                <BrandMark className="mb-3 h-12 w-12" />
                <h2 className="font-display text-2xl font-bold text-gradient">
                  Join to do that
                </h2>
                <p className="mt-2 text-sm leading-relaxed text-white/60">
                  You're browsing as a guest. Create a free account to unlock
                  friends, posting perks, and matchmaking — or go all-in with
                  Godmode.
                </p>

                <button
                  onClick={() => setMode("create")}
                  className="mt-6 flex w-full items-center gap-3 rounded-2xl border border-veil-400/30 bg-veil-500/10 p-4 text-left transition active:scale-[0.99]"
                >
                  <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-veil-500/30 text-veil-100">
                    <Sparkles className="h-5 w-5" />
                  </span>
                  <span>
                    <span className="block font-display font-semibold text-white">
                      Create a free account
                    </span>
                    <span className="text-xs text-white/55">
                      Claim a username, verified by email
                    </span>
                  </span>
                </button>

                <button
                  onClick={() => {
                    close();
                    openPremium();
                  }}
                  className="mt-3 flex w-full items-center gap-3 rounded-2xl border border-amber-300/30 bg-amber-300/10 p-4 text-left transition active:scale-[0.99]"
                >
                  <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-amber-400/20 text-amber-300">
                    <Crown className="h-5 w-5" />
                  </span>
                  <span>
                    <span className="block font-display font-semibold text-white">
                      Upgrade to Godmode — {godmodePrice}
                    </span>
                    <span className="text-xs text-white/55">
                      Discounts, exclusives, 5× votes, and more
                    </span>
                  </span>
                </button>
              </>
            )}

            {mode === "create" && (
              <>
                <button
                  onClick={() => setMode("choose")}
                  aria-label="Back"
                  className="mb-3 flex h-9 w-9 items-center justify-center self-start rounded-full glass active:scale-90"
                >
                  <ArrowLeft className="h-4 w-4" />
                </button>
                <h2 className="font-display text-xl font-bold text-white">
                  Choose your username
                </h2>
                <p className="mt-1 text-sm text-white/55">
                  Up to 3 words, letters only. This is your identity across VYBZ.
                </p>
                <input
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="e.g. Green Panda"
                  autoFocus
                  className="mt-4 w-full rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-3.5 text-center text-lg font-semibold text-white placeholder:text-white/30 focus:border-veil-400/60 focus:outline-none"
                />
                <div className="mt-2 h-5 text-sm">
                  {!username ? null : !nameValid ? (
                    <span className="text-white/40">Use 1–3 words, letters only</span>
                  ) : avail === "checking" ? (
                    <span className="text-white/40">Checking…</span>
                  ) : avail === true ? (
                    <span className="font-semibold text-feel">✓ {cleanName} is available</span>
                  ) : avail === false ? (
                    <span className="font-semibold text-wild">Taken — try another</span>
                  ) : null}
                </div>

                <AnimatePresence>
                  {avail === true && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: "auto" }}
                      exit={{ opacity: 0, height: 0 }}
                      className="w-full overflow-hidden"
                    >
                      <div className="mt-3 flex items-center gap-2 rounded-2xl border border-white/10 bg-white/[0.04] px-3">
                        <Mail className="h-4 w-4 shrink-0 text-white/40" />
                        <input
                          value={email}
                          onChange={(e) => setEmail(e.target.value)}
                          type="email"
                          inputMode="email"
                          placeholder="you@email.com"
                          className="w-full bg-transparent py-3.5 text-sm text-white placeholder:text-white/30 focus:outline-none"
                        />
                      </div>
                      <button
                        onClick={claim}
                        disabled={!EMAIL_RE.test(email) || busy}
                        className="btn btn-primary mt-3 w-full"
                      >
                        {busy ? (
                          <Loader2 className="h-5 w-5 animate-spin" />
                        ) : (
                          <>
                            <UserPlus className="h-4 w-4" /> Claim this username
                          </>
                        )}
                      </button>
                    </motion.div>
                  )}
                </AnimatePresence>
              </>
            )}

            {mode === "code" && (
              <>
                <button
                  onClick={() => setMode("create")}
                  aria-label="Back"
                  className="mb-3 flex h-9 w-9 items-center justify-center self-start rounded-full glass active:scale-90"
                >
                  <ArrowLeft className="h-4 w-4" />
                </button>
                <h2 className="font-display text-xl font-bold text-white">Enter your code</h2>
                <p className="mt-1 max-w-[18rem] text-sm text-white/55">
                  We sent a 4-letter code to <span className="text-white/80">{email}</span>.
                </p>
                <input
                  value={code}
                  onChange={(e) =>
                    setCode(e.target.value.toUpperCase().replace(/[^A-Z]/g, "").slice(0, 4))
                  }
                  onKeyDown={(e) => e.key === "Enter" && verify()}
                  autoFocus
                  autoCapitalize="characters"
                  placeholder="••••"
                  className="mt-5 w-44 self-center rounded-2xl border border-white/10 bg-white/[0.04] py-4 text-center font-display text-4xl font-bold tracking-[0.5em] text-white placeholder:text-white/20 focus:border-veil-400/60 focus:outline-none"
                />
                <button
                  onClick={verify}
                  disabled={code.length !== 4 || busy}
                  className="btn btn-primary mt-5 w-full"
                >
                  {busy ? (
                    <Loader2 className="h-5 w-5 animate-spin" />
                  ) : (
                    <>
                      Verify &amp; join <Check className="h-5 w-5" />
                    </>
                  )}
                </button>
                <button onClick={claim} className="mt-3 text-[13px] text-white/45 hover:text-white/70">
                  Resend code
                </button>
              </>
            )}
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}

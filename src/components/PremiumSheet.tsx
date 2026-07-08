import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Link } from "react-router-dom";
import { Check, Crown, Eye, Infinity as InfinityIcon, PlayCircle, X, Zap } from "lucide-react";
import { useApp } from "@/store/AppStore";

const PERKS = [
  { icon: Zap, title: "5× votes" },
  { icon: InfinityIcon, title: "Unlimited DMs" },
  { icon: Eye, title: "Power Ups & Spotlights" },
  { icon: Crown, title: "Exclusives & discounts" },
];

/**
 * Godmode activation — upgrade for life, or watch a short ad for a 24-hour pass.
 * Condensed to fit on screen without scrolling (no inner scroll container).
 */
export function PremiumSheet() {
  const {
    premiumOpen,
    closePremium,
    goPremium,
    isPremium,
    godmodePrice,
    godmodePassUntil,
    activateGodmodePass,
  } = useApp();

  // Rewarded "ad" interstitial (a house promo, not a third-party network).
  const [adLeft, setAdLeft] = useState(0);
  const [started, setStarted] = useState(false);
  const adPlaying = adLeft > 0;

  useEffect(() => {
    if (!adPlaying) return;
    const t = setTimeout(() => setAdLeft((n) => n - 1), 1000);
    return () => clearTimeout(t);
  }, [adLeft, adPlaying]);

  useEffect(() => {
    // When the countdown finishes (was playing), grant the 24h pass.
    if (adLeft === 0 && started) {
      setStarted(false);
      activateGodmodePass();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [adLeft]);

  const passActive = godmodePassUntil > Date.now();
  const passHoursLeft = Math.max(1, Math.ceil((godmodePassUntil - Date.now()) / 3_600_000));

  function watchAd() {
    setStarted(true);
    setAdLeft(5);
  }

  return (
    <AnimatePresence>
      {premiumOpen && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={closePremium}
            className="fixed inset-0 z-[57] bg-black/80 backdrop-blur-sm"
          />
          <motion.div
            initial={{ y: "100%" }}
            animate={{ y: 0 }}
            exit={{ y: "100%" }}
            transition={{ type: "spring", stiffness: 320, damping: 34 }}
            className="fixed inset-x-0 bottom-0 z-[57] mx-auto flex max-h-[96%] max-w-md flex-col overflow-hidden rounded-t-3xl border-t border-amber-300/20 bg-ink-900"
          >
            <div className="pointer-events-none absolute inset-x-0 top-0 h-40 bg-[radial-gradient(circle_at_50%_0%,rgba(251,191,36,0.22),transparent_70%)]" />
            <div className="relative mx-auto mt-3 h-1.5 w-12 rounded-full bg-white/20" />
            <button
              onClick={closePremium}
              aria-label="Close"
              className="absolute right-4 top-4 z-10 flex h-9 w-9 items-center justify-center rounded-full glass active:scale-90"
            >
              <X className="h-4 w-4" />
            </button>

            <div className="relative px-6 pb-[calc(env(safe-area-inset-bottom,0px)+1.25rem)] pt-5">
              <div className="mb-4 text-center">
                <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-2xl bg-amber-400/15 text-amber-300 animate-pulse-glow">
                  <Crown className="h-7 w-7" />
                </div>
                <h2 className="font-display text-2xl font-bold">
                  <span className="bg-gradient-to-r from-amber-200 via-amber-300 to-amber-100 bg-clip-text text-transparent">
                    Godmode
                  </span>
                </h2>
                <p className="mt-0.5 text-xs uppercase tracking-[0.3em] text-amber-200/70">
                  VYBZ Plus
                </p>
              </div>

              {isPremium ? (
                <div className="rounded-2xl border border-amber-300/30 bg-amber-400/10 p-5 text-center">
                  <Check className="mx-auto mb-2 h-7 w-7 text-amber-300" />
                  <p className="font-display text-lg font-semibold text-white">
                    {passActive ? `Godmode pass active — ${passHoursLeft}h left` : "Godmode is active"}
                  </p>
                  <p className="mt-1 text-sm text-white/60">
                    {passActive
                      ? "Enjoy the perks. Upgrade any time to keep them for life."
                      : "Unlimited messaging, 5× votes, and Power Ups — for life."}
                  </p>
                  {passActive && (
                    <button
                      onClick={goPremium}
                      className="mt-4 w-full rounded-2xl bg-gradient-to-r from-amber-400 to-amber-300 py-3 font-display font-bold text-ink-950 transition active:scale-[0.98]"
                    >
                      Make it permanent — {godmodePrice}
                    </button>
                  )}
                  <button
                    onClick={closePremium}
                    className="mt-2 w-full rounded-2xl bg-white/10 py-3 font-display font-semibold text-white transition active:scale-[0.98]"
                  >
                    Done
                  </button>
                </div>
              ) : (
                <>
                  <div className="grid grid-cols-2 gap-2">
                    {PERKS.map((perk) => (
                      <div
                        key={perk.title}
                        className="flex items-center gap-2 rounded-xl border border-white/8 bg-white/[0.03] px-3 py-2.5"
                      >
                        <perk.icon className="h-4 w-4 shrink-0 text-amber-300" />
                        <p className="text-xs font-semibold leading-tight text-white/85">
                          {perk.title}
                        </p>
                      </div>
                    ))}
                  </div>

                  <button
                    onClick={goPremium}
                    className="mt-5 flex w-full items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-amber-400 to-amber-300 py-3.5 font-display text-base font-bold text-ink-950 shadow-[0_0_40px_-8px_rgba(251,191,36,0.6)] transition active:scale-[0.98]"
                  >
                    <Crown className="h-5 w-5" />
                    Unlock for life — {godmodePrice}
                  </button>

                  <div className="my-2.5 flex items-center gap-3 text-[11px] uppercase tracking-wider text-white/30">
                    <span className="h-px flex-1 bg-white/10" /> or{" "}
                    <span className="h-px flex-1 bg-white/10" />
                  </div>

                  <button
                    onClick={watchAd}
                    className="flex w-full items-center justify-center gap-2 rounded-2xl border border-white/12 bg-white/[0.04] py-3 text-sm font-semibold text-white/85 transition active:scale-[0.98]"
                  >
                    <PlayCircle className="h-4 w-4 text-amber-200" />
                    Watch a short ad — free 24-hour pass
                  </button>

                  <p className="mt-3 text-center text-[11px] leading-relaxed text-white/35">
                    One-time payment via Stripe · no subscription ·{" "}
                    <span className="text-white/55">all sales final, no refunds</span>. By
                    purchasing you agree to our{" "}
                    <Link to="/legal/terms" onClick={closePremium} className="text-veil-300 underline">
                      Terms
                    </Link>{" "}
                    &amp;{" "}
                    <Link to="/legal/refunds" onClick={closePremium} className="text-veil-300 underline">
                      Refunds
                    </Link>
                    .
                  </p>
                </>
              )}
            </div>

            {/* Rewarded interstitial overlay. */}
            <AnimatePresence>
              {adPlaying && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="absolute inset-0 z-20 flex flex-col items-center justify-center gap-4 bg-ink-950/95 px-8 text-center"
                >
                  <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-amber-400/15 text-amber-300">
                    <Crown className="h-8 w-8 animate-pulse" />
                  </div>
                  <p className="font-display text-xl font-bold text-white">VYBZ · Godmode</p>
                  <p className="max-w-xs text-sm text-white/55">
                    Your free 24-hour pass unlocks in {adLeft}s…
                  </p>
                  <div className="font-display text-5xl font-bold text-amber-300">{adLeft}</div>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}

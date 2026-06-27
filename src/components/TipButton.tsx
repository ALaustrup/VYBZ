import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Coins } from "lucide-react";
import { useApp } from "@/store/AppStore";
import { cx } from "@/lib/utils";

interface TipButtonProps {
  /** The recipient's backend profile id. */
  toUserId?: string;
  /** A reference (e.g. confession id) recorded with the tip. */
  reff?: string;
  compact?: boolean;
}

const AMOUNTS = [5, 10, 25, 50];

/**
 * Tip another user V¢ from their post or profile. Hidden for anonymous accounts
 * (no wallet) and for your own content.
 */
export function TipButton({ toUserId, reff, compact }: TipButtonProps) {
  const { hasWallet, profileId, tip } = useApp();
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);

  if (!hasWallet || !toUserId || toUserId === profileId) return null;

  async function send(amount: number) {
    setBusy(true);
    await tip(toUserId as string, amount, reff);
    setBusy(false);
    setOpen(false);
  }

  return (
    <div className="relative">
      <button
        onClick={() => setOpen((v) => !v)}
        aria-label="Tip V¢"
        className={cx(
          "flex items-center gap-1.5 rounded-full border border-amber-300/30 bg-amber-300/10 font-semibold text-amber-200 transition active:scale-95",
          compact ? "h-9 w-9 justify-center" : "px-3 py-1.5 text-xs"
        )}
      >
        <Coins className="h-4 w-4" />
        {!compact && "Tip"}
      </button>
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: 6, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 6, scale: 0.96 }}
            className="absolute right-0 z-20 mt-2 flex gap-1 rounded-2xl border border-white/10 bg-ink-900 p-1.5 shadow-glow"
          >
            {AMOUNTS.map((a) => (
              <button
                key={a}
                disabled={busy}
                onClick={() => send(a)}
                className="rounded-xl bg-amber-300/15 px-2.5 py-1.5 text-xs font-bold text-amber-200 active:scale-90 disabled:opacity-50"
              >
                {a}
              </button>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

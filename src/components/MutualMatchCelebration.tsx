import { motion } from "framer-motion";
import { Heart, X } from "lucide-react";
import { FreeConnectActions } from "@/components/FreeConnectActions";

/** Mutual like celebration → free Message / voice / cam (never paywalled). */
export function MutualMatchCelebration({
  peerId,
  peerName,
  deck,
  onClose,
}: {
  peerId: string;
  peerName: string | null;
  deck: "love" | "meetup";
  onClose: () => void;
}) {
  const label = peerName ? `@${peerName}` : "someone";
  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center bg-ink-950/75 p-4 backdrop-blur-md" onClick={onClose}>
      <motion.div
        role="dialog"
        aria-label="It's a match"
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        className="relative w-full max-w-sm rounded-3xl border border-feel/30 bg-ink-900/95 p-6 text-center shadow-card"
        onClick={(e) => e.stopPropagation()}
      >
        <button type="button" onClick={onClose} aria-label="Close" className="absolute right-3 top-3 rounded-full p-2 text-white/40 hover:bg-white/8">
          <X className="h-4 w-4" />
        </button>
        <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-full bg-feel/20 text-feel">
          <Heart className="h-7 w-7" fill="currentColor" />
        </div>
        <h2 className="font-display text-2xl font-bold text-white">It&apos;s a match</h2>
        <p className="mt-1.5 text-sm text-white/60">
          You and {label} both said yes
          {deck === "meetup" ? " for meetup vibes" : ""}.
        </p>
        <p className="mt-3 text-[12px] font-medium text-feel/90">Message, voice, and cam — free forever</p>
        <div className="mt-5">
          <FreeConnectActions peerId={peerId} peerName={peerName} variant="spark" />
        </div>
        <button type="button" onClick={onClose} className="mt-4 text-[12px] text-white/40 hover:text-white/70">
          Keep swiping
        </button>
      </motion.div>
    </div>
  );
}

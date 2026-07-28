import { MessageSquare, X } from "lucide-react";
import { AnimatePresence, motion } from "framer-motion";
import { WaveComments } from "@/components/WaveComments";

/** Full-height comments board for the now-playing drop (SoundCloud-style). */
export function TrackCommentsSheet({
  open,
  onClose,
  dropId,
  title,
  artist,
}: {
  open: boolean;
  onClose: () => void;
  dropId: string | null;
  title?: string;
  artist?: string;
}) {
  return (
    <AnimatePresence>
      {open && dropId && (
        <>
          <motion.button
            type="button"
            aria-label="Close comments"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[82] bg-black/70 backdrop-blur-sm"
            onClick={onClose}
          />
          <motion.div
            role="dialog"
            aria-modal="true"
            aria-label="Track comments"
            initial={{ y: "100%" }}
            animate={{ y: 0 }}
            exit={{ y: "100%" }}
            transition={{ type: "spring", stiffness: 380, damping: 34 }}
            className="fixed inset-x-0 bottom-0 z-[83] mx-auto flex max-h-[min(88dvh,40rem)] w-full max-w-lg flex-col rounded-t-3xl border-t border-white/12 bg-ink-900/96 shadow-card backdrop-blur-2xl"
          >
            <div className="flex items-start gap-3 border-b border-white/10 px-4 pb-3 pt-4">
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-cyan-500/15 text-cyan-200">
                <MessageSquare className="h-5 w-5" />
              </span>
              <div className="min-w-0 flex-1">
                <p className="font-display text-[15px] font-semibold text-white truncate">{title || "Track"}</p>
                <p className="truncate text-[12px] text-white/45">{artist || "Comments"}</p>
              </div>
              <button
                type="button"
                onClick={onClose}
                className="flex h-9 w-9 items-center justify-center rounded-full text-white/55 hover:bg-white/10 hover:text-white"
                aria-label="Close"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="no-scrollbar min-h-0 flex-1 overflow-y-auto px-4 py-3 pb-[max(1rem,env(safe-area-inset-bottom))]">
              <WaveComments dropId={dropId} />
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}

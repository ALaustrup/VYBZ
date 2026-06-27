import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Ban, Flag, MoreHorizontal } from "lucide-react";
import { useApp } from "@/store/AppStore";
import type { Confession } from "@/types";

interface SafetyMenuProps {
  confession: Confession;
  /** Optional override for the trigger button styling. */
  className?: string;
}

const REASONS = [
  "Harassment or hate",
  "Sexual or explicit",
  "Violence or threats",
  "Spam or scam",
  "Other",
];

/** Report / block affordance for a confession and its poster. */
export function SafetyMenu({ confession, className }: SafetyMenuProps) {
  const { report, blockAuthor } = useApp();
  const [open, setOpen] = useState(false);
  const [reasoning, setReasoning] = useState(false);

  function close() {
    setOpen(false);
    setReasoning(false);
  }

  return (
    <div className="relative">
      <button
        onClick={() => setOpen((v) => !v)}
        aria-label="Report or block"
        className={
          className ??
          "flex h-9 w-9 items-center justify-center rounded-full glass text-white/70 active:scale-90"
        }
      >
        <MoreHorizontal className="h-4 w-4" />
      </button>

      <AnimatePresence>
        {open && (
          <>
            {/* Tap-away scrim. */}
            <button
              aria-hidden
              onClick={close}
              className="fixed inset-0 z-[60] cursor-default"
            />
            <motion.div
              initial={{ opacity: 0, y: -6, scale: 0.96 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -6, scale: 0.96 }}
              transition={{ duration: 0.16 }}
              className="absolute right-0 top-11 z-[61] w-52 overflow-hidden rounded-2xl border border-white/10 bg-ink-900/95 p-1.5 shadow-card backdrop-blur-xl"
            >
              {!reasoning ? (
                <>
                  <button
                    onClick={() => setReasoning(true)}
                    className="flex w-full items-center gap-2.5 rounded-xl px-3 py-2.5 text-left text-sm font-medium text-white/90 transition active:bg-white/5"
                  >
                    <Flag className="h-4 w-4 text-wild" />
                    Report confession
                  </button>
                  <button
                    onClick={() => {
                      blockAuthor(confession);
                      close();
                    }}
                    className="flex w-full items-center gap-2.5 rounded-xl px-3 py-2.5 text-left text-sm font-medium text-white/90 transition active:bg-white/5"
                  >
                    <Ban className="h-4 w-4 text-wild" />
                    Block poster
                  </button>
                </>
              ) : (
                <div className="p-1">
                  <p className="px-2 pb-1.5 pt-1 text-[11px] font-semibold uppercase tracking-wider text-white/40">
                    Why are you reporting?
                  </p>
                  {REASONS.map((r) => (
                    <button
                      key={r}
                      onClick={() => {
                        report("confession", confession.id, r);
                        close();
                      }}
                      className="block w-full rounded-xl px-3 py-2 text-left text-sm text-white/80 transition active:bg-white/5"
                    >
                      {r}
                    </button>
                  ))}
                </div>
              )}
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}

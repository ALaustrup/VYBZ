import { AnimatePresence, motion } from "framer-motion";

import { useApp } from "@/store/AppStore";

/**
 * Global media-upload indicator: a slim, glowing indigo progress line pinned to
 * the very top of the app plus a subtle pulsing chip. It reads upload state from
 * the store, so it persists across page navigation while a post's media uploads.
 */
export function UploadIndicator() {
  const { uploadProgress } = useApp();
  const active = uploadProgress !== null;
  const frac = uploadProgress ?? 0;
  const pct = Math.round(frac * 100);
  const done = frac >= 1;

  return (
    <AnimatePresence>
      {active && (
        <motion.div
          key="upload-indicator"
          initial={{ opacity: 0, y: -6 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -6 }}
          transition={{ duration: 0.25 }}
          className="pointer-events-none fixed inset-x-0 top-0 z-[120]"
        >
          {/* Glowing progress line. */}
          <div className="relative h-[3px] w-full overflow-hidden bg-white/[0.06]">
            <motion.div
              className="absolute inset-y-0 left-0 rounded-r-full"
              style={{
                background:
                  "linear-gradient(90deg, #4338ca 0%, #6366f1 55%, #a5b4fc 100%)",
                boxShadow:
                  "0 0 12px 1px rgba(99,102,241,0.85), 0 0 4px rgba(165,180,252,0.95)",
              }}
              animate={{ width: `${Math.max(5, pct)}%` }}
              transition={{ type: "spring", stiffness: 120, damping: 24 }}
            />
            {/* A light pulse riding across while bytes are still in flight. */}
            {!done && (
              <motion.div
                className="absolute inset-y-0 w-20"
                style={{
                  background:
                    "linear-gradient(90deg, transparent, rgba(255,255,255,0.55), transparent)",
                }}
                animate={{ left: ["-12%", "112%"] }}
                transition={{ duration: 1.15, repeat: Infinity, ease: "easeInOut" }}
              />
            )}
          </div>

          {/* Subtle status chip with a pulsing light. */}
          <div className="mt-1.5 flex justify-center">
            <div className="flex items-center gap-2 rounded-full border border-white/10 bg-ink-950/70 px-3 py-1 text-[11px] font-semibold text-white/80 backdrop-blur-md">
              <motion.span
                className="h-1.5 w-1.5 rounded-full"
                style={{
                  background: done ? "#34f5a0" : "#818cf8",
                  boxShadow: done
                    ? "0 0 8px 1px rgba(52,245,160,0.9)"
                    : "0 0 8px 1px rgba(129,140,248,0.95)",
                }}
                animate={done ? { opacity: 1, scale: 1 } : { opacity: [0.4, 1, 0.4], scale: [0.85, 1.15, 0.85] }}
                transition={done ? { duration: 0.2 } : { duration: 1.1, repeat: Infinity, ease: "easeInOut" }}
              />
              {done ? "Posted" : `Uploading ${pct}%`}
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

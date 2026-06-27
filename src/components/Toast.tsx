import { AnimatePresence, motion } from "framer-motion";
import { useApp } from "@/store/AppStore";

/** Transient, non-blocking status message anchored above the bottom nav. */
export function Toast() {
  const { toast } = useApp();
  return (
    <AnimatePresence>
      {toast && (
        <motion.div
          key={toast.token}
          initial={{ opacity: 0, y: 24, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 24, scale: 0.95 }}
          transition={{ type: "spring", stiffness: 360, damping: 26 }}
          className="pointer-events-none fixed inset-x-0 bottom-28 z-[58] mx-auto flex max-w-md justify-center px-6"
        >
          <div className="glass rounded-full px-4 py-2.5 text-center text-sm font-medium text-white shadow-glow">
            {toast.text}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

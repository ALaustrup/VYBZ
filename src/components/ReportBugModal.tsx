import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Bug, Loader2, X } from "lucide-react";
import { useSession } from "@/store/session";
import * as api from "@/lib/api";

const inputCls =
  "w-full rounded-xl border border-white/10 bg-white/[0.03] px-3.5 py-2.5 text-sm text-white placeholder:text-white/35 focus:border-veil-400/60 focus:outline-none";

/** Lightweight bug reporter available to any signed-in creator. */
export function ReportBugModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { showToast } = useSession();
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit() {
    if (title.trim().length < 3 || busy) return;
    setBusy(true);
    try {
      await api.submitBugReport(title.trim(), body.trim(), {
        page: typeof window !== "undefined" ? window.location.pathname : "",
        ua: typeof navigator !== "undefined" ? navigator.userAgent : "",
      });
      showToast("Thanks — bug report sent");
      setTitle(""); setBody(""); onClose();
    } catch { showToast("Couldn't send that report."); }
    finally { setBusy(false); }
  }

  return (
    <AnimatePresence>
      {open && (
        <motion.div className="fixed inset-0 z-[80] flex items-end justify-center sm:items-center"
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
          <div className="absolute inset-0 bg-ink-950/70 backdrop-blur-sm" onClick={onClose} />
          <motion.div initial={{ y: 24, opacity: 0, scale: 0.98 }} animate={{ y: 0, opacity: 1, scale: 1 }} exit={{ y: 24, opacity: 0, scale: 0.98 }}
            transition={{ type: "spring", stiffness: 320, damping: 30 }}
            className="glass-panel relative z-10 w-full max-w-md rounded-t-3xl p-5 sm:rounded-3xl">
            <div className="mb-3 flex items-center gap-2">
              <Bug className="h-5 w-5 text-veil-300" />
              <h2 className="flex-1 font-display text-lg font-bold text-white">Report a bug</h2>
              <button onClick={onClose} aria-label="Close" className="flex h-8 w-8 items-center justify-center rounded-full glass active:scale-90"><X className="h-4 w-4" /></button>
            </div>
            <div className="space-y-2.5">
              <input value={title} onChange={(e) => setTitle(e.target.value.slice(0, 120))} placeholder="What went wrong? (short summary)" className={inputCls} />
              <textarea value={body} onChange={(e) => setBody(e.target.value.slice(0, 1000))} rows={4} placeholder="Steps to reproduce, what you expected, anything else…" className={inputCls + " resize-none"} />
              <p className="text-[11px] text-white/40">We attach the current page automatically to help us track it down.</p>
              <button onClick={submit} disabled={busy || title.trim().length < 3} className="btn btn-primary h-11 w-full py-0 text-sm disabled:opacity-50">
                {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : "Send report"}
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

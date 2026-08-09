import { useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Bug, ImagePlus, Loader2, X } from "lucide-react";
import { useSession } from "@/store/session";
import * as api from "@/lib/api";
import { compressImageForReport } from "@/lib/compressImageForReport";

const inputField = "forge-field";

/** Bug / feedback reporter for signed-in Alpha testers (optional screenshot). */
export function ReportBugModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { showToast } = useSession();
  const fileRef = useRef<HTMLInputElement>(null);
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [busy, setBusy] = useState(false);
  const [shot, setShot] = useState<{ dataUrl: string; name: string } | null>(null);
  const [shotBusy, setShotBusy] = useState(false);

  function reset() {
    setTitle("");
    setBody("");
    setShot(null);
  }

  async function onPickScreenshot(file: File | undefined) {
    if (!file) return;
    setShotBusy(true);
    try {
      const compressed = await compressImageForReport(file);
      if (!compressed) {
        showToast("Couldn't attach that image — try a smaller screenshot");
        return;
      }
      setShot(compressed);
    } catch {
      showToast("Couldn't read that image");
    } finally {
      setShotBusy(false);
    }
  }

  async function submit() {
    if (title.trim().length < 3 || busy) return;
    setBusy(true);
    try {
      const context: Record<string, unknown> = {
        page: typeof window !== "undefined" ? window.location.pathname : "",
        ua: typeof navigator !== "undefined" ? navigator.userAgent : "",
        kind: "alpha-feedback",
      };
      if (shot) {
        context.screenshotDataUrl = shot.dataUrl;
        context.screenshotName = shot.name;
      }
      await api.submitBugReport(title.trim(), body.trim(), context);
      showToast("Thanks — feedback sent");
      reset();
      onClose();
    } catch {
      showToast("Couldn't send that report.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-0 z-[90] flex items-end justify-center sm:items-center"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          data-testid="report-bug-modal"
        >
          <div className="absolute inset-0 bg-ink-950/70 backdrop-blur-sm" onClick={onClose} />
          <motion.div
            initial={{ y: 24, opacity: 0, scale: 0.98 }}
            animate={{ y: 0, opacity: 1, scale: 1 }}
            exit={{ y: 24, opacity: 0, scale: 0.98 }}
            transition={{ type: "spring", stiffness: 320, damping: 30 }}
            className="forge-glass relative z-10 w-full max-w-md rounded-t-3xl p-5 sm:rounded-3xl"
          >
            <span className="forge-glass-edge" aria-hidden />
            <div className="relative z-[1]">
              <div className="mb-3 flex items-center gap-2">
                <Bug className="h-5 w-5 text-[rgb(var(--accent-rgb)/0.95)]" />
                <h2 className="nexus-headline flex-1 text-lg">Feedback / bug report</h2>
                <button
                  type="button"
                  onClick={onClose}
                  aria-label="Close"
                  className="forge-chip flex h-8 w-8 items-center justify-center !p-0 active:scale-90"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
              <div className="space-y-2.5">
                <div className={inputField}>
                  <input
                    value={title}
                    onChange={(e) => setTitle(e.target.value.slice(0, 120))}
                    placeholder="Short summary"
                    data-testid="report-bug-title"
                  />
                </div>
                <div className={`${inputField} items-start`}>
                  <textarea
                    value={body}
                    onChange={(e) => setBody(e.target.value.slice(0, 2000))}
                    rows={4}
                    placeholder="What happened, what you expected, or any idea — anything helps."
                    className="w-full resize-none bg-transparent text-sm text-white outline-none placeholder:text-white/35"
                    data-testid="report-bug-body"
                  />
                </div>

                <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-3">
                  <input
                    ref={fileRef}
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={(e) => {
                      const f = e.target.files?.[0];
                      e.target.value = "";
                      void onPickScreenshot(f);
                    }}
                  />
                  {shot ? (
                    <div className="flex items-start gap-3">
                      <img
                        src={shot.dataUrl}
                        alt="Screenshot preview"
                        className="h-16 w-16 shrink-0 rounded-lg object-cover ring-1 ring-white/15"
                      />
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-[12px] text-white/70">{shot.name}</p>
                        <button
                          type="button"
                          onClick={() => setShot(null)}
                          className="mt-1 text-[11px] text-white/45 hover:text-white/75"
                        >
                          Remove screenshot
                        </button>
                      </div>
                    </div>
                  ) : (
                    <button
                      type="button"
                      disabled={shotBusy}
                      onClick={() => fileRef.current?.click()}
                      className="inline-flex w-full items-center justify-center gap-2 rounded-xl border border-dashed border-white/15 px-3 py-2.5 text-[13px] text-white/65 transition hover:border-[rgb(var(--accent-rgb)/0.4)] hover:text-white"
                      data-testid="report-bug-screenshot"
                    >
                      {shotBusy ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <ImagePlus className="h-4 w-4" />
                      )}
                      Add screenshot (optional)
                    </button>
                  )}
                </div>

                <p className="text-[11px] text-white/40">
                  We attach the current page automatically. Screenshots are optional.
                </p>
                <button
                  type="button"
                  onClick={() => void submit()}
                  disabled={busy || title.trim().length < 3}
                  className="forge-cta h-11 w-full disabled:opacity-50"
                  data-testid="report-bug-submit"
                >
                  {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : "Send"}
                </button>
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

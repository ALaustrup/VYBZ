import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Download, Share, X } from "lucide-react";

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

const DISMISS_KEY = "veiled.installDismissed";

function isStandalone(): boolean {
  return (
    window.matchMedia("(display-mode: standalone)").matches ||
    // iOS Safari exposes navigator.standalone.
    (window.navigator as unknown as { standalone?: boolean }).standalone === true
  );
}

/**
 * A gentle "Add to Home Screen" banner. On Android/Chromium it triggers the
 * native install prompt; on iOS (which has no prompt API) it explains the
 * Share → Add to Home Screen gesture. Dismissals are remembered.
 */
export function InstallPrompt() {
  const [deferred, setDeferred] = useState<BeforeInstallPromptEvent | null>(null);
  const [show, setShow] = useState(false);
  const [isIOS, setIsIOS] = useState(false);

  useEffect(() => {
    if (isStandalone()) return;
    if (localStorage.getItem(DISMISS_KEY)) return;

    const ua = window.navigator.userAgent;
    const ios = /iphone|ipad|ipod/i.test(ua);
    setIsIOS(ios);

    const onPrompt = (e: Event) => {
      e.preventDefault();
      setDeferred(e as BeforeInstallPromptEvent);
      setShow(true);
    };
    window.addEventListener("beforeinstallprompt", onPrompt);

    // iOS never fires the event — surface the manual hint after a short beat.
    let t: number | undefined;
    if (ios) t = window.setTimeout(() => setShow(true), 2600);

    return () => {
      window.removeEventListener("beforeinstallprompt", onPrompt);
      if (t) clearTimeout(t);
    };
  }, []);

  function dismiss() {
    setShow(false);
    try {
      localStorage.setItem(DISMISS_KEY, "1");
    } catch {
      // Non-fatal.
    }
  }

  async function install() {
    if (!deferred) return;
    await deferred.prompt();
    await deferred.userChoice;
    setDeferred(null);
    dismiss();
  }

  return (
    <AnimatePresence>
      {show && (
        <motion.div
          initial={{ opacity: 0, y: 28 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 28 }}
          transition={{ type: "spring", stiffness: 320, damping: 28 }}
          className="fixed inset-x-0 bottom-24 z-[59] mx-auto max-w-md px-4"
        >
          <div className="glass flex items-center gap-3 rounded-2xl p-3 shadow-glow">
            <img
              src="/icons/icon-192.png"
              alt=""
              className="h-11 w-11 shrink-0 rounded-xl"
            />
            <div className="min-w-0 flex-1">
              <p className="font-display text-sm font-semibold text-white">
                Install VYBZ
              </p>
              {isIOS ? (
                <p className="flex items-center gap-1 text-xs text-white/55">
                  Tap <Share className="h-3.5 w-3.5" /> then “Add to Home Screen”
                </p>
              ) : (
                <p className="text-xs text-white/55">
                  Add it to your home screen for the full app feel.
                </p>
              )}
            </div>
            {!isIOS && (
              <button
                onClick={install}
                className="flex shrink-0 items-center gap-1.5 rounded-full bg-veil-500 px-4 py-2 text-sm font-semibold text-white shadow-glow transition active:scale-95"
              >
                <Download className="h-4 w-4" />
                Install
              </button>
            )}
            <button
              onClick={dismiss}
              aria-label="Dismiss"
              className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-white/5 text-white/50 active:scale-90"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

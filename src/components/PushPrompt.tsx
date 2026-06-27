import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Bell, X } from "lucide-react";
import { useApp } from "@/store/AppStore";
import { dontAskPushAgain } from "@/lib/push";

/**
 * Soft, one-time push-permission prompt. Shown only after a positive micro-moment
 * (a first Vyb) and never nags: "Not now" means never again. Tapping Enable
 * triggers the native permission request and registers the subscription.
 */
export function PushPrompt() {
  const { pushPromptOpen, closePushPrompt, enablePushNotifications, showToast } =
    useApp();
  const [busy, setBusy] = useState(false);

  async function enable() {
    setBusy(true);
    const ok = await enablePushNotifications();
    setBusy(false);
    closePushPrompt();
    showToast(
      ok
        ? "Gentle nudges on — we'll only reach out when it matters."
        : "No worries — you can turn these on anytime in Settings."
    );
  }

  function notNow() {
    dontAskPushAgain();
    closePushPrompt();
  }

  return (
    <AnimatePresence>
      {pushPromptOpen && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={notNow}
            className="fixed inset-0 z-[62] bg-black/70 backdrop-blur-sm"
          />
          <motion.div
            initial={{ y: "100%" }}
            animate={{ y: 0 }}
            exit={{ y: "100%" }}
            transition={{ type: "spring", stiffness: 320, damping: 34 }}
            className="fixed inset-x-0 bottom-0 z-[62] mx-auto max-w-md rounded-t-3xl border-t border-white/10 bg-ink-900 px-6 pb-[calc(env(safe-area-inset-bottom,0px)+1.5rem)] pt-5"
          >
            <button
              onClick={notNow}
              aria-label="Close"
              className="absolute right-4 top-4 flex h-9 w-9 items-center justify-center rounded-full glass active:scale-90"
            >
              <X className="h-4 w-4" />
            </button>
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-veil-500/20 text-veil-200">
              <Bell className="h-6 w-6" />
            </div>
            <h2 className="mt-4 font-display text-xl font-bold text-white">
              Gentle nudges?
            </h2>
            <p className="mt-2 text-sm leading-relaxed text-white/60">
              We'll only reach out when it's genuinely kind or useful — when people
              connect with your whispers, when you match with someone, or when your
              daily Pulse is ready. Never spam. Pause anytime.
            </p>
            <button
              onClick={enable}
              disabled={busy}
              className="mt-5 w-full rounded-2xl bg-veil-500 py-3.5 font-display font-semibold text-white shadow-glow transition active:scale-[0.98] disabled:opacity-60"
            >
              {busy ? "Enabling…" : "Enable gentle nudges"}
            </button>
            <button
              onClick={notNow}
              className="mt-2 w-full rounded-2xl border border-white/10 bg-white/[0.03] py-3 text-sm font-semibold text-white/70 transition active:scale-[0.98]"
            >
              Not now
            </button>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}

import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  Bug,
  Check,
  Heart,
  Lightbulb,
  Loader2,
  MessageSquare,
  Phone,
  Send,
  ShieldAlert,
  X,
} from "lucide-react";
import { useApp } from "@/store/AppStore";
import { submitFeedback, type FeedbackCategory } from "@/lib/backend";
import { CRISIS_RESOURCES } from "@/lib/safety";
import { cx } from "@/lib/utils";

/**
 * One channel for everything user → MYVYB: bug reports, feature ideas, getting
 * help, or just talking to an operator. The top of the sheet is always the
 * "Need help right now?" escalation: 988 + Lifelines, so this never accidentally
 * becomes a slow path for someone in crisis.
 */
export function FeedbackSheet() {
  const { feedbackOpen, closeFeedback, openLifeline, showToast } = useApp();
  const [category, setCategory] = useState<FeedbackCategory>("bug");
  const [body, setBody] = useState("");
  const [contact, setContact] = useState("");
  const [busy, setBusy] = useState(false);
  const [sent, setSent] = useState(false);

  const CATS: { id: FeedbackCategory; label: string; icon: typeof Bug; tone: string }[] = [
    { id: "bug", label: "Report a bug", icon: Bug, tone: "text-wild" },
    { id: "feature", label: "Suggest a feature", icon: Lightbulb, tone: "text-amber-300" },
    { id: "help", label: "Get help", icon: Heart, tone: "text-feel" },
    { id: "other", label: "Other / contact admin", icon: MessageSquare, tone: "text-veil-200" },
  ];

  async function send() {
    if (body.trim().length < 3 || busy) return;
    setBusy(true);
    const ok = await submitFeedback({
      category,
      body: body.trim(),
      contact: contact.trim() || undefined,
    });
    setBusy(false);
    if (ok) {
      setSent(true);
      setBody("");
      setContact("");
      showToast("Thanks — your message reached an operator.");
    } else {
      showToast("Couldn't send right now. Try again in a moment.");
    }
  }

  function close() {
    setSent(false);
    closeFeedback();
  }

  return (
    <AnimatePresence>
      {feedbackOpen && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={close}
            className="fixed inset-0 z-[59] bg-black/80 backdrop-blur-sm"
          />
          <motion.div
            initial={{ y: "100%" }}
            animate={{ y: 0 }}
            exit={{ y: "100%" }}
            transition={{ type: "spring", stiffness: 320, damping: 34 }}
            className="fixed inset-x-0 bottom-0 z-[59] mx-auto flex max-h-[92%] max-w-md flex-col rounded-t-3xl border-t border-white/10 bg-ink-900"
          >
            <div className="mx-auto mt-3 h-1.5 w-12 rounded-full bg-white/20" />
            <div className="flex items-center justify-between px-5 pb-1 pt-3">
              <h2 className="font-display text-xl font-bold text-gradient">Send us a message</h2>
              <button
                onClick={close}
                aria-label="Close"
                className="flex h-9 w-9 items-center justify-center rounded-full glass active:scale-90"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="no-scrollbar flex-1 overflow-y-auto px-5 pb-[calc(env(safe-area-inset-bottom,0px)+1.5rem)] pt-2">
              {/* Always-visible immediate-help row. Never make someone in crisis
                  wait for a form. */}
              <div className="mb-3 rounded-2xl border border-feel/30 bg-feel/[0.08] p-3">
                <p className="mb-2 text-[12px] font-semibold text-feel">
                  Need help right now?
                </p>
                <div className="flex flex-wrap gap-1.5">
                  <button
                    onClick={() => {
                      close();
                      openLifeline();
                    }}
                    className="flex items-center gap-1.5 rounded-full bg-feel px-3 py-1.5 text-xs font-bold text-black active:scale-95"
                  >
                    <Heart className="h-3.5 w-3.5" /> Talk to a Lifeline
                  </button>
                  <a
                    href={CRISIS_RESOURCES.callHref}
                    className="flex items-center gap-1.5 rounded-full bg-feel/20 px-3 py-1.5 text-xs font-semibold text-feel"
                  >
                    <Phone className="h-3.5 w-3.5" /> Call or text 988 (US)
                  </a>
                  <a
                    href={CRISIS_RESOURCES.findHelpHref}
                    target="_blank"
                    rel="noreferrer"
                    className="rounded-full border border-white/15 px-3 py-1.5 text-xs font-semibold text-white/70"
                  >
                    Find a helpline
                  </a>
                </div>
              </div>

              {sent ? (
                <div className="rounded-2xl border border-feel/30 bg-feel/[0.06] p-5 text-center">
                  <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-feel/20 text-feel">
                    <Check className="h-6 w-6" />
                  </div>
                  <p className="font-display text-base font-bold text-white">Got it.</p>
                  <p className="mt-1 text-sm text-white/55">
                    An operator will see this. If you left a contact, we'll get back to you.
                  </p>
                  <button
                    onClick={close}
                    className="mt-4 rounded-full bg-veil-500 px-5 py-2 text-sm font-semibold text-white shadow-glow"
                  >
                    Done
                  </button>
                </div>
              ) : (
                <>
                  <p className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-white/40">
                    What's this about?
                  </p>
                  <div className="mb-3 grid grid-cols-2 gap-2">
                    {CATS.map(({ id, label, icon: Icon, tone }) => (
                      <button
                        key={id}
                        onClick={() => setCategory(id)}
                        className={cx(
                          "flex items-center gap-2 rounded-2xl border p-3 text-left transition active:scale-[0.98]",
                          category === id
                            ? "border-veil-400/50 bg-veil-500/15"
                            : "border-white/8 bg-white/[0.02]"
                        )}
                      >
                        <Icon className={cx("h-4 w-4", tone)} />
                        <span className="text-xs font-semibold text-white">{label}</span>
                      </button>
                    ))}
                  </div>

                  <textarea
                    value={body}
                    onChange={(e) => setBody(e.target.value.slice(0, 4000))}
                    placeholder={
                      category === "bug"
                        ? "What happened? What were you trying to do?"
                        : category === "feature"
                          ? "What's missing? What would you build?"
                          : category === "help"
                            ? "What do you need help with?"
                            : "Tell us anything."
                    }
                    rows={5}
                    className="w-full resize-none rounded-2xl border border-white/10 bg-white/[0.04] p-3 text-sm leading-relaxed text-white placeholder:text-white/35 focus:border-veil-400/60 focus:outline-none"
                  />
                  <p className="mt-1 text-right text-[10px] text-white/30">
                    {body.length}/4000
                  </p>

                  <label className="mt-2 block text-[11px] font-semibold uppercase tracking-wider text-white/40">
                    Want us to reply? (optional)
                  </label>
                  <input
                    value={contact}
                    onChange={(e) => setContact(e.target.value.slice(0, 200))}
                    placeholder="email or username — leave blank to stay anonymous"
                    className="mt-1 w-full rounded-2xl border border-white/10 bg-white/[0.04] px-3 py-2.5 text-sm text-white placeholder:text-white/35 focus:border-veil-400/60 focus:outline-none"
                  />

                  <button
                    onClick={send}
                    disabled={busy || body.trim().length < 3}
                    className="mt-5 flex w-full items-center justify-center gap-2 rounded-2xl bg-veil-500 py-3.5 font-display font-semibold text-white shadow-glow transition active:scale-[0.98] disabled:opacity-50"
                  >
                    {busy ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Send className="h-4 w-4" />
                    )}
                    Send
                  </button>
                  <p className="mt-2 flex items-start gap-1.5 text-[11px] leading-relaxed text-white/40">
                    <ShieldAlert className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                    Please don't share passwords or other sensitive info here.
                  </p>
                </>
              )}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}

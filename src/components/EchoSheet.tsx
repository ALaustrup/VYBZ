import { useCallback, useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Info, LifeBuoy, Loader2, Send, Sparkles, X } from "lucide-react";
import { useApp } from "@/store/AppStore";
import { fetchEchoHistory, fetchEchoPublic, sendEchoMessage } from "@/lib/backend";
import type { CompanionMessage, EchoPublic } from "@/types";
import { cx } from "@/lib/utils";

/**
 * Echo chat — talk to a real member's opt-in AI Echo while they're away.
 *
 * Every surface here discloses that this is an AI representation, created and
 * switched on by the member themselves. Eligibility (Echo enabled, both adults,
 * not blocked) is enforced server-side; this sheet trusts echo_public + the
 * echo-chat function and degrades gracefully.
 */
export function EchoSheet() {
  const { echoOpen, echoOwnerId, closeEcho, openLifeline, showToast, isPremium, goPremium } =
    useApp();
  const [echo, setEcho] = useState<EchoPublic | null>(null);
  const [msgs, setMsgs] = useState<CompanionMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [draft, setDraft] = useState("");
  const [sending, setSending] = useState(false);
  const [handoff, setHandoff] = useState(false);
  const scrollRef = useRef<HTMLDivElement | null>(null);

  const scrollDown = useCallback((smooth = true) => {
    setTimeout(
      () => scrollRef.current?.scrollTo({ top: 1e9, behavior: smooth ? "smooth" : "auto" }),
      40
    );
  }, []);

  useEffect(() => {
    if (!echoOpen || !echoOwnerId) return;
    let alive = true;
    setLoading(true);
    setMsgs([]);
    setHandoff(false);
    Promise.all([fetchEchoPublic(echoOwnerId), fetchEchoHistory(echoOwnerId)]).then(
      ([pub, hist]) => {
        if (!alive) return;
        setEcho(pub);
        setMsgs(hist);
        setLoading(false);
        scrollDown(false);
      }
    );
    return () => {
      alive = false;
    };
  }, [echoOpen, echoOwnerId, scrollDown]);

  const name = echo?.displayName || "their Echo";

  async function send() {
    const text = draft.trim();
    if (!text || sending || !echoOwnerId) return;
    setDraft("");
    setHandoff(false);
    setMsgs((prev) => [...prev, { role: "user", content: text, t: Date.now() }]);
    setSending(true);
    scrollDown();

    const res = await sendEchoMessage(echoOwnerId, text);
    setSending(false);

    if (res.error) {
      showToast("Couldn't reach this Echo — try again.");
      return;
    }
    if (res.limited) {
      setMsgs((prev) => [
        ...prev,
        {
          role: "assistant",
          content: isPremium
            ? "Let's pick this up again soon."
            : "You've chatted a lot today! Echoes reset daily — or go unlimited with Godmode.",
          t: Date.now(),
        },
      ]);
      scrollDown();
      return;
    }
    if (res.reply) {
      setMsgs((prev) => [...prev, { role: "assistant", content: res.reply!, t: Date.now() }]);
      if (res.handoff === "lifeline") setHandoff(true);
      scrollDown();
    }
  }

  return (
    <AnimatePresence>
      {echoOpen && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={closeEcho}
            className="fixed inset-0 z-[64] bg-black/75 backdrop-blur-sm"
          />
          <motion.div
            initial={{ y: "100%" }}
            animate={{ y: 0 }}
            exit={{ y: "100%" }}
            transition={{ type: "spring", stiffness: 320, damping: 34 }}
            className="fixed inset-x-0 bottom-0 z-[64] mx-auto flex h-[88vh] max-w-md flex-col overflow-hidden rounded-t-3xl border-t border-white/10 bg-ink-900"
          >
            {/* Header. */}
            <div className="flex items-center gap-2.5 border-b border-white/8 px-4 py-3">
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-aqua-500/15 text-aqua-300">
                <Sparkles className="h-5 w-5" />
              </span>
              <div className="min-w-0">
                <h2 className="flex items-center gap-1.5 font-display text-base font-bold text-white">
                  <span className="truncate">{name}</span>
                  <span className="shrink-0 rounded bg-white/10 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wide text-white/55">
                    AI Echo
                  </span>
                </h2>
                <p className="truncate text-[11px] text-white/45">An AI of a real member, while they're away</p>
              </div>
              <button
                onClick={closeEcho}
                aria-label="Close"
                className="ml-auto flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-white/70 transition hover:bg-white/10 active:scale-90"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Disclosure banner. */}
            <div className="flex items-start gap-2 border-b border-white/5 bg-aqua-500/[0.06] px-4 py-2.5">
              <Info className="mt-0.5 h-3.5 w-3.5 shrink-0 text-aqua-300" />
              <p className="text-[11px] leading-relaxed text-white/55">
                This is an AI Echo {echo?.displayName ? `of ${echo.displayName}` : ""}, not the real
                person. It can't make plans or promises for them — message them directly for that.
              </p>
            </div>

            {/* Messages. */}
            <div ref={scrollRef} className="min-h-0 flex-1 overflow-y-auto px-4 py-4">
              {loading ? (
                <div className="flex h-40 items-center justify-center">
                  <Loader2 className="h-6 w-6 animate-spin text-aqua-300" />
                </div>
              ) : !echo ? (
                <div className="mx-auto mt-10 max-w-[80%] text-center text-sm text-white/55">
                  This member's Echo isn't available right now.
                </div>
              ) : (
                <div className="space-y-3">
                  {msgs.length === 0 && (
                    <div className="mx-auto mt-8 max-w-[80%] text-center text-sm text-white/60">
                      {echo.greeting || `Say hi to ${name}'s Echo.`}
                    </div>
                  )}
                  {msgs.map((m, i) => (
                    <Bubble key={i} msg={m} />
                  ))}
                  {sending && <TypingBubble />}
                  {handoff && (
                    <button
                      onClick={() => {
                        closeEcho();
                        openLifeline();
                      }}
                      className="flex w-full items-center justify-center gap-2 rounded-xl border border-emerald-400/30 bg-emerald-400/10 py-3 text-sm font-semibold text-emerald-200 transition active:scale-[0.98]"
                    >
                      <LifeBuoy className="h-4 w-4" /> Talk to a real person now
                    </button>
                  )}
                  {!isPremium && msgs.length > 0 && (
                    <button
                      onClick={() => {
                        closeEcho();
                        goPremium();
                      }}
                      className="block w-full pt-1 text-center text-[11px] text-white/35 transition hover:text-white/55"
                    >
                      Unlimited Echo chats with Godmode
                    </button>
                  )}
                </div>
              )}
            </div>

            {/* Composer. */}
            {echo && (
              <div className="border-t border-white/8 bg-ink-900/80 px-3 py-3 pb-[calc(env(safe-area-inset-bottom,0px)+0.75rem)]">
                <div className="flex items-end gap-2">
                  <textarea
                    value={draft}
                    onChange={(e) => setDraft(e.target.value.slice(0, 2000))}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && !e.shiftKey) {
                        e.preventDefault();
                        void send();
                      }
                    }}
                    rows={1}
                    placeholder={`Message ${name}'s Echo…`}
                    className="max-h-28 min-h-[44px] flex-1 resize-none rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-3 text-sm text-white placeholder:text-white/30 focus:border-aqua-400/60 focus:outline-none"
                  />
                  <button
                    onClick={() => void send()}
                    disabled={!draft.trim() || sending}
                    aria-label="Send"
                    className={cx(
                      "flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl transition active:scale-90",
                      draft.trim() && !sending
                        ? "bg-veil-500 text-white shadow-glow"
                        : "bg-white/10 text-white/40"
                    )}
                  >
                    {sending ? <Loader2 className="h-5 w-5 animate-spin" /> : <Send className="h-5 w-5" />}
                  </button>
                </div>
              </div>
            )}
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}

function Bubble({ msg }: { msg: CompanionMessage }) {
  const mine = msg.role === "user";
  return (
    <div className={cx("flex", mine ? "justify-end" : "justify-start")}>
      <div
        className={cx(
          "max-w-[82%] whitespace-pre-wrap rounded-2xl px-3.5 py-2.5 text-sm leading-relaxed",
          mine
            ? "rounded-br-md bg-veil-500 text-white"
            : "rounded-bl-md bg-aqua-500/15 text-white/90"
        )}
      >
        {msg.content}
      </div>
    </div>
  );
}

function TypingBubble() {
  return (
    <div className="flex justify-start">
      <div className="flex items-center gap-1 rounded-2xl rounded-bl-md bg-aqua-500/15 px-4 py-3">
        {[0, 1, 2].map((i) => (
          <motion.span
            key={i}
            className="h-1.5 w-1.5 rounded-full bg-white/60"
            animate={{ opacity: [0.3, 1, 0.3], y: [0, -2, 0] }}
            transition={{ duration: 1, repeat: Infinity, delay: i * 0.15 }}
          />
        ))}
      </div>
    </div>
  );
}

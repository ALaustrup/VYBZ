import { useCallback, useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { ChevronLeft, LifeBuoy, Loader2, Send, Sparkles, X } from "lucide-react";
import { useApp } from "@/store/AppStore";
import {
  fetchCompanionHistory,
  fetchCompanions,
  sendCompanionMessage,
} from "@/lib/backend";
import type { Companion, CompanionMessage } from "@/types";
import { cx, haptic } from "@/lib/utils";

/**
 * Never Alone — AI Companions.
 *
 * A guaranteed floor under the human community: a user can always open a warm,
 * clearly-labelled AI persona to talk to, so they're never staring at an empty
 * app. Personas are platform-owned (never impersonations of real people) and
 * every surface discloses them as AI. Safety (crisis handoff to Lifelines + 988)
 * is enforced server-side in the companion-chat Edge Function.
 */
export function CompanionSheet() {
  const { companionOpen, companionId, openCompanions, closeCompanions } = useApp();

  return (
    <AnimatePresence>
      {companionOpen && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={closeCompanions}
            className="fixed inset-0 z-[64] bg-black/75 backdrop-blur-sm"
          />
          <motion.div
            initial={{ y: "100%" }}
            animate={{ y: 0 }}
            exit={{ y: "100%" }}
            transition={{ type: "spring", stiffness: 320, damping: 34 }}
            className="fixed inset-x-0 bottom-0 z-[64] mx-auto flex h-[88vh] max-w-md flex-col overflow-hidden rounded-t-3xl border-t border-white/10 bg-ink-900"
          >
            {companionId ? (
              <CompanionChat
                companionId={companionId}
                onBack={() => openCompanions()}
                onClose={closeCompanions}
              />
            ) : (
              <CompanionPicker
                onPick={(id) => openCompanions(id)}
                onClose={closeCompanions}
              />
            )}
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}

// ── Picker ──────────────────────────────────────────────────────────────────

function CompanionPicker({
  onPick,
  onClose,
}: {
  onPick: (id: string) => void;
  onClose: () => void;
}) {
  const [list, setList] = useState<Companion[] | null>(null);

  useEffect(() => {
    let alive = true;
    fetchCompanions().then((c) => alive && setList(c));
    return () => {
      alive = false;
    };
  }, []);

  return (
    <>
      <SheetHeader onClose={onClose}>
        <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-veil-500/15 text-veil-200">
          <Sparkles className="h-5 w-5" />
        </div>
        <div className="min-w-0">
          <h2 className="font-display text-lg font-bold text-white">Companions</h2>
          <p className="truncate text-[11px] text-white/45">
            Always here — friendly AI to talk to anytime
          </p>
        </div>
      </SheetHeader>

      <div className="min-h-0 flex-1 overflow-y-auto px-4 pb-6">
        {list === null ? (
          <div className="flex h-40 items-center justify-center">
            <Loader2 className="h-6 w-6 animate-spin text-veil-300" />
          </div>
        ) : list.length === 0 ? (
          <div className="mt-10 px-6 text-center">
            <p className="text-sm text-white/60">
              Companions need an active account. Set up your profile to unlock
              someone to talk to anytime.
            </p>
          </div>
        ) : (
          <div className="space-y-2.5">
            <p className="px-1 pb-1 pt-1 text-[11px] leading-relaxed text-white/40">
              These are AI companions, not real people. They're here for
              company, a pep talk, or just to listen.
            </p>
            {list.map((c) => (
              <button
                key={c.id}
                onClick={() => {
                  haptic(10);
                  onPick(c.id);
                }}
                className="flex w-full items-center gap-3 rounded-2xl border border-white/8 bg-white/[0.03] p-3.5 text-left transition hover:bg-white/[0.06] active:scale-[0.98]"
              >
                <span
                  className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl text-2xl"
                  style={{ backgroundColor: `${c.accent}26` }}
                >
                  {c.emoji}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="flex items-center gap-1.5">
                    <span className="font-display text-base font-semibold text-white">
                      {c.name}
                    </span>
                    <span className="rounded bg-white/10 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wide text-white/55">
                      AI
                    </span>
                    {c.nsfw && (
                      <span className="rounded bg-wild/80 px-1.5 py-0.5 text-[9px] font-bold uppercase text-white">
                        18+
                      </span>
                    )}
                  </span>
                  <span className="mt-0.5 block truncate text-xs text-white/50">
                    {c.tagline}
                  </span>
                </span>
              </button>
            ))}
          </div>
        )}
      </div>
    </>
  );
}

// ── Chat ────────────────────────────────────────────────────────────────────

function CompanionChat({
  companionId,
  onBack,
  onClose,
}: {
  companionId: string;
  onBack: () => void;
  onClose: () => void;
}) {
  const { openLifeline, closeCompanions, showToast, isPremium, goPremium } = useApp();
  const [companion, setCompanion] = useState<Companion | null>(null);
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
    let alive = true;
    setLoading(true);
    Promise.all([fetchCompanions(), fetchCompanionHistory(companionId)]).then(
      ([list, hist]) => {
        if (!alive) return;
        setCompanion(list.find((c) => c.id === companionId) ?? null);
        setMsgs(hist);
        setLoading(false);
        scrollDown(false);
      }
    );
    return () => {
      alive = false;
    };
  }, [companionId, scrollDown]);

  async function send() {
    const text = draft.trim();
    if (!text || sending) return;
    setDraft("");
    setHandoff(false);
    const mine: CompanionMessage = { role: "user", content: text, t: Date.now() };
    setMsgs((prev) => [...prev, mine]);
    setSending(true);
    scrollDown();

    const res = await sendCompanionMessage(companionId, text);
    setSending(false);

    if (res.error) {
      showToast("Couldn't reach your companion — check your connection.");
      return;
    }
    if (res.limited) {
      setMsgs((prev) => [
        ...prev,
        {
          role: "assistant",
          content: isPremium
            ? "Let's pick this up again in a bit."
            : "We've chatted a lot today! Companions reset daily — or unlock unlimited chats with Godmode.",
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

  const accent = companion?.accent ?? "#6366f1";

  return (
    <>
      <SheetHeader onClose={onClose}>
        <button
          onClick={onBack}
          aria-label="Back to companions"
          className="-ml-1 flex h-9 w-9 items-center justify-center rounded-full text-white/70 transition hover:bg-white/10 active:scale-90"
        >
          <ChevronLeft className="h-5 w-5" />
        </button>
        <span
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl text-xl"
          style={{ backgroundColor: `${accent}26` }}
        >
          {companion?.emoji ?? "✨"}
        </span>
        <div className="min-w-0">
          <h2 className="flex items-center gap-1.5 font-display text-base font-bold text-white">
            {companion?.name ?? "Companion"}
            <span className="rounded bg-white/10 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wide text-white/55">
              AI
            </span>
          </h2>
          <p className="truncate text-[11px] text-white/45">{companion?.tagline}</p>
        </div>
      </SheetHeader>

      <div ref={scrollRef} className="min-h-0 flex-1 overflow-y-auto px-4 py-4">
        {loading ? (
          <div className="flex h-40 items-center justify-center">
            <Loader2 className="h-6 w-6 animate-spin text-veil-300" />
          </div>
        ) : (
          <div className="space-y-3">
            {msgs.length === 0 && (
              <div className="mx-auto mt-8 max-w-[80%] text-center">
                <span
                  className="mx-auto mb-3 flex h-16 w-16 items-center justify-center rounded-3xl text-3xl"
                  style={{ backgroundColor: `${accent}26` }}
                >
                  {companion?.emoji ?? "✨"}
                </span>
                <p className="text-sm text-white/60">
                  Say hi to {companion?.name ?? "your companion"}. They're here
                  whenever you want to talk.
                </p>
              </div>
            )}
            {msgs.map((m, i) => (
              <Bubble key={i} msg={m} accent={accent} />
            ))}
            {sending && <TypingBubble accent={accent} />}
            {handoff && (
              <button
                onClick={() => {
                  closeCompanions();
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
                  closeCompanions();
                  goPremium();
                }}
                className="block w-full pt-1 text-center text-[11px] text-white/35 transition hover:text-white/55"
              >
                Unlimited companion chats with Godmode
              </button>
            )}
          </div>
        )}
      </div>

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
            placeholder={`Message ${companion?.name ?? "your companion"}…`}
            className="max-h-28 min-h-[44px] flex-1 resize-none rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-3 text-sm text-white placeholder:text-white/30 focus:border-veil-400/60 focus:outline-none"
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
            {sending ? (
              <Loader2 className="h-5 w-5 animate-spin" />
            ) : (
              <Send className="h-5 w-5" />
            )}
          </button>
        </div>
      </div>
    </>
  );
}

function Bubble({ msg, accent }: { msg: CompanionMessage; accent: string }) {
  const mine = msg.role === "user";
  return (
    <div className={cx("flex", mine ? "justify-end" : "justify-start")}>
      <div
        className={cx(
          "max-w-[82%] whitespace-pre-wrap rounded-2xl px-3.5 py-2.5 text-sm leading-relaxed",
          mine ? "rounded-br-md bg-veil-500 text-white" : "rounded-bl-md text-white/90"
        )}
        style={mine ? undefined : { backgroundColor: `${accent}1f` }}
      >
        {msg.content}
      </div>
    </div>
  );
}

function TypingBubble({ accent }: { accent: string }) {
  return (
    <div className="flex justify-start">
      <div
        className="flex items-center gap-1 rounded-2xl rounded-bl-md px-4 py-3"
        style={{ backgroundColor: `${accent}1f` }}
      >
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

function SheetHeader({
  children,
  onClose,
}: {
  children: React.ReactNode;
  onClose: () => void;
}) {
  return (
    <div className="flex items-center gap-2.5 border-b border-white/8 px-4 py-3">
      {children}
      <button
        onClick={onClose}
        aria-label="Close"
        className="ml-auto flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-white/70 transition hover:bg-white/10 active:scale-90"
      >
        <X className="h-4 w-4" />
      </button>
    </div>
  );
}

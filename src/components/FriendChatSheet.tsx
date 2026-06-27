import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Send, X } from "lucide-react";
import { useApp } from "@/store/AppStore";
import * as backend from "@/lib/backend";
import { avatarGradient, cx } from "@/lib/utils";
import type { Message } from "@/types";

/** 1:1 direct chat with an accepted friend (not tied to any confession). */
export function FriendChatSheet() {
  const { friendChatPeer, closeFriendChat, profileId, backendEnabled, showToast } =
    useApp();
  const [messages, setMessages] = useState<Message[]>([]);
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  const peerId = friendChatPeer?.id ?? null;

  useEffect(() => {
    if (!peerId || !backendEnabled || !profileId) {
      setMessages([]);
      return;
    }
    let cancelled = false;
    void backend.fetchFriendThread(profileId, peerId).then((m) => {
      if (!cancelled) setMessages(m);
    });
    const unsub = backend.subscribeFriendThread(profileId, peerId, (m) =>
      setMessages((prev) => (prev.some((x) => x.id === m.id) ? prev : [...prev, m]))
    );
    return () => {
      cancelled = true;
      unsub();
    };
  }, [peerId, profileId, backendEnabled]);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight });
  }, [messages]);

  async function send() {
    const body = text.trim();
    if (!body || !peerId || !profileId || sending) return;
    setText("");
    setSending(true);
    const ok = await backend.sendFriendMessage(profileId, peerId, body);
    setSending(false);
    if (!ok) showToast("Couldn't send. You can only DM accepted friends.");
  }

  const g = avatarGradient(friendChatPeer?.alias ?? friendChatPeer?.id ?? "veiled");

  return (
    <AnimatePresence>
      {friendChatPeer && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={closeFriendChat}
            className="fixed inset-0 z-[58] bg-black/80 backdrop-blur-sm"
          />
          <motion.div
            initial={{ y: "100%" }}
            animate={{ y: 0 }}
            exit={{ y: "100%" }}
            transition={{ type: "spring", stiffness: 320, damping: 34 }}
            className="fixed inset-x-0 bottom-0 z-[58] mx-auto flex h-[82%] max-w-md flex-col rounded-t-3xl border-t border-white/10 bg-ink-900"
          >
            <div className="mx-auto mt-3 h-1.5 w-12 rounded-full bg-white/20" />

            <div className="flex items-center gap-3 px-5 py-3">
              <div
                className="flex h-9 w-9 items-center justify-center rounded-full font-display text-sm font-bold text-white/90"
                style={{
                  background: `linear-gradient(150deg, ${g[0]}, ${g[1]})`,
                }}
              >
                {(friendChatPeer.alias || "?").charAt(0).toUpperCase()}
              </div>
              <div className="min-w-0 flex-1">
                <span className="truncate font-display text-lg font-semibold text-white">
                  {friendChatPeer.alias}
                </span>
                <p className="text-[11px] text-feel">Friend · direct chat</p>
              </div>
              <button
                onClick={closeFriendChat}
                aria-label="Close"
                className="flex h-9 w-9 items-center justify-center rounded-full glass active:scale-90"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div
              ref={scrollRef}
              className="no-scrollbar flex-1 space-y-2 overflow-y-auto px-4 pb-2"
            >
              {!backendEnabled && (
                <p className="mt-10 text-center text-sm text-white/35">
                  Direct chat needs the backend enabled.
                </p>
              )}
              {backendEnabled && messages.length === 0 && (
                <p className="mt-10 text-center text-sm text-white/35">
                  Say hi 👋
                </p>
              )}
              {messages.map((m) => (
                <div
                  key={m.id}
                  className={cx("flex", m.from === "me" ? "justify-end" : "justify-start")}
                >
                  <div
                    className={cx(
                      "max-w-[78%] rounded-2xl px-3.5 py-2 text-[15px] leading-snug",
                      m.from === "me"
                        ? "bg-veil-500 text-white"
                        : "bg-white/[0.06] text-white/90"
                    )}
                  >
                    {m.text}
                  </div>
                </div>
              ))}
            </div>

            <div className="flex items-center gap-2 px-4 pb-[max(0.75rem,env(safe-area-inset-bottom))] pt-1">
              <input
                value={text}
                onChange={(e) => setText(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") send();
                }}
                placeholder="Message…"
                disabled={!backendEnabled}
                className="h-11 flex-1 rounded-full border border-white/10 bg-white/[0.04] px-4 text-[15px] text-white placeholder:text-white/30 focus:border-veil-400/60 focus:outline-none disabled:opacity-50"
              />
              <button
                onClick={send}
                disabled={!text.trim() || sending || !backendEnabled}
                aria-label="Send"
                className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-veil-500 text-white shadow-glow transition active:scale-90 disabled:opacity-40 disabled:shadow-none"
              >
                <Send className="h-5 w-5" />
              </button>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}

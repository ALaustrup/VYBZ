import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Inbox, X } from "lucide-react";
import { useApp } from "@/store/AppStore";
import { fetchInbox, type Conversation } from "@/lib/backend";
import { timeAgo } from "@/lib/utils";

/**
 * The author inbox: every 1:1 conversation you're part of, newest first.
 * Tapping one opens that specific thread (confession + peer).
 */
export function InboxSheet() {
  const { inboxOpen, closeInbox, profileId, openConnection } = useApp();
  const [items, setItems] = useState<Conversation[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!inboxOpen || !profileId) return;
    setLoading(true);
    let active = true;
    fetchInbox(profileId).then((list) => {
      if (active) {
        setItems(list);
        setLoading(false);
      }
    });
    return () => {
      active = false;
    };
  }, [inboxOpen, profileId]);

  return (
    <AnimatePresence>
      {inboxOpen && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={closeInbox}
            className="fixed inset-0 z-[56] bg-black/75 backdrop-blur-sm"
          />
          <motion.div
            initial={{ y: "100%" }}
            animate={{ y: 0 }}
            exit={{ y: "100%" }}
            transition={{ type: "spring", stiffness: 320, damping: 34 }}
            className="fixed inset-x-0 bottom-0 z-[56] mx-auto flex h-[80%] max-w-md flex-col rounded-t-3xl border-t border-white/10 bg-ink-900"
          >
            <div className="mx-auto mt-3 h-1.5 w-12 rounded-full bg-white/20" />
            <div className="flex items-center justify-between px-5 py-3">
              <h2 className="flex items-center gap-2 font-display text-xl font-bold text-white">
                <Inbox className="h-5 w-5 text-veil-200" />
                Inbox
              </h2>
              <button
                onClick={closeInbox}
                aria-label="Close"
                className="flex h-9 w-9 items-center justify-center rounded-full glass active:scale-90"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="no-scrollbar flex-1 space-y-2 overflow-y-auto px-4 pb-6">
              {loading ? (
                <p className="pt-10 text-center text-sm text-white/40">Loading…</p>
              ) : items.length === 0 ? (
                <div className="flex flex-col items-center gap-2 pt-16 text-center">
                  <Inbox className="h-7 w-7 text-white/30" />
                  <p className="px-10 text-sm text-white/45">
                    No conversations yet. When someone messages you about a
                    confession, it appears here.
                  </p>
                </div>
              ) : (
                items.map((c) => (
                  <button
                    key={`${c.confessionId}:${c.peerId}`}
                    onClick={() => {
                      openConnection(c.confessionId, "message", c.peerId);
                      closeInbox();
                    }}
                    className="flex w-full items-center gap-3 rounded-2xl border border-white/8 bg-white/[0.03] p-3 text-left transition active:scale-[0.99]"
                  >
                    <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-veil-500/20 font-display font-bold text-veil-100">
                      {(c.peerAlias || "?").charAt(0).toUpperCase()}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between gap-2">
                        <span className="truncate font-display text-sm font-semibold text-white">
                          {c.peerAlias}
                        </span>
                        <span className="shrink-0 text-[11px] text-white/35">
                          {timeAgo(c.lastAt)}
                        </span>
                      </div>
                      <p className="truncate text-sm text-white/65">
                        {c.fromMe ? "You: " : ""}
                        {c.lastMessage}
                      </p>
                      {c.snippet && (
                        <p className="truncate text-[11px] italic text-white/35">
                          on “{c.snippet}”
                        </p>
                      )}
                    </div>
                  </button>
                ))
              )}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}

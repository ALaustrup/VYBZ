import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { AnimatePresence, motion } from "framer-motion";
import {
  BellRing,
  Eye,
  Heart,
  MessageCircle,
  MessagesSquare,
  Sparkles,
  TrendingUp,
  UserPlus,
  X,
  type LucideIcon,
} from "lucide-react";
import { useApp } from "@/store/AppStore";
import type { NotificationKind } from "@/types";
import { haptic } from "@/lib/utils";

const KIND_ICON: Record<NotificationKind, LucideIcon> = {
  vote: Heart,
  featured: Sparkles,
  milestone: TrendingUp,
  reveal: Eye,
  comment: MessagesSquare,
  message: MessageCircle,
  friend: UserPlus,
  name: BellRing,
};

const KIND_COLOR: Record<NotificationKind, string> = {
  vote: "#34f5a0",
  featured: "#c77dff",
  milestone: "#ffd166",
  reveal: "#5b8cff",
  comment: "#a87cf8",
  message: "#34f5a0",
  friend: "#ff5d8f",
  name: "#ffd166",
};

/**
 * In-app activity popup — a glass banner that slides down from the top whenever
 * someone interacts with your posts (or sends a request). Tap to jump to it;
 * auto-dismisses. Users can turn these off in Settings (notifyActivity).
 */
export function NotificationPopup() {
  const {
    activityPopup: n,
    dismissActivityPopup,
    openConnection,
    openPost,
    openFriendChat,
  } = useApp();
  const navigate = useNavigate();

  useEffect(() => {
    if (!n) return;
    haptic(8);
    const t = setTimeout(dismissActivityPopup, 5000);
    return () => clearTimeout(t);
  }, [n, dismissActivityPopup]);

  function open() {
    if (!n) return;
    dismissActivityPopup();
    if (n.kind === "message" && n.peerId) {
      openFriendChat({
        id: n.peerId,
        alias: n.peerAlias ?? "Friend",
        aura: n.peerAura ?? "veil",
      });
      return;
    }
    if (n.confessionId && (n.kind === "message" || n.kind === "comment")) {
      openConnection(n.confessionId, n.kind === "message" ? "message" : "comments");
      return;
    }
    if (n.confessionId) {
      openPost(n.confessionId);
      return;
    }
    navigate("/profile");
  }

  const Icon = n ? KIND_ICON[n.kind] : Heart;
  const color = n ? KIND_COLOR[n.kind] : "#a87cf8";

  return (
    <AnimatePresence>
      {n && (
        <motion.div
          key={n.id}
          initial={{ y: -90, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: -90, opacity: 0 }}
          transition={{ type: "spring", stiffness: 380, damping: 32 }}
          className="fixed inset-x-0 top-0 z-[80] mx-auto mt-[max(0.6rem,env(safe-area-inset-top))] flex max-w-md items-center gap-3 rounded-2xl border border-white/12 bg-ink-900/85 px-3.5 py-3 shadow-card backdrop-blur-xl"
          style={{ left: 12, right: 12 }}
        >
          <button onClick={open} className="flex min-w-0 flex-1 items-center gap-3 text-left">
            <span
              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl"
              style={{ backgroundColor: `${color}22` }}
            >
              <Icon className="h-5 w-5" style={{ color }} />
            </span>
            <span className="min-w-0 flex-1">
              <span className="block truncate font-display text-sm font-semibold text-white">
                {n.title}
              </span>
              <span className="block truncate text-xs text-white/60">{n.body}</span>
            </span>
          </button>
          <button
            onClick={dismissActivityPopup}
            aria-label="Dismiss"
            className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-white/40 active:scale-90"
          >
            <X className="h-4 w-4" />
          </button>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

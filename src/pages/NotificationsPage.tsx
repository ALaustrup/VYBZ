import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import {
  Bell,
  BellRing,
  ChevronRight,
  Eye,
  Heart,
  MessageCircle,
  MessagesSquare,
  Sparkles,
  TrendingUp,
  UserPlus,
  type LucideIcon,
} from "lucide-react";
import { useApp } from "@/store/AppStore";
import { cx, timeAgo } from "@/lib/utils";
import type { AppNotification, NotificationKind } from "@/types";

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

export function NotificationsPage() {
  const { notifications, markAllRead, openConnection, openPost, openFriendChat } =
    useApp();
  const navigate = useNavigate();

  // Mark everything read shortly after the user lands here.
  useEffect(() => {
    const t = setTimeout(markAllRead, 900);
    return () => clearTimeout(t);
  }, [markAllRead]);

  // Route a tapped notification to whatever it's about.
  function handleOpen(n: AppNotification) {
    if (n.kind === "message" && n.peerId) {
      // Friend DM → open the 1:1 direct chat.
      openFriendChat({
        id: n.peerId,
        alias: n.peerAlias ?? "Friend",
        aura: n.peerAura ?? "veil",
      });
      return;
    }
    if (n.confessionId && (n.kind === "message" || n.kind === "comment")) {
      // Private message / comment → open the conversation overlay.
      openConnection(n.confessionId, n.kind === "message" ? "message" : "comments");
      return;
    }
    // Any other confession-linked activity (vote, featured, milestone, reveal)
    // opens that post.
    if (n.confessionId) {
      openPost(n.confessionId);
      return;
    }
    // Everything else (e.g. friend) is about you.
    navigate("/profile");
  }

  return (
    <div className="no-scrollbar h-full overflow-y-auto px-4 pb-6">
      <p className="px-1 pb-4 text-sm text-white/50">
        Every ripple your secrets make — in real time.
      </p>

      {notifications.length === 0 ? (
        <div className="flex flex-col items-center justify-center pt-24 text-center">
          <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full glass">
            <Bell className="h-7 w-7 text-white/40" />
          </div>
          <p className="text-sm text-white/50">No activity yet. Go confess.</p>
        </div>
      ) : (
        <div className="space-y-2.5">
          {notifications.map((n, i) => {
            const Icon = KIND_ICON[n.kind];
            const color = KIND_COLOR[n.kind];
            return (
              <motion.button
                key={n.id}
                layout
                onClick={() => handleOpen(n)}
                whileTap={{ scale: 0.98 }}
                initial={{ opacity: 0, x: -16 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: Math.min(i * 0.03, 0.3) }}
                className={cx(
                  "flex w-full items-start gap-3 rounded-2xl border p-3.5 text-left transition",
                  n.read
                    ? "border-white/8 bg-white/[0.02] hover:bg-white/[0.04]"
                    : "border-veil-500/30 bg-veil-500/[0.07] hover:bg-veil-500/[0.1]"
                )}
              >
                <div
                  className="mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-xl"
                  style={{ backgroundColor: `${color}22` }}
                >
                  <Icon className="h-5 w-5" style={{ color }} />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between gap-2">
                    <p className="font-display text-sm font-semibold text-white">
                      {n.title}
                    </p>
                    <span className="shrink-0 text-[11px] text-white/35">
                      {timeAgo(n.createdAt)}
                    </span>
                  </div>
                  <p className="mt-0.5 text-sm leading-snug text-white/65">
                    {n.body}
                  </p>
                </div>
                <div className="mt-1 flex shrink-0 items-center gap-1.5">
                  {!n.read && (
                    <span className="h-2 w-2 rounded-full bg-veil-400 shadow-glow" />
                  )}
                  <ChevronRight className="h-4 w-4 text-white/30" />
                </div>
              </motion.button>
            );
          })}
        </div>
      )}
    </div>
  );
}

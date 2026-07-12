import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Bell, Briefcase, Loader2, MessageCircle, UserPlus } from "lucide-react";
import * as api from "@/lib/api";
import { EmptyState } from "@/components/EmptyState";
import { useSession } from "@/store/session";
import { cx, timeAgo } from "@/lib/utils";
import type { AppNotification } from "@/types";

const ICON = { connection: UserPlus, application: Briefcase, message: MessageCircle, match: Bell };

export function NotificationsPage() {
  const navigate = useNavigate();
  const { markNotificationsRead } = useSession();
  const [items, setItems] = useState<AppNotification[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.listNotifications().then((n) => { setItems(n); setLoading(false); });
    void markNotificationsRead();
  }, [markNotificationsRead]);

  function open(n: AppNotification) {
    if (n.kind === "message" && n.refId) navigate(`/messages/${n.refId}`);
    else if (n.kind === "connection" && n.actorId) navigate(`/u/${n.actorId}`);
    else if (n.kind === "application") navigate("/opportunities");
  }

  return (
    <div className="flex h-full flex-col">
      <div className="px-4 pb-1 pt-3"><h1 className="font-display text-xl font-bold text-gradient">Activity</h1></div>
      <div className="no-scrollbar flex-1 overflow-y-auto px-4 pb-6 pt-2">
        {loading ? <div className="flex justify-center py-16"><Loader2 className="h-6 w-6 animate-spin text-veil-300" /></div>
          : items.length === 0 ? <EmptyState icon={Bell} title="Nothing yet" body="Connection requests, applications, and messages will show up here." />
          : <div className="space-y-1.5">{items.map((n) => {
              const Icon = ICON[n.kind] ?? Bell;
              return (
                <button key={n.id} onClick={() => open(n)} className={cx("flex w-full items-center gap-3 rounded-2xl border p-3 text-left transition active:scale-[0.99]", n.read ? "border-white/8 bg-white/[0.02]" : "border-veil-400/25 bg-veil-500/[0.06]")}>
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-veil-500/20 text-veil-100"><Icon className="h-4 w-4" /></span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold text-white">{n.title}</p>
                    {n.body && <p className="truncate text-xs text-white/50">{n.body}</p>}
                  </div>
                  <span className="shrink-0 text-[11px] text-white/35">{timeAgo(n.createdAt)}</span>
                </button>
              );
            })}</div>}
      </div>
    </div>
  );
}

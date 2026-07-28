import { useCallback, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Bell, Briefcase, Check, Heart, Loader2, MessageCircle, Sparkles, UserPlus, X, Radio,
} from "lucide-react";
import * as api from "@/lib/api";
import { EmptyState } from "@/components/EmptyState";
import { useMessagePopout } from "@/lib/messagePopout";
import { useSession } from "@/store/session";
import { cx, timeAgo } from "@/lib/utils";
import type { AppNotification, NotificationKind } from "@/types";
import { isMustAckNotification } from "@/components/home/WallAlerts";

const ICON: Partial<Record<NotificationKind, typeof Bell>> = {
  connection: UserPlus,
  application: Briefcase,
  message: MessageCircle,
  match: Sparkles,
  reaction: Heart,
  vibe: Sparkles,
  live: Radio,
  staff: Bell,
  follow: UserPlus,
  system: Bell,
};

export function ProfileLiveFeed({ excludeMustAck = false }: { excludeMustAck?: boolean }) {
  const navigate = useNavigate();
  const { openThread } = useMessagePopout();
  const { userId, markNotificationsRead, showToast, refreshUnread } = useSession();
  const [items, setItems] = useState<AppNotification[]>([]);
  const [loading, setLoading] = useState(true);
  const [acting, setActing] = useState<string | null>(null);

  const load = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    const all = await api.listLiveFeed(60);
    setItems(excludeMustAck ? all.filter((n) => !isMustAckNotification(n) || n.read) : all);
    setLoading(false);
  }, [excludeMustAck]);

  useEffect(() => {
    void load();
    void markNotificationsRead().then(() => refreshUnread());
    const filter = userId ? `user_id=eq.${userId}` : undefined;
    const ch = api.subscribeInserts("notifications", filter, () => void load(true));
    return () => api.unsubscribe(ch);
  }, [load, markNotificationsRead, refreshUnread, userId]);

  function open(n: AppNotification) {
    const action = String(n.payload?.action ?? "");
    const href = typeof n.payload?.href === "string" ? n.payload.href : null;
    if (href) {
      navigate(href);
      return;
    }
    if ((n.kind === "message" || action === "open_dm") && n.refId) {
      openThread(n.refId);
      return;
    }
    if ((n.kind === "connection" || n.kind === "follow") && n.actorId) navigate(`/u/${n.actorId}`);
    else if (n.kind === "application") navigate("/opportunities");
    else if (n.kind === "reaction") navigate("/");
    else if (n.kind === "match" || n.kind === "vibe") navigate("/spark");
    else if (n.kind === "live") navigate(n.refId ? `/live/${n.refId}` : "/live");
    else if (n.kind === "staff") navigate("/mod");
    else if (n.actorId) navigate(`/u/${n.actorId}`);
  }

  async function respond(n: AppNotification, accept: boolean) {
    if (!n.actorId || acting) return;
    setActing(n.id);
    const ok = await api.respondConnection(n.actorId, accept);
    setActing(null);
    if (!ok) { showToast("Couldn't update that request"); return; }
    showToast(accept ? "Connected" : "Request declined");
    await api.markNotificationRead(n.id);
    setItems((prev) => prev.filter((x) => x.id !== n.id));
    void refreshUnread();
  }

  const isIncomingRequest = (n: AppNotification) =>
    n.kind === "connection" && !!n.actorId && /wants to connect/i.test(n.title);

  if (loading) {
    return <div className="flex justify-center py-16"><Loader2 className="h-6 w-6 animate-spin text-veil-300" /></div>;
  }
  if (items.length === 0) {
    return (
      <EmptyState
        icon={Bell}
        title="Your live feed is quiet"
        body="Messages, connections, reactions, and matches that involve you appear here in realtime."
      />
    );
  }

  return (
    <div className="divide-y divide-[var(--hairline)]" role="feed" aria-label="Live feed">
      {items.map((n) => {
        const Icon = ICON[n.kind] ?? Bell;
        const incoming = isIncomingRequest(n);
        return (
          <div
            key={n.id}
            className={cx(
              "flex w-full items-center gap-3 py-3.5 text-left transition",
              !n.read && "bg-veil-500/[0.06]",
            )}
          >
            <button
              type="button"
              onClick={() => open(n)}
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-white/[0.04] text-white/70 ring-1 ring-white/10 active:scale-95"
            >
              <Icon className="h-4 w-4" />
            </button>
            <button type="button" onClick={() => open(n)} className="min-w-0 flex-1 text-left">
              <p className="truncate text-sm font-semibold text-white">{n.title}</p>
              {n.body && <p className="truncate text-xs text-white/50">{n.body}</p>}
              {n.kind === "message" && (
                <p className="mt-0.5 text-[11px] font-medium text-veil-200/80">Tap to reply in pop-out</p>
              )}
            </button>
            {incoming ? (
              <div className="flex shrink-0 items-center gap-1.5">
                <button type="button" disabled={acting === n.id} onClick={() => void respond(n, true)}
                  aria-label="Accept" className="flex h-8 w-8 items-center justify-center rounded-full bg-feel/25 text-feel ring-1 ring-feel/40 active:scale-90 disabled:opacity-50">
                  {acting === n.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Check className="h-4 w-4" />}
                </button>
                <button type="button" disabled={acting === n.id} onClick={() => void respond(n, false)}
                  aria-label="Decline" className="flex h-8 w-8 items-center justify-center rounded-full bg-white/8 text-white/55 ring-1 ring-white/10 active:scale-90 disabled:opacity-50">
                  <X className="h-4 w-4" />
                </button>
              </div>
            ) : (
              <span className="shrink-0 text-[11px] text-white/35">{timeAgo(n.createdAt)}</span>
            )}
          </div>
        );
      })}
    </div>
  );
}

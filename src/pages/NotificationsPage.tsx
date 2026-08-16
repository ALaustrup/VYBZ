import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Bell, Briefcase, Check, Loader2, MessageCircle, UserPlus, X } from "lucide-react";
import * as api from "@/lib/api";
import { EmptyState } from "@/components/EmptyState";
import { useSession } from "@/store/session";
import { cx, timeAgo } from "@/lib/utils";
import type { AppNotification } from "@/types";

const ICON: Record<string, typeof Bell> = {
  connection: UserPlus,
  application: Briefcase,
  message: MessageCircle,
  match: Bell,
};

export function NotificationsPage() {
  const navigate = useNavigate();
  const { markNotificationsRead, showToast } = useSession();
  const [items, setItems] = useState<AppNotification[]>([]);
  const [loading, setLoading] = useState(true);
  const [acting, setActing] = useState<string | null>(null);

  useEffect(() => {
    api.listNotifications().then((n) => { setItems(n); setLoading(false); });
    void markNotificationsRead();
  }, [markNotificationsRead]);

  function open(n: AppNotification) {
    if (n.kind === "message" && n.refId) navigate(`/messages/${n.refId}`);
    else if (n.kind === "connection" && n.actorId) navigate(`/u/${n.actorId}`);
    else if (n.kind === "application") navigate("/opportunities");
  }

  async function respond(n: AppNotification, accept: boolean) {
    if (!n.actorId || acting) return;
    setActing(n.id);
    const ok = await api.respondConnection(n.actorId, accept);
    setActing(null);
    if (!ok) {
      showToast("Couldn't update that request");
      return;
    }
    showToast(accept ? "Connected" : "Request declined");
    setItems((prev) => prev.map((x) =>
      x.id === n.id
        ? { ...x, title: accept ? "You're connected" : "Request declined", body: n.title, read: true }
        : x,
    ));
  }

  const isIncomingRequest = (n: AppNotification) =>
    n.kind === "connection" && !!n.actorId && /wants to connect/i.test(n.title);

  return (
    <div className="flex h-full flex-col">
      <div className="no-scrollbar flex-1 overflow-y-auto px-1 pb-6 pt-2">
        {loading ? <div className="flex justify-center py-16"><Loader2 className="h-6 w-6 animate-spin text-veil-300" /></div>
          : items.length === 0 ? <EmptyState icon={Bell} title="Nothing yet" body="Requests and messages show up here." />
          : <div className="divide-y divide-[var(--hairline)]">{items.map((n) => {
              const Icon = ICON[n.kind] ?? Bell;
              const incoming = isIncomingRequest(n);
              return (
                <div key={n.id} className={cx("flex w-full items-center gap-3 py-3.5 text-left transition", !n.read && "bg-veil-500/[0.04]")}>
                  <button type="button" onClick={() => open(n)} className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-white/[0.04] text-white/70 ring-1 ring-white/10 active:scale-95">
                    <Icon className="h-4 w-4" />
                  </button>
                  <button type="button" onClick={() => open(n)} className="min-w-0 flex-1 text-left">
                    <p className="truncate text-sm font-semibold text-white">{n.title}</p>
                    {n.body && <p className="truncate text-xs text-white/50">{n.body}</p>}
                  </button>
                  {incoming ? (
                    <div className="flex shrink-0 items-center gap-1.5">
                      <button
                        type="button"
                        disabled={acting === n.id}
                        onClick={() => void respond(n, true)}
                        aria-label="Accept connection"
                        className="flex h-8 w-8 items-center justify-center rounded-full bg-feel/25 text-feel ring-1 ring-feel/40 active:scale-90 disabled:opacity-50"
                      >
                        {acting === n.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Check className="h-4 w-4" />}
                      </button>
                      <button
                        type="button"
                        disabled={acting === n.id}
                        onClick={() => void respond(n, false)}
                        aria-label="Decline connection"
                        className="flex h-8 w-8 items-center justify-center rounded-full bg-white/8 text-white/55 ring-1 ring-white/10 active:scale-90 disabled:opacity-50"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    </div>
                  ) : (
                    <span className="shrink-0 text-[11px] text-white/35">{timeAgo(n.createdAt)}</span>
                  )}
                </div>
              );
            })}</div>}
      </div>
    </div>
  );
}

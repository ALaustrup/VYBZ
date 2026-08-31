import { useCallback, useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Bell, Loader2, Radio } from "lucide-react";
import * as api from "@/lib/api";
import { useSession } from "@/store/session";
import { cx, timeAgo } from "@/lib/utils";
import { filterAlertsNotifications } from "@/lib/notificationRouting";
import type { AppNotification } from "@/types";

/**
 * Recent activity on the signed-in landing. Does not mark the inbox read —
 * opening /notifications still does that. Unknown counts stay unread from session.
 */
export function HubActivity() {
  const navigate = useNavigate();
  const { unread } = useSession();
  const [items, setItems] = useState<AppNotification[] | null>(null);

  const load = useCallback(async () => {
    const list = await api.listNotifications().catch(() => [] as AppNotification[]);
    setItems(filterAlertsNotifications(list).slice(0, 5));
  }, []);

  useEffect(() => {
    void load();
    const ch = api.subscribeInserts("notifications", undefined, () => void load());
    return () => api.unsubscribe(ch);
  }, [load]);

  return (
    <section data-testid="hub-activity">
      <div className="mb-2 flex items-end justify-between gap-3 px-0.5">
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-white/35">
            Activity
          </p>
          <h2 className="font-display text-lg font-semibold text-white">Happening</h2>
        </div>
        <Link
          to="/notifications"
          className="text-[12px] text-white/45 transition hover:text-white/80"
        >
          {unread > 0 ? `${unread > 99 ? "99+" : unread} unread` : "See all"}
        </Link>
      </div>

      {items === null ? (
        <div className="flex justify-center py-8">
          <Loader2 className="h-5 w-5 animate-spin text-white/35" />
        </div>
      ) : items.length === 0 ? (
        <div className="forge-glass relative flex items-center gap-3 !rounded-xl !py-4 px-4">
          <span className="forge-glass-edge pointer-events-none" aria-hidden />
          <Bell className="relative z-[1] h-4 w-4 shrink-0 text-white/35" />
          <p className="relative z-[1] text-sm text-white/50">Quiet for now. Live moments land here.</p>
        </div>
      ) : (
        <ul className="divide-y divide-white/[0.05] overflow-hidden rounded-2xl border border-white/8 bg-white/[0.03]">
          {items.map((n) => (
            <li key={n.id}>
              <button
                type="button"
                onClick={() => {
                  if (n.kind === "live") navigate(n.refId ? `/live/${n.refId}` : "/live");
                  else if (n.actorId) navigate(`/u/${n.actorId}`);
                  else navigate("/notifications");
                }}
                className={cx(
                  "flex w-full items-start gap-3 px-3.5 py-3 text-left transition hover:bg-white/[0.04]",
                  !n.read && "bg-[rgb(var(--neon-cyan)/0.05)]",
                )}
              >
                <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-white/10 bg-black/30 text-cyan-100/80">
                  {n.kind === "live" ? <Radio className="h-3.5 w-3.5" /> : <Bell className="h-3.5 w-3.5" />}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-medium text-white">{n.title}</span>
                  {n.body ? (
                    <span className="mt-0.5 block truncate text-[12px] text-white/45">{n.body}</span>
                  ) : null}
                </span>
                <span className="shrink-0 pt-0.5 text-[11px] text-white/35">{timeAgo(n.createdAt)}</span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

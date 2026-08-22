import { useCallback, useEffect, useRef, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { AnimatePresence, motion } from "framer-motion";
import { Bell, Loader2 } from "lucide-react";
import * as api from "@/lib/api";
import { useSession } from "@/store/session";
import { useReduceFx } from "@/lib/display";
import { cx, timeAgo } from "@/lib/utils";
import type { AppNotification } from "@/types";

/**
 * Lightweight alerts pip. Reports what happened; does not manufacture urgency.
 * `/notifications` stays the full destination.
 */
export function AlertsMenu() {
  const { unread } = useSession();
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const reduce = useReduceFx();
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState<AppNotification[] | null>(null);
  const ref = useRef<HTMLDivElement>(null);

  const load = useCallback(async () => {
    const list = await api.listNotifications().catch(() => [] as AppNotification[]);
    setItems(list.slice(0, 6));
  }, []);

  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  useEffect(() => {
    if (!open) return;
    void load();
    const ch = api.subscribeInserts("notifications", undefined, () => void load());
    return () => api.unsubscribe(ch);
  }, [open, load]);

  useEffect(() => {
    if (!open) return;
    const onDoc = (e: MouseEvent) => {
      if (!ref.current?.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", onDoc);
    window.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDoc);
      window.removeEventListener("keydown", onKey);
    };
  }, [open]);

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-label={unread > 0 ? `Alerts, ${unread} unread` : "Alerts"}
        aria-expanded={open}
        aria-haspopup="dialog"
        data-testid="alerts-menu-button"
        data-tip="Alerts"
        className={cx(
          "forge-chip relative flex h-10 w-10 active:scale-90",
          open && "forge-chip--active",
        )}
      >
        <Bell className="h-5 w-5" strokeWidth={1.75} aria-hidden />
        {unread > 0 ? (
          <span className="absolute -right-0.5 -top-0.5 min-w-[1rem] rounded-full bg-[rgb(var(--app-accent-rgb))] px-1 text-center text-[9px] font-bold tabular-nums leading-4 text-black">
            {unread > 99 ? "99+" : unread}
          </span>
        ) : null}
      </button>

      <AnimatePresence>
        {open ? (
          <motion.div
            role="dialog"
            aria-label="Alerts"
            data-testid="alerts-menu"
            initial={reduce ? { opacity: 0 } : { opacity: 0, y: -6, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={reduce ? { opacity: 0 } : { opacity: 0, y: -4, scale: 0.98 }}
            transition={{ type: "spring", stiffness: 420, damping: 28 }}
            className="forge-glass absolute right-0 top-[calc(100%+0.45rem)] z-[80] w-[min(18.5rem,calc(100vw-1.5rem))] overflow-hidden p-2 shadow-suite-lg"
          >
            <span className="forge-glass-edge pointer-events-none" aria-hidden />
            <div className="relative z-[1] mb-1.5 flex items-center justify-between px-1.5 pt-1">
              <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-white/40">
                Alerts
              </p>
              <button
                type="button"
                onClick={() => {
                  setOpen(false);
                  navigate("/notifications");
                }}
                className="text-[11px] text-white/45 transition hover:text-white/80"
              >
                All
              </button>
            </div>
            {items === null ? (
              <div className="flex justify-center py-8">
                <Loader2 className="h-4 w-4 animate-spin text-white/35" />
              </div>
            ) : items.length === 0 ? (
              <p className="px-2 py-6 text-center text-[12px] text-white/40">Quiet for now.</p>
            ) : (
              <ul className="relative z-[1] max-h-[18rem] overflow-y-auto">
                {items.map((n) => (
                  <li key={n.id}>
                    <button
                      type="button"
                      onClick={() => {
                        setOpen(false);
                        if (n.kind === "live") navigate(n.refId ? `/live/${n.refId}` : "/live");
                        else if (n.kind === "message" && n.refId) navigate(`/messages/${n.refId}`);
                        else if (n.actorId) navigate(`/u/${n.actorId}`);
                        else navigate("/notifications");
                      }}
                      className={cx(
                        "flex w-full items-start gap-2 rounded-xl px-2 py-2 text-left transition hover:bg-white/[0.05]",
                        !n.read && "bg-[rgb(var(--neon-cyan)/0.05)]",
                      )}
                    >
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-[12px] font-medium text-white">{n.title}</span>
                        {n.body ? (
                          <span className="mt-0.5 block truncate text-[11px] text-white/40">{n.body}</span>
                        ) : null}
                      </span>
                      <span className="shrink-0 pt-0.5 text-[10px] text-white/30">{timeAgo(n.createdAt)}</span>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </motion.div>
        ) : null}
      </AnimatePresence>
    </div>
  );
}

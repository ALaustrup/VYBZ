import { useCallback, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { AnimatePresence, motion } from "framer-motion";
import { Bell, Loader2 } from "lucide-react";
import { Avatar } from "@/components/Avatar";
import { OverlayPortal } from "@/lib/overlayPortal";
import * as api from "@/lib/api";
import { useSession } from "@/store/session";
import { useReduceFx } from "@/lib/display";
import { CosmeticAvatarShell, Flair, useResolvedCosmetics } from "@/lib/cosmetics";
import { cx, timeAgo } from "@/lib/utils";
import type { AppNotification } from "@/types";

/**
 * Rail head — who you are and what needs you. Replaces the old product labels.
 */
export function RailIdentity() {
  const { profile, unread } = useSession();
  const navigate = useNavigate();
  const reduce = useReduceFx();
  const cosmetics = useResolvedCosmetics(profile?.equippedCosmetics);
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState<AppNotification[] | null>(null);

  const load = useCallback(async () => {
    const list = await api.listNotifications().catch(() => [] as AppNotification[]);
    setItems(list.slice(0, 6));
  }, []);

  useEffect(() => {
    if (!open) return;
    void load();
    const ch = api.subscribeInserts("notifications", undefined, () => void load());
    return () => api.unsubscribe(ch);
  }, [open, load]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  const name = profile?.displayName?.trim() || profile?.username?.trim() || "You";
  const handle = profile?.username?.trim() ? `@${profile.username.trim()}` : null;
  const role = profile?.profile?.roleLabel?.trim() || null;

  return (
    <div className="suite-rail-ops-head" data-testid="rail-identity">
      <div className="flex items-start gap-2.5 px-1">
        <button
          type="button"
          onClick={() => navigate("/")}
          className="shrink-0 rounded-2xl outline-none transition hover:opacity-90 focus-visible:ring-2 focus-visible:ring-white/25"
          aria-label="Workspace"
        >
          <CosmeticAvatarShell accent={cosmetics.accent} frame={cosmetics.frame}>
            <Avatar url={profile?.avatarUrl} name={name} id={profile?.id} size="sm" square />
          </CosmeticAvatarShell>
        </button>
        <div className="min-w-0 flex-1 pt-0.5">
          <div className="flex items-center gap-1">
            <p className="truncate font-display text-[13px] font-semibold tracking-tight text-white">
              {name}
            </p>
            <Flair data={cosmetics.flair} className="!px-1.5 !py-0 !text-[9px]" />
          </div>
          {handle ? (
            <p className="truncate font-mono text-[11px] text-white/40">{handle}</p>
          ) : null}
          {role ? (
            <p className="mt-0.5 truncate text-[10px] text-white/30">{role}</p>
          ) : null}
        </div>
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          aria-label={unread > 0 ? `${unread} notifications` : "Notifications"}
          aria-expanded={open}
          aria-haspopup="dialog"
          data-testid="rail-notify-button"
          className={cx(
            "relative mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-white/10 bg-white/[0.04] text-white/65 transition hover:border-white/20 hover:text-white active:scale-90",
            open && "border-white/25 bg-white/[0.08] text-white",
          )}
        >
          <Bell className="h-3.5 w-3.5" />
          {unread > 0 ? (
            <span className="absolute -right-0.5 -top-0.5 min-w-[1rem] rounded-full bg-[rgb(var(--app-accent-rgb))] px-1 text-center text-[9px] font-bold tabular-nums leading-4 text-black">
              {unread > 99 ? "99+" : unread}
            </span>
          ) : null}
        </button>
      </div>

      <AnimatePresence>
        {open ? (
          <OverlayPortal>
            <button
              type="button"
              aria-label="Close notifications"
              onClick={() => setOpen(false)}
              className="fixed inset-0 z-[90] cursor-default bg-transparent"
            />
            <motion.div
              role="dialog"
              aria-label="Notifications"
              data-testid="rail-notify-panel"
              initial={reduce ? { opacity: 0 } : { opacity: 0, y: -8, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={reduce ? { opacity: 0 } : { opacity: 0, y: -6, scale: 0.98 }}
              transition={{ type: "spring", stiffness: 380, damping: 30 }}
              className="forge-glass fixed left-3 top-16 z-[91] w-[min(18.5rem,calc(100vw-1.5rem))] overflow-hidden p-2 shadow-suite-lg lg:left-3 lg:top-[4.75rem]"
            >
              <span className="forge-glass-edge pointer-events-none" aria-hidden />
              <div className="relative z-[1] mb-1.5 flex items-center justify-between px-1.5 pt-1">
                <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-white/40">
                  Notifications
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
          </OverlayPortal>
        ) : null}
      </AnimatePresence>
    </div>
  );
}

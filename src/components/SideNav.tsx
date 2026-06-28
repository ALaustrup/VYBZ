import { Link, NavLink, useLocation } from "react-router-dom";
import { motion } from "framer-motion";
import {
  Bell,
  Layers,
  LifeBuoy,
  Radio,
  MessagesSquare,
  Plus,
  User,
  Users,
} from "lucide-react";
import { useApp } from "@/store/AppStore";
import { BrandLockup } from "@/components/Brand";
import { cx } from "@/lib/utils";

const NAV = [
  { to: "/", label: "Feeds", icon: Layers, end: true, match: ["/local", "/trending"] as string[] },
  { to: "/chat", label: "Chat", icon: MessagesSquare, end: false, match: ["/rooms", "/circles"] },
  { to: "/live", label: "Live", icon: Radio, end: false, match: [] },
  { to: "/profile", label: "You", icon: User, end: false, match: ["/you"] },
];

/**
 * Desktop / laptop left navigation rail. Full-height glass with the wordmark, a
 * prominent Confess action, vertical nav, activity, and a profile chip. Replaces
 * the mobile bottom dock on large displays.
 */
export function SideNav() {
  const { openCompose, openFeedback, unreadCount, account, ambientPresence, openConnectNow } =
    useApp();
  const { pathname } = useLocation();
  const alias = account?.alias ?? "";
  const around = ambientPresence?.online ?? 0;
  const lively = around > 0 || (ambientPresence?.live ?? 0) > 0;

  return (
    <aside className="glass z-40 flex h-full w-64 shrink-0 flex-col border-r border-white/10 px-3 py-5">
      <Link to="/" className="mb-5 px-3">
        <BrandLockup markClassName="h-7 w-7 text-veil-300" wordClassName="text-2xl" />
      </Link>

      <button
        onClick={openCompose}
        aria-label="New post"
        title="New post"
        className="mb-4 flex items-center justify-center rounded-2xl bg-veil-500 py-3 font-display text-sm font-semibold text-white shadow-glow transition active:scale-[0.98]"
      >
        <Plus className="h-5 w-5" />
      </button>

      <nav className="flex flex-col gap-1">
        {NAV.map(({ to, label, icon: Icon, end, match }) => {
          const active =
            (end ? pathname === to : pathname.startsWith(to)) ||
            match.some((m) => pathname.startsWith(m));
          return (
            <NavLink
              key={to}
              to={to}
              end={end}
              className={cx(
                "group relative flex items-center gap-3 rounded-xl px-3 py-2.5 text-[15px] font-semibold transition",
                active
                  ? "text-white"
                  : "text-white/55 hover:bg-black/20 hover:text-white/85"
              )}
            >
              {active && (
                <motion.span
                  layoutId="sidenav-active"
                  transition={{ type: "spring", stiffness: 400, damping: 32 }}
                  className="absolute inset-0 rounded-xl bg-veil-500/15 ring-1 ring-veil-400/40"
                />
              )}
              <Icon
                className={cx("relative h-5 w-5", active ? "text-veil-200" : "")}
                style={active ? { filter: "drop-shadow(0 0 8px rgba(168,124,248,0.7))" } : undefined}
              />
              <span className="relative">{label}</span>
            </NavLink>
          );
        })}

        <NavLink
          to="/notifications"
          className={cx(
            "group relative flex items-center gap-3 rounded-xl px-3 py-2.5 text-[15px] font-semibold transition",
            pathname === "/notifications" ? "text-white" : "text-white/55 hover:text-white/80"
          )}
        >
          <span className="relative">
            <Bell className="h-5 w-5" />
            {unreadCount > 0 && (
              <span className="absolute -right-1.5 -top-1.5 flex h-4 min-w-[16px] items-center justify-center rounded-full bg-wild px-1 text-[9px] font-bold text-white">
                {unreadCount > 9 ? "9+" : unreadCount}
              </span>
            )}
          </span>
          <span className="relative">Activity</span>
        </NavLink>

        <button
          onClick={openConnectNow}
          className="group relative flex items-center gap-3 rounded-xl px-3 py-2.5 text-[15px] font-semibold text-white/55 transition hover:bg-black/20 hover:text-white/85"
        >
          <span className="relative flex h-5 w-5 items-center justify-center">
            <Users className="h-5 w-5" />
            <span
              className={cx(
                "absolute -right-1 -top-1 h-2.5 w-2.5 rounded-full ring-2 ring-ink-950",
                lively ? "bg-emerald-400" : "bg-white/25"
              )}
            />
          </span>
          <span className="relative">
            {lively ? `${around} around` : "Find people"}
          </span>
        </button>

        <button
          onClick={openFeedback}
          className="group relative flex items-center gap-3 rounded-xl px-3 py-2.5 text-[15px] font-semibold text-white/55 transition hover:bg-black/20 hover:text-white/85"
        >
          <LifeBuoy className="h-5 w-5" />
          <span className="relative">Help &amp; support</span>
        </button>
      </nav>

      {/* Profile chip. */}
      <Link
        to="/profile"
        className="mt-auto flex items-center gap-3 rounded-2xl p-2.5 transition hover:bg-black/20"
      >
        <span className="flex h-10 w-10 items-center justify-center rounded-full bg-veil-500/20 font-display text-sm font-bold text-veil-100">
          {(account?.username || alias || "Y").charAt(0).toUpperCase()}
        </span>
        <div className="min-w-0">
          <p className="flex items-center gap-1.5 truncate text-sm font-semibold text-white/85">
            <span className="truncate">
              {account?.username ?? (account?.anonymous ? "Anonymous" : "You")}
            </span>
            <span
              className={cx(
                "shrink-0 rounded-full px-1.5 py-0.5 text-[9px] font-bold",
                account?.anonymous ? "bg-white/10 text-white/55" : "bg-feel/20 text-feel"
              )}
            >
              {account?.anonymous ? "GUEST" : "MEMBER"}
            </span>
          </p>
          <p className="text-[11px] text-white/45">
            {account?.anonymous ? "Tap to set up" : "View profile"}
          </p>
        </div>
      </Link>
    </aside>
  );
}

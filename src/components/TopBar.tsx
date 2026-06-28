import { Link, useLocation, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { Bell, LifeBuoy, Plus } from "lucide-react";
import { useApp } from "@/store/AppStore";
import { BrandLockup, BrandMark } from "@/components/Brand";
import { PresencePill } from "@/components/Presence";
import { cx } from "@/lib/utils";

const TITLES: Record<string, string> = {
  "/": "MYVYB",
  "/local": "Near you",
  "/rooms": "Rooms",
  "/trending": "Trending",
  "/profile": "You",
  "/notifications": "Activity",
};

/** Slim, glassy header — wordmark + the two essentials: compose and activity. */
export function TopBar() {
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const { unreadCount, openCompose, openFeedback } = useApp();
  const title = TITLES[pathname] ?? "MYVYB";
  const isHome = pathname === "/";
  const onNotifications = pathname === "/notifications";

  return (
    <header className="relative z-40 flex items-center justify-between px-5 pb-3 pt-5">
      {/* The brand stays anchored at the top on every screen. On inner pages we
          show a compact mark + the page title so context and identity coexist. */}
      {isHome ? (
        <BrandLockup markClassName="h-6 w-6 text-veil-300" wordClassName="text-2xl" />
      ) : (
        <div className="flex min-w-0 items-center gap-2.5">
          <Link to="/" aria-label="MYVYB home" className="shrink-0 active:scale-90">
            <BrandMark className="h-7 w-7 text-veil-300" />
          </Link>
          <span className="h-5 w-px shrink-0 bg-white/15" />
          <h1 className="truncate font-display text-lg font-semibold tracking-tightish text-white/90">
            {title}
          </h1>
        </div>
      )}

      <div className="flex items-center gap-2.5">
        <PresencePill />
        <button
          onClick={openFeedback}
          aria-label="Help & support"
          title="Help & support"
          className="flex h-10 w-10 items-center justify-center rounded-full bg-white/[0.04] text-white/75 transition active:scale-90"
        >
          <LifeBuoy className="h-5 w-5" />
        </button>

        <button
          onClick={openCompose}
          aria-label="Express"
          className="flex h-10 w-10 items-center justify-center rounded-full bg-veil-500 text-white shadow-glow transition active:scale-90"
        >
          <Plus className="h-5 w-5" />
        </button>

        <button
          onClick={() => navigate(onNotifications ? "/" : "/notifications")}
          aria-label={onNotifications ? "Close activity" : "Activity"}
          className={cx(
            "relative flex h-10 w-10 items-center justify-center rounded-full transition active:scale-90",
            onNotifications ? "bg-veil-500/25 ring-1 ring-veil-400/40" : "bg-white/[0.04]"
          )}
        >
          <Bell className="h-5 w-5 text-white/75" />
          {unreadCount > 0 && (
            <motion.span
              key={unreadCount}
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ type: "spring", stiffness: 500, damping: 20 }}
              className="absolute -right-0.5 -top-0.5 flex h-5 min-w-[20px] items-center justify-center rounded-full bg-wild px-1 text-[10px] font-bold text-white"
            >
              {unreadCount > 9 ? "9+" : unreadCount}
            </motion.span>
          )}
        </button>
      </div>
    </header>
  );
}

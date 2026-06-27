import { useLocation, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { Bell, Plus } from "lucide-react";
import { useApp } from "@/store/AppStore";
import { BrandLockup } from "@/components/Brand";
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
  const { unreadCount, openCompose } = useApp();
  const title = TITLES[pathname] ?? "MYVYB";
  const isHome = pathname === "/";
  const onNotifications = pathname === "/notifications";

  return (
    <header className="relative z-40 flex items-center justify-between px-5 pb-3 pt-5">
      {isHome ? (
        <BrandLockup markClassName="h-6 w-6 text-veil-300" wordClassName="text-2xl" />
      ) : (
        <h1 className="font-display text-lg font-semibold tracking-tightish text-white/90">
          {title}
        </h1>
      )}

      <div className="flex items-center gap-2.5">
        <button
          onClick={openCompose}
          aria-label="Confess"
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

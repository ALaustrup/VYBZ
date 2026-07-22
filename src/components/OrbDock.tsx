import { NavLink, useLocation } from "react-router-dom";
import { Bell } from "lucide-react";
import { useSession } from "@/store/session";
import { Avatar } from "@/components/Avatar";
import { cx } from "@/lib/utils";

/**
 * Top-right You control — avatar + unread activity bell.
 * Primary navigation lives on the universal bottom Taskbar.
 */
export function YouChip() {
  const { profile, unread } = useSession();
  const { pathname } = useLocation();
  const onYou = pathname.startsWith("/profile") || pathname.startsWith("/u/");

  return (
    <div className="pointer-events-none absolute right-3 top-[max(0.75rem,env(safe-area-inset-top))] z-40 flex items-center gap-1.5">
      {unread > 0 && pathname !== "/activity" && (
        <NavLink
          to="/activity"
          aria-label="Activity"
          className="pointer-events-auto relative flex h-9 w-9 items-center justify-center rounded-full glass active:scale-90 bell-alert"
        >
          <Bell className="h-4 w-4 text-white/75" />
          <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-[16px] items-center justify-center rounded-full bg-wild px-1 text-[9px] font-bold text-white">
            {unread > 9 ? "9+" : unread}
          </span>
        </NavLink>
      )}
      <NavLink
        to="/profile"
        aria-label="You"
        className={cx(
          "pointer-events-auto flex items-center rounded-full p-1 glass active:scale-95",
          onYou && "ring-1 ring-veil-400/45",
        )}
      >
        <Avatar
          url={profile?.avatarUrl}
          name={profile?.displayName || profile?.username}
          id={profile?.id}
          size="sm"
          className="!h-8 !w-8 text-xs"
        />
      </NavLink>
    </div>
  );
}

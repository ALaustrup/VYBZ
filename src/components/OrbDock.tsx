import { NavLink, useLocation } from "react-router-dom";
import { Bell } from "lucide-react";
import { useSession } from "@/store/session";
import { Avatar } from "@/components/Avatar";
import { formatVcAddress } from "@/lib/vc";
import { cx } from "@/lib/utils";

/**
 * You controls — avatar + unread activity bell → dashboard tabs (no hub hops).
 */
export function YouChip() {
  const { profile, unread } = useSession();
  const { pathname, search } = useLocation();
  const onHome = pathname === "/" || pathname === "";
  const tab = new URLSearchParams(search).get("tab");
  const onYou = onHome && (tab === "you" || !tab || tab === "match");

  return (
    <div className="flex items-center gap-1.5">
      {unread > 0 && !(onHome && tab === "live") && (
        <NavLink
          to="/?tab=live"
          aria-label="Live alerts"
          className="relative flex h-9 w-9 items-center justify-center rounded-full glass active:scale-90 bell-alert"
        >
          <Bell className="h-4 w-4 text-paper-900/70" />
          <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-[16px] items-center justify-center rounded-full bg-wild px-1 text-[9px] font-bold text-white" data-solid-accent="1">
            {unread > 9 ? "9+" : unread}
          </span>
        </NavLink>
      )}
      <NavLink
        to="/?tab=you"
        aria-label={formatVcAddress(profile?.username) || "You"}
        className={cx(
          "flex items-center rounded-full p-1 glass active:scale-95",
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

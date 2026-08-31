import { NavLink, useLocation } from "react-router-dom";
import { Avatar } from "@/components/Avatar";
import { useSession } from "@/store/session";
import { formatVcAddress } from "@/lib/vc";
import { cx } from "@/lib/utils";

/**
 * You controls — avatar goes home (My VYBZ). Alerts live in top chrome, not here.
 * Unmounted leftover; keep in the tree (hide, never delete).
 */
export function YouChip() {
  const { profile } = useSession();
  const { pathname } = useLocation();
  const onMe = pathname === "/" || pathname.startsWith("/u/");

  return (
    <div className="flex items-center gap-1.5">
      <NavLink
        to="/"
        aria-label={formatVcAddress(profile?.username) || "Me"}
        className={cx(
          "flex items-center rounded-full p-1 glass active:scale-95",
          onMe && "ring-1 ring-veil-400/45",
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

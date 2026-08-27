import { Link } from "react-router-dom";
import { ArrowRight } from "lucide-react";
import { Avatar } from "@/components/Avatar";
import { FeedPage } from "@/pages/FeedPage";
import { useSession } from "@/store/session";
import { ownerProfilePath } from "@/shell/navModel";

/**
 * Signed-in home — people-first social landing (D2).
 * Public Stage File stays at `/u/:id`; owner opens My VYBZ from here or the identity menu.
 */
export function SocialHomePage({ onCompose }: { onCompose: () => void }) {
  const { userId, profile } = useSession();
  const display = profile?.displayName?.trim() || profile?.username?.trim() || "You";
  const profilePath = ownerProfilePath(userId);

  return (
    <div className="flex h-full flex-col" data-testid="social-home">
      {userId ? (
        <div className="mx-auto mb-1 w-full max-w-2xl px-0.5 pt-1">
          <div className="forge-glass relative flex items-center gap-3 !rounded-xl px-3 py-2.5">
            <span className="forge-glass-edge pointer-events-none" aria-hidden />
            <Avatar
              url={profile?.avatarUrl}
              name={display}
              id={userId}
              size="md"
              className="relative z-[1] shrink-0"
            />
            <div className="relative z-[1] min-w-0 flex-1">
              <p className="truncate text-sm font-semibold text-white">{display}</p>
              <p className="truncate text-[12px] text-white/45">
                {profile?.username ? `@${profile.username}` : "Your identity"}
              </p>
            </div>
            <Link
              to={profilePath}
              className="relative z-[1] inline-flex shrink-0 items-center gap-1 rounded-full border border-white/12 bg-white/[0.06] px-3 py-1.5 text-[12px] font-semibold text-white/85 transition hover:bg-white/10"
              data-testid="social-home-my-vybz"
            >
              My VYBZ
              <ArrowRight className="h-3.5 w-3.5" aria-hidden />
            </Link>
          </div>
        </div>
      ) : null}
      <div className="flex min-h-0 flex-1 flex-col">
        <FeedPage onCompose={onCompose} variant="home" />
      </div>
    </div>
  );
}

import { Link, useNavigate } from "react-router-dom";
import { BrandMark } from "@/components/Brand";
import { HomeLibraryPanel } from "@/components/home/HomeLibraryPanel";
import { SocialRoomsPanel } from "@/components/home/SocialRoomsPanel";
import { WhosLivePanel } from "@/features/live/WhosLivePanel";
import { TastePeopleStrip } from "@/features/network/TastePeopleStrip";
import { FeedPage } from "@/pages/FeedPage";
import { formatVcAddress } from "@/lib/vc";
import { useSession } from "@/store/session";
import { ownerProfilePath } from "@/shell/navModel";

/**
 * Signed-in home — people-first social landing.
 * Centered VYBZ mark is identity; discovery panels reuse live, rooms, library, taste, hear.
 * Public Stage File stays at `/u/:id`.
 */
export function SocialHomePage({ onCompose }: { onCompose: () => void }) {
  const navigate = useNavigate();
  const { userId, profile } = useSession();
  const profilePath = ownerProfilePath(userId);
  const username = profile?.username?.trim() || "";
  const addr = formatVcAddress(profile?.username);

  return (
    <div className="flex h-full flex-col" data-testid="social-home">
      <div className="no-scrollbar flex-1 overflow-y-auto pb-6">
        <header className="flex flex-col items-center px-4 pb-8 pt-4 sm:pt-8">
          <button
            type="button"
            onClick={() => navigate(profilePath)}
            aria-label="My VYBZ"
            data-testid="home-brand-mark"
            className="overflow-visible bg-transparent p-0 active:scale-95"
          >
            <BrandMark orb reactive className="h-24 w-24 sm:h-[7.25rem] sm:w-[7.25rem]" />
          </button>
          <p className="mt-5 font-display text-[11px] font-semibold uppercase tracking-[0.42em] text-white/35">
            Find Yours.
          </p>
          {userId ? (
            <Link
              to={profilePath}
              className="mt-3 text-[12px] text-white/40 transition hover:text-white/70"
              data-testid="social-home-my-vybz"
            >
              {username ? `@${username}` : "My VYBZ"}
              {addr ? ` · ${addr}` : ""}
            </Link>
          ) : null}
        </header>

        <div
          className="mx-auto flex w-full max-w-2xl flex-col gap-6 px-1"
          data-testid="home-discovery"
        >
          <WhosLivePanel variant="shelf" />
          <SocialRoomsPanel />
          <HomeLibraryPanel onCompose={onCompose} />
          <TastePeopleStrip />
        </div>

        <div className="mt-4">
          <FeedPage onCompose={onCompose} variant="home" />
        </div>
      </div>
    </div>
  );
}

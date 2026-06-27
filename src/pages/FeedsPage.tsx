import { useLocation, useNavigate } from "react-router-dom";
import { Flame, Globe, MapPin } from "lucide-react";
import { FeedPage } from "@/pages/FeedPage";
import { LocalPage } from "@/pages/LocalPage";
import { TrendingPage } from "@/pages/TrendingPage";
import { haptic, cx } from "@/lib/utils";
import { playSound } from "@/lib/sound";

const TABS = [
  { id: "world", label: "World", icon: Globe, path: "/" },
  { id: "local", label: "Local", icon: MapPin, path: "/local" },
  { id: "trending", label: "Trending", icon: Flame, path: "/trending" },
] as const;

/**
 * Unified Feeds surface. One destination with a World / Local / Trending toolbar;
 * each tab is a deep-linkable route (/, /local, /trending) so the existing pages
 * keep working and can be shared directly. The personalized "For You" feed now
 * lives in the profile dashboard (Discover), not in this public toolbar.
 */
export function FeedsPage() {
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const active = pathname.startsWith("/local")
    ? "local"
    : pathname.startsWith("/trending")
      ? "trending"
      : "world";

  return (
    <div className="flex h-full flex-col">
      <div className="px-4 pt-2">
        <div className="glass flex items-center gap-1 rounded-2xl p-1">
          {TABS.map(({ id, label, icon: Icon, path }) => (
            <button
              key={id}
              onClick={() => {
                if (active === id) return;
                haptic(8);
                playSound("tap");
                navigate(path);
              }}
              className={cx(
                "flex flex-1 items-center justify-center gap-1.5 rounded-xl py-2 text-sm font-semibold transition active:scale-[0.98]",
                active === id ? "bg-veil-500 text-white shadow-glow" : "text-white/55 hover:text-white/80"
              )}
            >
              <Icon className="h-4 w-4" />
              {label}
            </button>
          ))}
        </div>
      </div>

      <div className="min-h-0 flex-1">
        {active === "world" ? (
          <FeedPage />
        ) : active === "local" ? (
          <LocalPage />
        ) : (
          <TrendingPage />
        )}
      </div>
    </div>
  );
}

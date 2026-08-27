import { NavLink, useLocation } from "react-router-dom";
import { Bell, Home, MessageSquare, Plus, Radio } from "lucide-react";
import { useInboxThreads } from "@/hooks/useInboxThreads";
import { cx } from "@/lib/utils";
import { useSession } from "@/store/session";

function StripLink({
  to,
  end,
  label,
  icon: Icon,
  badge = 0,
  forceActive,
}: {
  to: string;
  end?: boolean;
  label: string;
  icon: typeof Home;
  badge?: number;
  forceActive?: boolean;
}) {
  const { pathname } = useLocation();
  const active =
    forceActive ??
    (end ? pathname === to : pathname === to || pathname.startsWith(`${to}/`));

  return (
    <NavLink
      to={to}
      end={end}
      aria-label={label}
      title={label}
      data-testid={`vdock-social-${label.toLowerCase().replace(/\s+/g, "-")}`}
      className={cx(
        "relative flex h-9 min-w-0 flex-1 flex-col items-center justify-center rounded-xl px-1 transition",
        active ? "text-white" : "text-white/45 hover:text-white/80",
      )}
    >
      <Icon className="h-[18px] w-[18px]" strokeWidth={active ? 2.25 : 2} aria-hidden />
      {badge > 0 ? (
        <span
          className="absolute right-1 top-0.5 flex h-3.5 min-w-[14px] items-center justify-center rounded-full bg-wild px-0.5 text-[8px] font-bold text-white"
          aria-hidden
        >
          {badge > 9 ? "9+" : badge}
        </span>
      ) : null}
    </NavLink>
  );
}

/**
 * Compact social shortcuts above the music player — one dock, not a second player.
 */
export function VDockSocialStrip({ onCompose }: { onCompose?: () => void }) {
  const { unread } = useSession();
  const { pathname } = useLocation();
  const { threads } = useInboxThreads(50);
  const messageBadge = threads.reduce((n, t) => n + (t.unread ? 1 : 0), 0);
  const homeActive = pathname === "/";

  return (
    <div
      className="relative z-10 flex items-center gap-0.5 border-b border-white/[0.06] px-2 py-1 sm:px-4"
      data-testid="vdock-social-strip"
      aria-label="Social shortcuts"
    >
      <StripLink to="/" end label="Home" icon={Home} forceActive={homeActive} />
      <StripLink to="/live" label="Live" icon={Radio} />
      <button
        type="button"
        aria-label="Add"
        data-testid="vdock-social-compose"
        onClick={() => onCompose?.()}
        className="flex h-9 min-w-[2.25rem] flex-col items-center justify-center rounded-xl text-white/70 transition hover:text-white active:scale-95"
      >
        <Plus className="h-[19px] w-[19px]" strokeWidth={2.25} aria-hidden />
      </button>
      <StripLink to="/messages" label="Messages" icon={MessageSquare} badge={messageBadge} />
      <StripLink to="/notifications" label="Alerts" icon={Bell} badge={unread} />
    </div>
  );
}

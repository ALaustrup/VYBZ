import { Link } from "react-router-dom";
import { Bell, MessageSquare, Radio } from "lucide-react";
import { useInboxThreads } from "@/hooks/useInboxThreads";
import { useSession } from "@/store/session";
import type { StageNight } from "./stageNights";

type PulseItem = {
  id: string;
  label: string;
  to: string;
  icon: typeof MessageSquare;
};

/**
 * Owner-only ambient attention on the living Profile.
 * Surfaces what needs attention without a dashboard panel.
 */
export function ProfileOwnerPulse({ liveNow }: { liveNow: StageNight | null }) {
  const { unread } = useSession();
  const { threads } = useInboxThreads(50);
  const messageUnread = threads.reduce((n, t) => n + (t.unread ? 1 : 0), 0);

  const items: PulseItem[] = [];
  if (messageUnread > 0) {
    items.push({
      id: "messages",
      label: messageUnread === 1 ? "1 unread message" : `${messageUnread} unread messages`,
      to: "/messages",
      icon: MessageSquare,
    });
  }
  if (unread > 0) {
    items.push({
      id: "alerts",
      label: unread === 1 ? "1 alert" : `${unread} alerts`,
      to: "/notifications",
      icon: Bell,
    });
  }
  if (liveNow) {
    items.push({
      id: "live",
      label: "You are live",
      to: `/live/${liveNow.id}`,
      icon: Radio,
    });
  }

  if (items.length === 0) return null;

  return (
    <nav
      aria-label="Needs your attention"
      data-testid="profile-owner-pulse"
      className="border-b border-white/[0.06] bg-white/[0.02] px-4 py-2 sm:px-8"
    >
      <ul className="flex flex-wrap items-center gap-2">
        {items.map((item) => {
          const Icon = item.icon;
          return (
            <li key={item.id}>
              <Link
                to={item.to}
                className="inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-white/[0.04] px-3 py-1.5 text-[12px] font-medium text-white/80 transition hover:border-cyan-200/25 hover:bg-cyan-950/30 hover:text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-cyan-300/70"
              >
                <Icon className="h-3.5 w-3.5 shrink-0" aria-hidden />
                <span>{item.label}</span>
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}

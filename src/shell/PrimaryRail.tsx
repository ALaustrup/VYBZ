import { useState } from "react";
import { NavLink } from "react-router-dom";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { ChevronDown } from "lucide-react";
import { PRODUCT_ACCENT_RGB } from "@/design/tokens";
import { HOME_ITEM, accountItems, navGroups, type NavGroup, type NavItem } from "@/shell/navModel";
import { RailIdentity } from "@/shell/RailIdentity";
import { durationFast, durationNormal } from "@/lib/motion";
import { cx } from "@/lib/utils";
import { useInboxThreads } from "@/hooks/useInboxThreads";
import { useSession } from "@/store/session";

/** Live counters the rail can badge. Zero renders nothing — never a "0" pip. */
function useNavBadgeCounts(): Record<NonNullable<NavItem["badge"]>, number> {
  const { unread } = useSession();
  const { threads } = useInboxThreads(50);
  return {
    notifications: unread,
    messages: threads.reduce((n, t) => n + (t.unread ? 1 : 0), 0),
  };
}

function RailBadge({ count }: { count: number }) {
  if (count <= 0) return null;
  return (
    <span
      className="ml-auto min-w-[1.15rem] shrink-0 rounded-full bg-[rgb(var(--app-accent-rgb))] px-1.5 py-px text-center text-[10px] font-bold tabular-nums text-black"
      data-testid="rail-badge"
      aria-label={`${count} unread`}
    >
      {count > 99 ? "99+" : count}
    </span>
  );
}

function RailLink({ item, end, badgeCount = 0 }: { item: NavItem; end?: boolean; badgeCount?: number }) {
  const accent = PRODUCT_ACCENT_RGB[item.productId];
  const reduce = useReducedMotion();
  const Icon = item.icon;
  return (
    <NavLink
      to={item.path}
      end={end}
      title={item.hint}
      className={({ isActive }) =>
        cx(
          "group relative flex items-center gap-2.5 rounded-lg px-2.5 py-2 text-[13px] font-medium transition",
          "motion-reduce:transition-none",
          isActive
            ? "bg-white/[0.08] text-white"
            : "text-white/50 hover:bg-white/[0.04] hover:text-white/85",
        )
      }
    >
      {({ isActive }) => (
        <>
          <motion.span
            className="absolute left-0 top-1/2 h-4 w-0.5 -translate-y-1/2 rounded-full"
            style={{ background: `rgb(${accent})` }}
            aria-hidden
            initial={false}
            animate={{ opacity: isActive ? 1 : 0, scaleY: isActive ? 1 : 0.5 }}
            transition={reduce ? { duration: 0.01 } : { duration: durationFast, ease: "easeOut" }}
          />
          <Icon className="h-4 w-4 shrink-0 opacity-80" strokeWidth={1.75} aria-hidden />
          <span className="truncate">{item.label}</span>
          <RailBadge count={badgeCount} />
        </>
      )}
    </NavLink>
  );
}

function RailGroup({
  group,
  defaultOpen,
  badges,
}: {
  group: NavGroup;
  defaultOpen?: boolean;
  badges?: Record<string, number>;
}) {
  const [open, setOpen] = useState(!!defaultOpen);
  const reduce = useReducedMotion();

  return (
    <div className="px-1">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        className="flex w-full items-center gap-1 rounded-md px-2 py-1.5 text-[10px] font-semibold uppercase tracking-[0.16em] text-white/35 transition hover:text-white/55"
      >
        <span className="flex-1 text-left">{group.label}</span>
        <motion.span
          animate={{ rotate: open ? 0 : -90 }}
          transition={reduce ? { duration: 0.01 } : { duration: durationFast }}
          className="inline-flex"
        >
          <ChevronDown className="h-3.5 w-3.5" aria-hidden />
        </motion.span>
      </button>
      <AnimatePresence initial={false}>
        {open ? (
          <motion.div
            key={group.id}
            initial={reduce ? false : { height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={reduce ? undefined : { height: 0, opacity: 0 }}
            transition={
              reduce
                ? { duration: 0.01 }
                : { duration: durationNormal, ease: [0.2, 0.8, 0.2, 1] }
            }
            className="overflow-hidden"
            style={{ clipPath: "inset(0 0 0 0)" }}
          >
            <div className="flex flex-col gap-0.5 pb-2 pt-0.5">
              {group.items.map((item) => (
                <RailLink
                  key={item.path}
                  item={item}
                  badgeCount={item.badge ? (badges?.[item.badge] ?? 0) : 0}
                />
              ))}
            </div>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </div>
  );
}

/**
 * Left suite rail — driven exclusively by `navModel` (never `suiteNavRoutes`).
 */
export function PrimaryRail() {
  const { profile } = useSession();
  const account = accountItems(profile?.platformRole ?? "member", !!profile?.isAdmin);
  const groups = navGroups();
  const badges = useNavBadgeCounts();

  return (
    <aside
      className="suite-rail suite-rail--ops forge-glass !rounded-none !border-y-0 !border-l-0"
      aria-label="Suite navigation"
      data-testid="suite-primary-rail"
    >
      <div className="relative z-[2] flex min-h-0 flex-1 flex-col">
        <RailIdentity />
        <div className="px-1 pb-1 pt-2">
          <RailLink item={HOME_ITEM} end />
        </div>
        <nav className="flex min-h-0 flex-1 flex-col gap-1 overflow-y-auto py-2">
          {groups.map((g, i) => (
            <RailGroup key={g.id} group={g} defaultOpen={i < 2} badges={badges} />
          ))}
          {account.length > 0 ? (
            <RailGroup
              group={{ id: "more", label: "More", items: account }}
              defaultOpen={false}
            />
          ) : null}
        </nav>
      </div>
    </aside>
  );
}

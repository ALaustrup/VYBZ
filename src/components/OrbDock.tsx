import { useEffect, useRef, useState } from "react";
import { NavLink, useLocation, useNavigate } from "react-router-dom";
import { AnimatePresence, motion } from "framer-motion";
import {
  AudioLines,
  Bell,
  FolderGit2,
  MessageSquare,
  Plus,
  Radio,
  Search,
  Shield,
  ShieldCheck,
  Sparkles,
  Users,
} from "lucide-react";
import { useSession } from "@/store/session";
import { Avatar } from "@/components/Avatar";
import { BrandLockup, BrandMark } from "@/components/Brand";
import { AppMode, MODE_HOME, modeForPath } from "@/lib/surfaceTheme";
import { cx } from "@/lib/utils";

type OrbAction = {
  id: string;
  label: string;
  icon: typeof Plus;
  run: () => void;
};

/** Mobile Orb Dock — Find | Orb | Make, with You as the top-right avatar. */
export function OrbDock({ onCompose }: { onCompose: () => void }) {
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const mode = modeForPath(pathname);
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    const onPointer = (e: PointerEvent) => {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false);
    };
    window.addEventListener("keydown", onKey);
    window.addEventListener("pointerdown", onPointer);
    return () => {
      window.removeEventListener("keydown", onKey);
      window.removeEventListener("pointerdown", onPointer);
    };
  }, [open]);

  const actions: OrbAction[] = [
    { id: "drop", label: "New drop", icon: Plus, run: () => { setOpen(false); onCompose(); } },
    { id: "live", label: "Go live", icon: Radio, run: () => { setOpen(false); navigate("/live?go=1"); } },
    { id: "spark", label: "Spark", icon: Sparkles, run: () => { setOpen(false); navigate("/spark"); } },
    { id: "messages", label: "Messages", icon: MessageSquare, run: () => { setOpen(false); navigate("/messages"); } },
  ];

  function goMode(next: AppMode) {
    setOpen(false);
    if (mode !== next) {
      navigate(MODE_HOME[next]);
      return;
    }
    // Already in this mode — cycle its key destinations (keeps the dock to 3 anchors).
    if (next === "make") {
      if (pathname.startsWith("/live")) navigate("/");
      else if (pathname.startsWith("/projects")) navigate("/live");
      else navigate("/projects");
      return;
    }
    if (next === "find") {
      if (pathname.startsWith("/spark")) navigate("/opportunities");
      else if (pathname.startsWith("/opportunities")) navigate("/discover");
      else if (pathname.startsWith("/discover")) navigate("/connect");
      else navigate("/spark");
      return;
    }
    if (pathname.startsWith("/messages") || pathname.startsWith("/rooms")) navigate("/activity");
    else if (pathname.startsWith("/activity")) navigate("/profile");
    else navigate("/messages");
  }

  // Radial positions: upper arc so actions sit above the dock.
  const slots = [
    { x: -72, y: -58 },
    { x: -28, y: -88 },
    { x: 28, y: -88 },
    { x: 72, y: -58 },
  ];

  return (
    <div ref={rootRef} className="relative z-40 px-4 pb-[max(0.75rem,env(safe-area-inset-bottom))] pt-2">
      <AnimatePresence>
        {open && (
          <motion.div
            key="orb-scrim"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.18 }}
            className="pointer-events-none absolute inset-x-0 bottom-full mb-2 h-40"
            aria-hidden
          />
        )}
      </AnimatePresence>

      <div className="glass relative mx-auto flex h-[72px] max-w-md items-center justify-between rounded-[28px] px-3">
        <ModeChip
          label="Find"
          icon={Users}
          active={mode === "find"}
          onClick={() => goMode("find")}
        />

        <div className="relative flex h-full w-[88px] items-center justify-center">
          <AnimatePresence>
            {open &&
              actions.map((action, i) => {
                const Icon = action.icon;
                const slot = slots[i]!;
                return (
                  <motion.button
                    key={action.id}
                    type="button"
                    initial={{ opacity: 0, x: 0, y: 12, scale: 0.6 }}
                    animate={{ opacity: 1, x: slot.x, y: slot.y, scale: 1 }}
                    exit={{ opacity: 0, x: 0, y: 8, scale: 0.6 }}
                    transition={{ type: "spring", stiffness: 420, damping: 28, delay: i * 0.03 }}
                    onClick={action.run}
                    className="absolute z-20 flex flex-col items-center gap-1"
                    aria-label={action.label}
                  >
                    <span className="grid h-11 w-11 place-items-center rounded-full border border-white/10 bg-ink-900/90 text-white shadow-[0_12px_28px_-16px_rgba(0,0,0,0.9)] ring-1 ring-veil-400/25 backdrop-blur-xl">
                      <Icon className="h-4 w-4 text-white/90" />
                    </span>
                    <span className="text-[10px] font-medium text-white/55">{action.label}</span>
                  </motion.button>
                );
              })}
          </AnimatePresence>

          <button
            type="button"
            aria-label={open ? "Close actions" : "Open actions"}
            aria-expanded={open}
            onClick={() => setOpen((v) => !v)}
            className="group relative grid h-[58px] w-[58px] place-items-center"
          >
            <span
              className={cx(
                "absolute inset-0 rounded-full bg-gradient-to-br from-veil-500/35 to-wild/20 blur-xl transition",
                open ? "opacity-90" : "opacity-40 group-hover:opacity-70",
              )}
            />
            <span
              className={cx(
                "relative grid h-[52px] w-[52px] place-items-center rounded-full bg-gradient-to-br from-veil-500/30 to-wild/20 ring-1 transition",
                open ? "ring-veil-300/70 scale-95" : "ring-white/15 group-hover:ring-veil-400/55 group-active:scale-95",
              )}
            >
              <motion.span
                animate={{ rotate: open ? 45 : 0 }}
                transition={{ type: "spring", stiffness: 380, damping: 24 }}
              >
                <Plus className="h-6 w-6 text-white/90" />
              </motion.span>
            </span>
          </button>
        </div>

        <ModeChip
          label="Make"
          icon={AudioLines}
          active={mode === "make"}
          onClick={() => goMode("make")}
        />
      </div>
    </div>
  );
}

function ModeChip({
  label,
  icon: Icon,
  active,
  onClick,
}: {
  label: string;
  icon: typeof Users;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="relative flex w-[88px] flex-col items-center gap-1 rounded-2xl py-2"
      aria-current={active ? "page" : undefined}
    >
      {active && (
        <motion.span
          layoutId="orb-mode-active"
          transition={{ type: "spring", stiffness: 400, damping: 32 }}
          className="absolute inset-0 rounded-2xl bg-veil-500/12 ring-1 ring-veil-400/35"
        />
      )}
      <Icon className={cx("relative z-10 h-5 w-5", active ? "text-veil-200 nav-icon-active" : "text-white/45")} />
      <span className={cx("relative z-10 text-[11px] font-semibold", active ? "text-white/90" : "text-white/45")}>
        {label}
      </span>
    </button>
  );
}

/** Top-right You control — avatar; activity bell when there is unread. */
export function YouChip() {
  const { profile, unread } = useSession();
  const { pathname } = useLocation();
  const onYou = modeForPath(pathname) === "you";

  return (
    <div className="absolute right-3 top-[max(0.75rem,env(safe-area-inset-top))] z-40 flex items-center gap-1.5">
      {unread > 0 && pathname !== "/activity" && (
        <NavLink
          to="/activity"
          aria-label="Activity"
          className="relative flex h-9 w-9 items-center justify-center rounded-full glass active:scale-90 bell-alert"
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

/** Desktop rail — thin modes + orb compose, secondary destinations under You. */
export function OrbSideRail({ onCompose }: { onCompose: () => void }) {
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const { unread, profile } = useSession();
  const mode = modeForPath(pathname);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  type RailLink = { to: string; label: string; icon: typeof Users; end?: boolean; badge?: number };
  const findLinks: RailLink[] = [
    { to: "/connect", label: "Connect", icon: Users },
    { to: "/spark", label: "Spark", icon: Sparkles },
    { to: "/discover", label: "Discover", icon: Search },
    { to: "/opportunities", label: "Board", icon: FolderGit2 },
  ];
  const makeLinks: RailLink[] = [
    { to: "/", label: "Drops", icon: AudioLines, end: true },
    { to: "/projects", label: "Collabs", icon: FolderGit2 },
    { to: "/live", label: "Live", icon: Radio },
  ];
  const youLinks: RailLink[] = [
    { to: "/profile", label: "Profile", icon: Users },
    { to: "/messages", label: "Messages", icon: MessageSquare },
    { to: "/activity", label: "Activity", icon: Bell, badge: unread },
  ];

  const links = mode === "find" ? findLinks : mode === "make" ? makeLinks : youLinks;

  return (
    <aside className="glass z-40 flex h-full w-[4.75rem] shrink-0 flex-col items-center border-r border-white/10 py-5 xl:w-56 xl:items-stretch xl:px-3">
      <div className="mb-5 flex justify-center px-1 xl:justify-start xl:px-3">
        <BrandLockup height="h-7" className="hidden xl:block" />
        <BrandMark className="h-7 w-7 xl:hidden" reactive />
      </div>

      <div className="mb-4 flex flex-col items-center gap-2 xl:px-1">
        <button
          type="button"
          aria-label={open ? "Close actions" : "Open actions"}
          aria-expanded={open}
          onClick={() => setOpen((v) => !v)}
          className="group relative grid h-14 w-14 place-items-center"
        >
          <span className="absolute inset-0 rounded-full bg-gradient-to-br from-veil-500/30 to-wild/20 opacity-50 blur-lg transition group-hover:opacity-80" />
          <span className="relative grid h-12 w-12 place-items-center rounded-full bg-gradient-to-br from-veil-500/28 to-wild/18 ring-1 ring-white/15 transition group-hover:ring-veil-400/55">
            <motion.span animate={{ rotate: open ? 45 : 0 }} transition={{ type: "spring", stiffness: 380, damping: 24 }}>
              <Plus className="h-5 w-5 text-white/90" />
            </motion.span>
          </span>
        </button>
        <AnimatePresence>
          {open && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              className="flex w-full flex-col gap-1 overflow-hidden"
            >
              <RailAction label="New drop" onClick={() => { setOpen(false); onCompose(); }} />
              <RailAction label="Go live" onClick={() => { setOpen(false); navigate("/live?go=1"); }} />
              <RailAction label="Spark" onClick={() => { setOpen(false); navigate("/spark"); }} />
              <RailAction label="Messages" onClick={() => { setOpen(false); navigate("/messages"); }} />
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <div className="mb-3 flex flex-col gap-1 xl:px-0">
        {(["find", "make", "you"] as AppMode[]).map((m) => (
          <button
            key={m}
            type="button"
            onClick={() => navigate(MODE_HOME[m])}
            className={cx(
              "relative flex items-center justify-center gap-3 rounded-xl px-2 py-2.5 text-[13px] font-semibold capitalize xl:justify-start xl:px-3",
              mode === m ? "text-white" : "text-white/50 hover:bg-white/[0.04] hover:text-white/85",
            )}
          >
            {mode === m && (
              <motion.span
                layoutId="side-mode-active"
                className="absolute inset-0 rounded-xl bg-veil-500/14 ring-1 ring-veil-400/35"
                transition={{ type: "spring", stiffness: 400, damping: 32 }}
              />
            )}
            <span className="relative z-10 xl:hidden">{m === "find" ? <Users className="h-5 w-5" /> : m === "make" ? <AudioLines className="h-5 w-5" /> : <Avatar url={profile?.avatarUrl} name={profile?.displayName || profile?.username} id={profile?.id} size="sm" className="!h-6 !w-6 text-[10px]" />}</span>
            <span className="relative z-10 hidden xl:inline">{m}</span>
          </button>
        ))}
      </div>

      <nav className="flex min-h-0 flex-1 flex-col gap-0.5 overflow-y-auto no-scrollbar xl:mt-1">
        {links.map(({ to, label, icon: Icon, end, badge }) => {
          const active = end ? pathname === to : pathname.startsWith(to) || (to === "/profile" && pathname.startsWith("/u/"));
          return (
            <NavLink
              key={to}
              to={to}
              end={!!end}
              className={cx(
                "relative flex items-center justify-center gap-3 rounded-xl px-2 py-2 text-[13px] font-medium xl:justify-start xl:px-3",
                active ? "text-white" : "text-white/45 hover:bg-white/[0.04] hover:text-white/80",
              )}
            >
              <span className="relative z-10">
                <Icon className={cx("h-4 w-4", active && "text-veil-200")} />
                {badge ? (
                  <span className="absolute -right-1.5 -top-1.5 flex h-3.5 min-w-[14px] items-center justify-center rounded-full bg-wild px-0.5 text-[8px] font-bold text-white">
                    {badge > 9 ? "9+" : badge}
                  </span>
                ) : null}
              </span>
              <span className="relative z-10 hidden xl:inline">{label}</span>
            </NavLink>
          );
        })}
        {profile && (profile.platformRole === "moderator" || profile.platformRole === "admin" || profile.isAdmin) && mode === "you" && (
          <NavLink to="/mod" className="relative flex items-center justify-center gap-3 rounded-xl px-2 py-2 text-[13px] font-medium text-white/45 hover:bg-white/[0.04] hover:text-white/80 xl:justify-start xl:px-3">
            <Shield className="h-4 w-4" /><span className="hidden xl:inline">Moderate</span>
          </NavLink>
        )}
        {profile?.isAdmin && mode === "you" && (
          <NavLink to="/admin" className="relative flex items-center justify-center gap-3 rounded-xl px-2 py-2 text-[13px] font-medium text-white/45 hover:bg-white/[0.04] hover:text-white/80 xl:justify-start xl:px-3">
            <ShieldCheck className="h-4 w-4" /><span className="hidden xl:inline">Admin</span>
          </NavLink>
        )}
      </nav>
    </aside>
  );
}

function RailAction({ label, onClick }: { label: string; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="rounded-lg px-2 py-1.5 text-center text-[11px] font-medium text-white/60 hover:bg-white/[0.05] hover:text-white xl:text-left"
    >
      {label}
    </button>
  );
}

import { useState } from "react";
import { Routes, Route, Navigate, NavLink, useLocation } from "react-router-dom";
import { Loader2, AudioLines, Users, MessageSquare, User, Plus, Search, Bell, FolderGit2 } from "lucide-react";
import { useSession } from "@/store/session";
import { useMediaQuery } from "@/lib/useMediaQuery";
import { DynamicBackground } from "@/components/DynamicBackground";
import { Onboarding, UsernameSetup } from "@/components/Onboarding";
import { ComposeSheet } from "@/components/ComposeSheet";
import { GlobalPlayer } from "@/components/GlobalPlayer";
import { Toast } from "@/components/Toast";
import { Confetti } from "@/components/Confetti";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { BrandLockup } from "@/components/Brand";
import { FeedPage } from "@/pages/FeedPage";
import { ConnectPage } from "@/pages/ConnectPage";
import { SparkPage } from "@/pages/SparkPage";
import { OpportunitiesPage } from "@/pages/OpportunitiesPage";
import { ProfilePage } from "@/pages/ProfilePage";
import { ProfileEditPage } from "@/pages/ProfileEditPage";
import { UserProfilePage } from "@/pages/UserProfilePage";
import { MessagesPage } from "@/pages/MessagesPage";
import { DiscoverPage } from "@/pages/DiscoverPage";
import { NotificationsPage } from "@/pages/NotificationsPage";
import { ProjectsPage } from "@/pages/ProjectsPage";
import { ProjectRoomPage } from "@/pages/ProjectRoomPage";
import { cx } from "@/lib/utils";

const NAV = [
  { to: "/", label: "Drops", icon: AudioLines, end: true },
  { to: "/discover", label: "Discover", icon: Search },
  { to: "/connect", label: "Connect", icon: Users, match: ["/spark", "/opportunities"] },
  { to: "/projects", label: "Studio", icon: FolderGit2 },
  { to: "/messages", label: "Messages", icon: MessageSquare },
  { to: "/profile", label: "You", icon: User, match: ["/u/"] },
];

export function App() {
  const { ready, userId, profile, backendEnabled } = useSession();
  const [feedKey, setFeedKey] = useState(0);
  const [composeOpen, setComposeOpen] = useState(false);
  const desktop = useMediaQuery("(min-width: 1024px)");
  const location = useLocation();

  if (!backendEnabled) {
    return <div className="flex min-h-[100dvh] items-center justify-center px-8 text-center text-white/60">VYBZ backend not configured. Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY.</div>;
  }
  if (!ready) return <><DynamicBackground variant="default" /><div className="flex min-h-[100dvh] items-center justify-center"><Loader2 className="h-6 w-6 animate-spin text-veil-300" /></div></>;
  if (!userId) return <><DynamicBackground variant="default" /><Onboarding /></>;
  if (!profile?.username) return <><DynamicBackground variant="default" /><UsernameSetup /></>;

  const routes = (
    <ErrorBoundary key={location.pathname}>
      <Routes location={location}>
        <Route path="/" element={<FeedPage key={feedKey} onCompose={() => setComposeOpen(true)} />} />
        <Route path="/discover" element={<DiscoverPage />} />
        <Route path="/activity" element={<NotificationsPage />} />
        <Route path="/connect" element={<ConnectPage />} />
        <Route path="/spark" element={<SparkPage />} />
        <Route path="/opportunities" element={<OpportunitiesPage />} />
        <Route path="/projects" element={<ProjectsPage />} />
        <Route path="/projects/:id" element={<ProjectRoomPage />} />
        <Route path="/messages" element={<MessagesPage />} />
        <Route path="/messages/:id" element={<MessagesPage />} />
        <Route path="/profile" element={<ProfilePage />} />
        <Route path="/profile/edit" element={<ProfileEditPage />} />
        <Route path="/u/:id" element={<UserProfilePage />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </ErrorBoundary>
  );

  const overlays = (
    <>
      <ComposeSheet open={composeOpen} onClose={() => setComposeOpen(false)} onPosted={() => setFeedKey((k) => k + 1)} />
      <Toast /><Confetti />
    </>
  );

  if (desktop) {
    return (
      <>
        <DynamicBackground variant="default" />
        <div className="pointer-events-none fixed inset-0 -z-10 bg-ink-950/60" />
        <div className="flex h-[100dvh] w-full overflow-hidden">
          <aside className="glass z-40 flex h-full w-60 shrink-0 flex-col border-r border-white/10 px-3 py-5">
            <div className="mb-5 px-3"><BrandLockup markClassName="h-7 w-7 text-veil-300" wordClassName="text-2xl" /></div>
            <button onClick={() => setComposeOpen(true)} className="mb-4 flex items-center justify-center gap-2 rounded-2xl bg-veil-500 py-3 font-display text-sm font-semibold text-white shadow-glow active:scale-[0.98]"><Plus className="h-5 w-5" /> New drop</button>
            <SideNav />
          </aside>
          <main className="relative flex min-w-0 flex-1 flex-col overflow-hidden">
            <div className="mx-auto min-h-0 w-full max-w-2xl flex-1 overflow-hidden px-6">{routes}</div>
            <GlobalPlayer className="relative z-10 pb-3" />
          </main>
        </div>
        {overlays}
      </>
    );
  }

  return (
    <>
      <DynamicBackground variant="default" />
      <div className="relative mx-auto flex h-[100dvh] max-w-md flex-col overflow-hidden bg-ink-950/70 backdrop-blur-2xl">
        <MobileBell />
        <main className="relative z-10 flex-1 overflow-hidden">{routes}</main>
        <GlobalPlayer />
        <BottomNav />
      </div>
      {overlays}
    </>
  );
}

function SideNav() {
  const { pathname } = useLocation();
  const { unread } = useSession();
  const item = (to: string, label: string, Icon: typeof Bell, active: boolean, badge?: number) => (
    <NavLink key={to} to={to} className={cx("relative flex items-center gap-3 rounded-xl px-3 py-2.5 text-[15px] font-semibold transition", active ? "bg-veil-500/15 text-white ring-1 ring-veil-400/40" : "text-white/55 hover:bg-black/20 hover:text-white/85")}>
      <span className="relative"><Icon className="h-5 w-5" />{badge ? <span className="absolute -right-1.5 -top-1.5 flex h-4 min-w-[16px] items-center justify-center rounded-full bg-wild px-1 text-[9px] font-bold text-white">{badge > 9 ? "9+" : badge}</span> : null}</span> {label}
    </NavLink>
  );
  return (
    <nav className="flex flex-col gap-1">
      {NAV.map(({ to, label, icon: Icon, end, match }) => {
        const active = (end ? pathname === to : pathname.startsWith(to)) || (match ?? []).some((m) => pathname.startsWith(m));
        return item(to, label, Icon, active);
      })}
      {item("/activity", "Activity", Bell, pathname === "/activity", unread)}
    </nav>
  );
}

function MobileBell() {
  const { unread } = useSession();
  const { pathname } = useLocation();
  if (pathname === "/activity") return null;
  return (
    <NavLink to="/activity" aria-label="Activity"
      className="absolute right-3 top-3 z-40 flex h-9 w-9 items-center justify-center rounded-full glass active:scale-90">
      <Bell className="h-4 w-4 text-white/75" />
      {unread > 0 && <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-[16px] items-center justify-center rounded-full bg-wild px-1 text-[9px] font-bold text-white">{unread > 9 ? "9+" : unread}</span>}
    </NavLink>
  );
}

function BottomNav() {
  const { pathname } = useLocation();
  return (
    <nav className="relative z-40 px-4 pb-[max(0.75rem,env(safe-area-inset-bottom))] pt-2">
      <div className="glass mx-auto flex h-[60px] max-w-md items-center justify-around rounded-2xl border border-white/10 px-2">
        {NAV.map(({ to, label, icon: Icon, end, match }) => {
          const active = (end ? pathname === to : pathname.startsWith(to)) || (match ?? []).some((m) => pathname.startsWith(m));
          return (
            <NavLink key={to} to={to} aria-label={label} className="flex flex-1 flex-col items-center gap-1">
              <Icon className={cx("h-5 w-5 transition", active ? "text-veil-200" : "text-white/45")} style={active ? { filter: "drop-shadow(0 0 8px rgb(var(--accent-rgb)/0.7))" } : undefined} />
              <span className={cx("text-[10px] font-semibold", active ? "text-white/90" : "text-white/45")}>{label}</span>
            </NavLink>
          );
        })}
      </div>
    </nav>
  );
}
